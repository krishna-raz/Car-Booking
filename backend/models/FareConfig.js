const mongoose = require('mongoose');

const fareConfigSchema = new mongoose.Schema({
    baseFare: { 
        type: Number, 
        default: 30,
        required: true 
    },
    perKmRate: { 
        type: Number, 
        default: 12,
        required: true 
    },
    minimumFare: { 
        type: Number, 
        default: 50,
        required: true 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Ensure only one config document exists
fareConfigSchema.statics.getConfig = async function() {
    let config = await this.findOne();
    if (!config) {
        config = await this.create({});
    }
    return config;
};

module.exports = mongoose.model('FareConfig', fareConfigSchema);
