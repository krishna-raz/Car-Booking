const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    pickupLocation: {
        address: { type: String, required: true },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    dropLocation: {
        address: { type: String, required: true },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    fare: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'assigned', 'accepted', 'ongoing', 'completed', 'cancelled'], 
        default: 'pending' 
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    rating: { type: Number }, // User rating for driver
    driverRating: { type: Number }, // Driver rating for user
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ride', rideSchema);
