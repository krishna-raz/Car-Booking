const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const { protect, admin } = require('../middleware/authMiddleware');

// @route   POST /api/rides
// @desc    Create a ride request
// @access  Private (User)
router.post('/', protect, async (req, res) => {
    const { pickupLocation, dropLocation, fare } = req.body;

    if (req.user.role !== 'user') {
        return res.status(403).json({ message: 'Only users can book rides' });
    }

    try {
        const ride = await Ride.create({
            user: req.user._id,
            pickupLocation,
            dropLocation,
            fare,
            status: 'pending'
        });

        res.status(201).json(ride);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @route   GET /api/rides/nearby
// @desc    Get assigned rides (For Drivers)
// @access  Private (Driver)
router.get('/pending', protect, async (req, res) => {
    if (req.user.role !== 'driver') {
        return res.status(403).json({ message: 'Only drivers can view pending rides' });
    }

    try {
        // Driver sees rides ASSIGNED to them
        const rides = await Ride.find({ driver: req.user._id, status: 'assigned' }).populate('user', 'name phone');
        res.json(rides);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @route   PUT /api/rides/:id/accept
// @desc    Accept a ride
// @access  Private (Driver)
router.put('/:id/accept', protect, async (req, res) => {
     if (req.user.role !== 'driver') {
        return res.status(403).json({ message: 'Only drivers can accept rides' });
    }

    try {
        const ride = await Ride.findById(req.params.id);

        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        if (ride.status !== 'assigned') {
            return res.status(400).json({ message: 'Ride not available for acceptance' });
        }

        if (ride.driver.toString() !== req.user._id.toString()) {
             return res.status(403).json({ message: 'This ride is not assigned to you' });
        }

        ride.status = 'accepted';
        
        await ride.save();
        
        const updatedRide = await Ride.findById(req.params.id)
            .populate('user', 'name phone')
            .populate('driver', 'name phone vehicle');

        res.json(updatedRide);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @route   PUT /api/rides/:id/status
// @desc    Update ride status (assigned, accepted, ongoing, completed, cancelled)
// @access  Private (Driver or Admin)
router.put('/:id/status', protect, async (req, res) => {
    const { status } = req.body;
    
    // Allow both drivers and admins
    if (req.user.role !== 'driver' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only drivers or admins can update status' });
    }

    try {
        const ride = await Ride.findById(req.params.id);

        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        // Drivers can only update their own rides
        if (req.user.role === 'driver' && ride.driver && ride.driver.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this ride' });
        }

        ride.status = status;
        await ride.save();

        res.json(ride);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @route   PUT /api/rides/:id/collect-payment
// @desc    Driver collects cash payment
// @access  Private (Driver)
router.put('/:id/collect-payment', protect, async (req, res) => {
    if (req.user.role !== 'driver') {
        return res.status(403).json({ message: 'Only drivers can collect payment' });
    }

    try {
        const ride = await Ride.findById(req.params.id);

        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        // Check if ride is assigned to this driver
        if (ride.driver.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // User requirement: "drive only panding hoga to approved kr sata hai jab ride comple ho tab"
        // Meaning: Driver can approve ONLY if payment is currently PENDING.
        // And ONLY when ride is completed (implied or explicit).
        // Let's enforce ride status is 'completed' as well for safety.

        if (ride.status !== 'completed') {
             return res.status(400).json({ message: 'Ride must be completed to collect payment' });
        }

        if (ride.paymentStatus !== 'pending') {
            return res.status(400).json({ message: 'Payment is not pending' });
        }

        ride.paymentStatus = 'approved';
        ride.paymentMethod = 'cash'; // Assume cash for driver collection
        await ride.save();

        res.json(ride);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @route   GET /api/rides/my-rides
// @desc    Get ride history
// @access  Private
router.get('/my-rides', protect, async (req, res) => {
    try {
        let query;
        if (req.user.role === 'user') {
            query = { user: req.user._id };
        } else if (req.user.role === 'driver') {
            query = { driver: req.user._id };
        } else {
            // Admin can see all? Or use separate admin route.
             return res.status(400).json({ message: 'Invalid role' });
        }

        const rides = await Ride.find(query)
            .populate('user', 'name')
            .populate('driver', 'name vehicle')
            .sort({ createdAt: -1 });
            
        res.json(rides);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @route   GET /api/rides/stats
// @desc    Get financial stats for user/driver
// @access  Private
router.get('/stats', protect, async (req, res) => {
    try {
        let stats = {};
        
        if (req.user.role === 'user') {
            // User: Total Spent, Ride Count
            const rides = await Ride.find({ user: req.user._id, paymentStatus: 'approved' });
            const totalSpent = rides.reduce((sum, ride) => sum + (ride.fare || 0), 0);
            
            stats = {
                totalSpent,
                totalRides: rides.length,
                pendingPayments: await Ride.countDocuments({ user: req.user._id, paymentStatus: 'pending' })
            };
            
        } else if (req.user.role === 'driver') {
            // Driver: Total Earned, Daily, Monthly, Ride Count
            const allRides = await Ride.find({ driver: req.user._id, paymentStatus: 'approved' });
            const totalEarned = allRides.reduce((sum, ride) => sum + (ride.fare || 0), 0);
            
            // Today's earnings
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayRides = await Ride.find({ 
                driver: req.user._id, 
                paymentStatus: 'approved',
                createdAt: { $gte: today }
            });
            const todayEarnings = todayRides.reduce((sum, ride) => sum + (ride.fare || 0), 0);
            
            // This month's earnings
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const monthRides = await Ride.find({
                driver: req.user._id,
                paymentStatus: 'approved',
                createdAt: { $gte: monthStart }
            });
            const monthEarnings = monthRides.reduce((sum, ride) => sum + (ride.fare || 0), 0);
            
            stats = {
                totalEarned,
                todayEarnings,
                monthEarnings,
                totalRides: allRides.length,
                todayRides: todayRides.length,
                monthRides: monthRides.length,
                pendingPayments: await Ride.countDocuments({ driver: req.user._id, paymentStatus: 'pending', status: 'completed' })
            };
        } else {
            return res.status(400).json({ message: 'Stats not available for this role' });
        }
        
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

module.exports = router;
