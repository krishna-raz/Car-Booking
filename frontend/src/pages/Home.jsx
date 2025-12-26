import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './Home.css';

// Kolkata landmark images
const kolkataImages = [
    'https://images.unsplash.com/photo-1558431382-27e303142255?w=1920&q=80', // Howrah Bridge
    'https://images.unsplash.com/photo-1536421469767-80559bb6f5e1?w=1920&q=80', // Victoria Memorial
    'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=1920&q=80', // City Night
    'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=1920&q=80', // Indian Street
];

// Hero Booking Form Component with Nominatim Search
const HeroBookingForm = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [pickup, setPickup] = useState('');
    const [drop, setDrop] = useState('');
    const [fare, setFare] = useState(0);
    const [pickupSuggestions, setPickupSuggestions] = useState([]);
    const [dropSuggestions, setDropSuggestions] = useState([]);
    const [showPickupDropdown, setShowPickupDropdown] = useState(false);
    const [showDropDropdown, setShowDropDropdown] = useState(false);
    const [fareConfig, setFareConfig] = useState({ baseFare: 30, perKmRate: 12, minimumFare: 50 });
    const [isSearchingPickup, setIsSearchingPickup] = useState(false);
    const [isSearchingDrop, setIsSearchingDrop] = useState(false);
    const [pickupCoords, setPickupCoords] = useState(null);
    const [dropCoords, setDropCoords] = useState(null);

    useEffect(() => {
        const fetchFareConfig = async () => {
            try {
                const { data } = await api.get('/rides/fare-config');
                setFareConfig(data);
            } catch (error) {
                console.log('Using default fare config');
            }
        };
        fetchFareConfig();
    }, []);

    // Search using Nominatim API
    const searchLocationAPI = async (query, type) => {
        if (!query || query.length < 3) {
            if (type === 'pickup') setPickupSuggestions([]);
            else setDropSuggestions([]);
            return;
        }
        if (type === 'pickup') setIsSearchingPickup(true);
        else setIsSearchingDrop(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&accept-language=en&q=${encodeURIComponent(query)}, West Bengal, India&limit=5`
            );
            const data = await response.json();
            if (type === 'pickup') {
                setPickupSuggestions(data);
                setShowPickupDropdown(true);
            } else {
                setDropSuggestions(data);
                setShowDropDropdown(true);
            }
        } catch (error) {
            console.error('Search error:', error);
        }
        if (type === 'pickup') setIsSearchingPickup(false);
        else setIsSearchingDrop(false);
    };

    const handlePickupChange = (value) => {
        setPickup(value);
        setPickupCoords(null);
        setFare(0);
        setTimeout(() => searchLocationAPI(value, 'pickup'), 500);
    };

    const handleDropChange = (value) => {
        setDrop(value);
        setDropCoords(null);
        setFare(0);
        setTimeout(() => searchLocationAPI(value, 'drop'), 500);
    };

    const selectPickup = (result) => {
        const name = result.display_name.split(',')[0];
        setPickup(name);
        setPickupCoords({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
        setShowPickupDropdown(false);
    };

    const selectDrop = (result) => {
        const name = result.display_name.split(',')[0];
        setDrop(name);
        setDropCoords({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
        setShowDropDropdown(false);
    };

    const calculateDistance = (lat1, lng1, lat2, lng2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };

    const calculateFare = () => {
        if (pickupCoords && dropCoords) {
            const distance = calculateDistance(pickupCoords.lat, pickupCoords.lng, dropCoords.lat, dropCoords.lng);
            let calculatedFare = fareConfig.baseFare + (distance * fareConfig.perKmRate);
            calculatedFare = Math.max(calculatedFare, fareConfig.minimumFare);
            setFare(Math.round(calculatedFare));
        } else {
            alert('Please select valid pickup and drop locations from suggestions');
        }
    };

    const handleBook = async (e) => {
        e.preventDefault();
        if (!user) {
            alert('Please login to book a ride');
            navigate('/login?role=user');
            return;
        }
        if (!pickupCoords || !dropCoords) {
            alert('Please select locations from dropdown');
            return;
        }
        try {
            await api.post('/rides', {
                pickupLocation: { address: pickup, lat: pickupCoords.lat, lng: pickupCoords.lng },
                dropLocation: { address: drop, lat: dropCoords.lat, lng: dropCoords.lng },
                fare: fare
            });
            alert('Ride Booked Successfully!');
            navigate('/dashboard');
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.message || 'Failed to book ride. Please login first.');
            navigate('/login?role=user');
        }
    };

    const isFormValid = pickupCoords && dropCoords && fare > 0;

    return (
        <div className="hero-booking-form">
            <div className="booking-form-header">
                <h3>🚕 Book Your Ride</h3>
                <span className="kolkata-badge">📍 West Bengal</span>
            </div>
            
            <form onSubmit={handleBook}>
                <div className="form-group" style={{ position: 'relative' }}>
                    <input 
                        type="text" 
                        placeholder="🔍 Search Pickup Location..." 
                        value={pickup} 
                        onChange={(e) => handlePickupChange(e.target.value)}
                        onFocus={() => pickupSuggestions.length > 0 && setShowPickupDropdown(true)}
                        required 
                    />
                    {isSearchingPickup && <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>🔄</span>}
                    {pickupCoords && <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#10B981' }}>✓</span>}
                    {showPickupDropdown && pickupSuggestions.length > 0 && (
                        <div className="location-dropdown">
                            {pickupSuggestions.map((result, idx) => (
                                <div key={idx} className="dropdown-item" onMouseDown={() => selectPickup(result)}>
                                    📍 {result.display_name.substring(0, 40)}...
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="form-group" style={{ position: 'relative' }}>
                    <input 
                        type="text" 
                        placeholder="🔍 Search Drop Location..." 
                        value={drop} 
                        onChange={(e) => handleDropChange(e.target.value)}
                        onFocus={() => dropSuggestions.length > 0 && setShowDropDropdown(true)}
                        required 
                    />
                    {isSearchingDrop && <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>🔄</span>}
                    {dropCoords && <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#10B981' }}>✓</span>}
                    {showDropDropdown && dropSuggestions.length > 0 && (
                        <div className="location-dropdown">
                            {dropSuggestions.map((result, idx) => (
                                <div key={idx} className="dropdown-item" onMouseDown={() => selectDrop(result)}>
                                    📍 {result.display_name.substring(0, 40)}...
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="fare-section">
                    <button type="button" onClick={calculateFare} className="btn btn-secondary" disabled={!pickupCoords || !dropCoords}>
                        Estimate Fare
                    </button>
                    {fare > 0 && <span className="fare-display">₹{fare}</span>}
                </div>
                
                <button 
                    type="submit" 
                    disabled={!isFormValid} 
                    className="btn btn-primary book-btn"
                    style={{ opacity: !isFormValid ? 0.6 : 1 }}
                >
                    {user ? 'Confirm Booking' : 'Login to Book'}
                </button>
            </form>
        </div>
    );
};

const Home = () => {
    const [currentImage, setCurrentImage] = useState(0);
    
    // Auto slider - changes image every 4 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImage((prev) => (prev + 1) % kolkataImages.length);
        }, 4000); // 4 seconds
        
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="home-container">
            {/* Navigation */}
            <nav className="navbar">
                <div className="logo">🚗 Kolkata Ride</div>
                <div className="nav-links">
                    <a href="#features">Features</a>
                    <a href="#about">About</a>
                    <a href="#contact">Contact</a>
                    <Link to="/login" className="btn btn-primary btn-sm">Login</Link>
                </div>
            </nav>

            {/* Hero Section with Booking Form */}
            <header className="hero">
                {/* Background Image Slider */}
                <div className="hero-slider">
                    {kolkataImages.map((img, index) => (
                        <div
                            key={index}
                            className="hero-slide"
                            style={{
                                backgroundImage: `url(${img})`,
                                opacity: currentImage === index ? 1 : 0
                            }}
                        />
                    ))}
                    <div className="hero-overlay" />
                </div>
                
                {/* Hero Content with Booking Form */}
                <div className="hero-content hero-split">
                    {/* Left Side - Text Content */}
                    <div className="hero-text">
                        <div className="hero-badge">🎉 #1 Kolkata Local Taxi Service</div>
                        <h1>Kolkata <span className="gradient-text">Ride Book</span></h1>
                        <p className="hero-subtitle">
                            Experience premium Kolkata taxi service with transparent pricing, 
                            verified drivers, and hassle-free booking. Available 24/7 across Kolkata.
                        </p>
                        <div className="hero-stats">
                            <div className="stat">
                                <span className="stat-number">500+</span>
                                <span className="stat-label">Happy Riders</span>
                            </div>
                            <div className="stat">
                                <span className="stat-number">50+</span>
                                <span className="stat-label">Verified Drivers</span>
                            </div>
                            <div className="stat">
                                <span className="stat-number">24/7</span>
                                <span className="stat-label">Service</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Right Side - Booking Form */}
                    <HeroBookingForm />
                </div>
            </header>

            {/* Features Section */}
            <section id="features" className="features-section">
                <h2 className="section-title">Why Choose <span className="gradient-text">Kolkata Ride</span>?</h2>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">💰</div>
                        <h3>Transparent Pricing</h3>
                        <p>No hidden charges. Know your fare before you ride.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">🛡️</div>
                        <h3>Safe & Secure</h3>
                        <p>All drivers verified. Your safety is our priority.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">⚡</div>
                        <h3>Quick Booking</h3>
                        <p>Book in seconds. Get picked up in minutes.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">📞</div>
                        <h3>24/7 Support</h3>
                        <p>Need help? We're always here for you.</p>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="how-it-works">
                <h2 className="section-title">How It <span className="gradient-text">Works</span></h2>
                <div className="steps">
                    <div className="step">
                        <div className="step-number">1</div>
                        <h3>Book Your Ride</h3>
                        <p>Enter pickup & drop location</p>
                    </div>
                    <div className="step-arrow">→</div>
                    <div className="step">
                        <div className="step-number">2</div>
                        <h3>Confirm Payment</h3>
                        <p>Admin verifies your booking</p>
                    </div>
                    <div className="step-arrow">→</div>
                    <div className="step">
                        <div className="step-number">3</div>
                        <h3>Driver Assigned</h3>
                        <p>Your driver is on the way</p>
                    </div>
                    <div className="step-arrow">→</div>
                    <div className="step">
                        <div className="step-number">4</div>
                        <h3>Enjoy Your Ride</h3>
                        <p>Sit back and relax!</p>
                    </div>
                </div>
            </section>

            {/* Role Cards */}
            <section className="role-section">
                <h2 className="section-title">Get <span className="gradient-text">Started</span></h2>
                <div className="role-selection">
                    <div className="card role-card">
                        <div className="card-icon">🧑‍💼</div>
                        <h2>Rider</h2>
                        <p className="text-muted">Book a ride instantly with real-time tracking and transparent pricing.</p>
                        <div className="actions">
                            <Link to="/login?role=user" className="btn btn-primary">Login</Link>
                            <Link to="/register?role=user" className="btn btn-secondary">Register</Link>
                        </div>
                    </div>

                    <div className="card role-card">
                        <div className="card-icon">🚗</div>
                        <h2>Driver</h2>
                        <p className="text-muted">Join our fleet and earn on your schedule. Be your own boss.</p>
                        <div className="actions">
                            <Link to="/login?role=driver" className="btn btn-primary">Driver Login</Link>
                        </div>
                    </div>

                    <div className="card role-card admin-card">
                        <div className="card-icon">⚙️</div>
                        <h2>Admin</h2>
                        <p className="text-muted">Platform management and operations control center.</p>
                        <div className="actions">
                            <Link to="/login" className="btn btn-secondary">Admin Access</Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className="about-section">
                <div className="about-content">
                    <h2 className="section-title">About <span className="gradient-text">Kolkata Ride</span></h2>
                    <p>
                        Kolkata Ride is the premier local taxi booking platform for the City of Joy. 
                        We connect riders with trusted drivers across Kolkata - from Howrah to 
                        Salt Lake, Park Street to Dum Dum.
                    </p>
                    <p>
                        Our platform handles everything from booking to payment verification, 
                        ensuring a seamless experience for both riders and drivers in Kolkata.
                    </p>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="contact-section">
                <h2 className="section-title">Contact <span className="gradient-text">Us</span></h2>
                <div className="contact-grid">
                    <div className="contact-item">
                        <span className="contact-icon">📞</span>
                        <p>+91 98765 43210</p>
                    </div>
                    <div className="contact-item">
                        <span className="contact-icon">✉️</span>
                        <p>support@ridex.com</p>
                    </div>
                    <div className="contact-item">
                        <span className="contact-icon">📍</span>
                        <p>Kolkata, West Bengal, India</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer">
                <p>© 2024 Kolkata Ride. All rights reserved. | Made with ❤️ for Kolkata</p>
            </footer>
        </div>
    );
};

export default Home;