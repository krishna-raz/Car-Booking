require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors({ origin: '*' }));

// Database Connection
// Database Connection
console.log('Attempting to connect to MongoDB...');
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ride-hailing-app')
.then(async () => {
    console.log('MongoDB Connected');
    // Seed Admin
    await require('./seedAdmin')();
})
.catch(err => {
    console.error('MongoDB Connection Error Details:', err);
    process.exit(1);
});

// Basic Route
app.get('/', (req, res) => {
    res.send('Ride Hailing API is running...');
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/rides', require('./routes/rideRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
