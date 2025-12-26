const jwt = require('jsonwebtoken');
const User = require('../models/User');

const Driver = require('../models/Driver');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
            
            // Try to find user
            let user = await User.findById(decoded.id).select('-password');
            if (!user) {
                // If not user, try driver
                user = await Driver.findById(decoded.id).select('-password');
                // Add role identifier if not present in schema but needed for logic
                if (user) {
                   // Driver found
                   // Ensure role is set on req.user for consistency
                   if(!user.role) user.role = 'driver'; 
                }
            }

            req.user = user;

            if (!req.user) {
                 return res.status(401).json({ message: 'Not authorized, user/driver not found' });
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

module.exports = { protect, admin };
