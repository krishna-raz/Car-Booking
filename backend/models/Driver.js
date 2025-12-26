const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    vehicle: {
        model: { type: String },
        plateNumber: { type: String },
        type: { type: String } // e.g., Sedan, SUV
    },
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'suspended'], 
        default: 'pending' 
    },
    isAvailable: { type: Boolean, default: false },
    currentLocation: {
        lat: { type: Number },
        lng: { type: Number }
    },
    rating: { type: Number, default: 5 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Driver', driverSchema);
