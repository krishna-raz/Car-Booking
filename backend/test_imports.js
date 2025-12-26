console.log('Testing imports...');
try {
    require('dotenv').config();
    console.log('dotenv ok');
    require('express');
    console.log('express ok');
    require('mongoose');
    console.log('mongoose ok');
    require('cors');
    console.log('cors ok');
    require('./routes/authRoutes');
    console.log('authRoutes ok');
    require('./routes/rideRoutes');
    console.log('rideRoutes ok');
    require('./routes/adminRoutes');
    console.log('adminRoutes ok');
    console.log('All imports passed');
} catch (e) {
    console.error('Import Error:', e);
}
