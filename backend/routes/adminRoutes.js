const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const FareConfig = require('../models/FareConfig');
const bcrypt = require('bcryptjs'); // Added for driver creation
const { protect, admin } = require('../middleware/authMiddleware');
const fs = require('fs');
const path = require('path');

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

// ============================================
// LOCATION MANAGEMENT ROUTES
// ============================================

// @route   GET /api/admin/locations
// @desc    Get all locations
// @access  Private/Admin
router.get('/locations', async (req, res) => {
    try {
        const locationsPath = path.join(__dirname, '../../frontend/src/data/locations.json');
        const locationsData = JSON.parse(fs.readFileSync(locationsPath, 'utf8'));
        res.json(locationsData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error reading locations' });
    }
});

// @route   POST /api/admin/locations
// @desc    Add new location
// @access  Private/Admin
router.post('/locations', async (req, res) => {
    const { name, lat, lng } = req.body;

    if (!name || !lat || !lng) {
        return res.status(400).json({ message: 'Name, lat and lng are required' });
    }

    try {
        const locationsPath = path.join(__dirname, '../../frontend/src/data/locations.json');
        const locationsData = JSON.parse(fs.readFileSync(locationsPath, 'utf8'));
        
        // Check if location already exists
        const exists = locationsData.areas.some(
            area => area.name.toLowerCase() === name.toLowerCase()
        );
        
        if (exists) {
            return res.status(400).json({ message: 'Location already exists' });
        }

        // Add new location
        locationsData.areas.push({ name, lat: parseFloat(lat), lng: parseFloat(lng) });
        
        // Save back to file
        fs.writeFileSync(locationsPath, JSON.stringify(locationsData, null, 2));
        
        res.status(201).json({ message: 'Location added successfully', location: { name, lat, lng } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding location' });
    }
});

// @route   DELETE /api/admin/locations/:name
// @desc    Delete a location
// @access  Private/Admin
router.delete('/locations/:name', async (req, res) => {
    const locationName = decodeURIComponent(req.params.name);

    try {
        const locationsPath = path.join(__dirname, '../../frontend/src/data/locations.json');
        const locationsData = JSON.parse(fs.readFileSync(locationsPath, 'utf8'));
        
        const initialLength = locationsData.areas.length;
        locationsData.areas = locationsData.areas.filter(
            area => area.name.toLowerCase() !== locationName.toLowerCase()
        );
        
        if (locationsData.areas.length === initialLength) {
            return res.status(404).json({ message: 'Location not found' });
        }
        
        fs.writeFileSync(locationsPath, JSON.stringify(locationsData, null, 2));
        
        res.json({ message: 'Location deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting location' });
    }
});

// ============================================
// FARE CONFIGURATION ROUTES
// ============================================

// @route   GET /api/admin/fare-config
// @desc    Get fare configuration
// @access  Private/Admin
router.get('/fare-config', async (req, res) => {
    try {
        const config = await FareConfig.getConfig();
        res.json(config);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching fare config' });
    }
});

// @route   PUT /api/admin/fare-config
// @desc    Update fare configuration
// @access  Private/Admin
router.put('/fare-config', async (req, res) => {
    const { baseFare, perKmRate, minimumFare } = req.body;

    try {
        let config = await FareConfig.findOne();
        
        if (!config) {
            config = new FareConfig({});
        }
        
        if (baseFare !== undefined) config.baseFare = baseFare;
        if (perKmRate !== undefined) config.perKmRate = perKmRate;
        if (minimumFare !== undefined) config.minimumFare = minimumFare;
        config.updatedAt = Date.now();
        
        await config.save();
        
        res.json({ message: 'Fare config updated', config });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating fare config' });
    }
});

// ============================================
// ADMIN RIDE CREATION (MANUAL BOOKING)
// ============================================

// @route   POST /api/admin/rides
// @desc    Create ride as admin (manual booking)
// @access  Private/Admin
router.post('/rides', async (req, res) => {
    const { userId, pickupLocation, dropLocation, fare, driverId } = req.body;

    try {
        const rideData = {
            user: userId,
            pickupLocation,
            dropLocation,
            fare,
            status: driverId ? 'assigned' : 'pending'
        };
        
        if (driverId) {
            rideData.driver = driverId;
        }

        const ride = await Ride.create(rideData);
        
        const populatedRide = await Ride.findById(ride._id)
            .populate('user', 'name phone email')
            .populate('driver', 'name phone vehicle');

        res.status(201).json(populatedRide);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating ride' });
    }
});


module.exports = router;

