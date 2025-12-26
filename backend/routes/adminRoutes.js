const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const bcrypt = require('bcryptjs'); // Added for driver creation
const { protect, admin } = require('../middleware/authMiddleware');

//Middleware to protect admin routes
router.use(protect);
router.use(admin);

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private/Admin
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({});
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/admin/drivers
// @desc    Get all drivers
// @access  Private/Admin
router.get('/drivers', async (req, res) => {
    try {
        const drivers = await Driver.find({});
        res.json(drivers);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/admin/rides
// @desc    Get all rides
// @access  Private/Admin
router.get('/rides', async (req, res) => {
    try {
        const rides = await Ride.find({})
            .populate('user', 'name phone email')
            .populate('driver', 'name phone vehicle')
            .sort({ createdAt: -1 });
        res.json(rides);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   PUT /api/admin/rides/:id/payment
// @desc    Approve/Reject payment
// @access  Private/Admin
router.put('/rides/:id/payment', async (req, res) => {
    const { paymentStatus } = req.body; // approved, rejected

    try {
        const ride = await Ride.findById(req.params.id);

        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        ride.paymentStatus = paymentStatus;
        await ride.save();

        res.json(ride);
    } catch (error) {
         res.status(500).json({ message: 'Server Error' });
    }
});

// @route   PUT /api/admin/rides/:id/assign
// @desc    Assign driver to ride
// @access  Private/Admin
router.put('/rides/:id/assign', async (req, res) => {
    const { driverId } = req.body;

    try {
        const ride = await Ride.findById(req.params.id);
        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        ride.driver = driverId;
        ride.status = 'assigned';
        await ride.save();

        res.json(ride);
    } catch (error) {
         console.error(error);
         res.status(500).json({ message: 'Server Error' });
    }
});

// @route   POST /api/admin/drivers
// @desc    Create a new driver (Admin only)
// @access  Private/Admin
router.post('/drivers', async (req, res) => {
    const { name, email, password, phone, vehicle } = req.body;

    try {
        // Check if driver exists
        const driverExists = await Driver.findOne({ email });
        if (driverExists) {
            return res.status(400).json({ message: 'Driver already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const driver = await Driver.create({
            name,
            email,
            password: hashedPassword,
            phone,
            vehicle
        });

        res.status(201).json(driver);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   DELETE /api/admin/drivers/:id
// @desc    Delete a driver
// @access  Private/Admin
router.delete('/drivers/:id', async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id);
        if (!driver) {
             return res.status(404).json({ message: 'Driver not found' });
        }
        
        await driver.deleteOne();
        res.json({ message: 'Driver removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   PUT /api/admin/drivers/:id/approve
// @desc    Approve a driver
// @access  Private/Admin
router.put('/drivers/:id/approve', async (req, res) => {
    console.log('Approve route hit for driver:', req.params.id);
    try {
        const driver = await Driver.findById(req.params.id);
        console.log('Driver found:', driver);
        if (!driver) {
            return res.status(404).json({ message: 'Driver not found' });
        }
        
        driver.status = 'approved';
        const savedDriver = await driver.save();
        console.log('Driver saved with status:', savedDriver.status);
        res.json({ message: 'Driver approved', driver: savedDriver });
    } catch (error) {
        console.error('Error approving driver:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   PUT /api/admin/drivers/:id/suspend
// @desc    Suspend a driver
// @access  Private/Admin
router.put('/drivers/:id/suspend', async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id);
        if (!driver) {
            return res.status(404).json({ message: 'Driver not found' });
        }
        
        driver.status = 'suspended';
        await driver.save();
        res.json({ message: 'Driver suspended', driver });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});


module.exports = router;
