import { useState, useEffect } from 'react';
import api from '../api/axios';

const BookingForm = ({ onRideBooked }) => {
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
    
    // Store selected location coordinates
    const [pickupCoords, setPickupCoords] = useState(null);
    const [dropCoords, setDropCoords] = useState(null);

    // Fetch fare config on mount
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

    // Search locations using Nominatim API (Free)
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

    // Handle pickup input change with debounce
    const handlePickupChange = (value) => {
        setPickup(value);
        setPickupCoords(null); // Reset coords when typing
        setFare(0); // Reset fare when location changes
        setTimeout(() => searchLocationAPI(value, 'pickup'), 500);
    };

    // Handle drop input change with debounce
    const handleDropChange = (value) => {
        setDrop(value);
        setDropCoords(null); // Reset coords when typing
        setFare(0); // Reset fare when location changes
        setTimeout(() => searchLocationAPI(value, 'drop'), 500);
    };

    // Select pickup from suggestions
    const selectPickup = (result) => {
        const name = result.display_name.split(',')[0];
        setPickup(name);
        setPickupCoords({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
        setShowPickupDropdown(false);
        setPickupSuggestions([]);
    };

    // Select drop from suggestions
    const selectDrop = (result) => {
        const name = result.display_name.split(',')[0];
        setDrop(name);
        setDropCoords({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
        setShowDropDropdown(false);
        setDropSuggestions([]);
    };

    // Calculate distance using Haversine formula
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
        
        if (!pickupCoords || !dropCoords) {
            alert('Please select locations from the dropdown suggestions');
            return;
        }

        try {
            const payload = {
                pickupLocation: {
                    address: pickup,
                    lat: pickupCoords.lat,
                    lng: pickupCoords.lng
                },
                dropLocation: {
                    address: drop,
                    lat: dropCoords.lat,
                    lng: dropCoords.lng
                },
                fare: fare
            };

            const { data } = await api.post('/rides', payload);
            alert('Ride Booked Successfully!');
            if (onRideBooked) onRideBooked(data);
            // Reset form
            setPickup('');
            setDrop('');
            setFare(0);
            setPickupCoords(null);
            setDropCoords(null);
        } catch (error) {
            console.error(error);
            alert('Failed to book ride');
        }
    };

    const isFormValid = pickupCoords && dropCoords && fare > 0;

    return (
        <div className="card">
            {/* Header */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem',
                    marginBottom: '0.5rem'
                }}>
                    <span style={{ fontSize: '1.75rem' }}>🚕</span>
                    <span style={{ 
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Book your Ride
                    </span>
                </h2>
                <div style={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0.75rem',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.1))',
                    borderRadius: '20px',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                }}>
                    <span style={{ fontSize: '0.9rem' }}>📍</span>
                    <span style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: '500' }}>
                        Search any West Bengal location
                    </span>
                </div>
            </div>
            <form onSubmit={handleBook}>
                {/* Pickup Location Input */}
                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                    <input 
                        type="text" 
                        placeholder="🔍 Search Pickup Location..." 
                        value={pickup} 
                        onChange={(e) => handlePickupChange(e.target.value)}
                        onFocus={() => pickupSuggestions.length > 0 && setShowPickupDropdown(true)}
                        required 
                        style={{ marginBottom: 0 }}
                    />
                    {isSearchingPickup && (
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem' }}>🔄</span>
                    )}
                    {pickupCoords && (
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#10B981' }}>✓</span>
                    )}
                    {/* Suggestions Dropdown */}
                    {showPickupDropdown && pickupSuggestions.length > 0 && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            zIndex: 100,
                            boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
                        }}>
                            {pickupSuggestions.map((result, idx) => (
                                <div 
                                    key={idx}
                                    onMouseDown={() => selectPickup(result)}
                                    style={{
                                        padding: '0.75rem 1rem',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid var(--border)',
                                        fontSize: '0.85rem',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = 'rgba(99, 102, 241, 0.1)'}
                                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                >
                                    📍 {result.display_name.substring(0, 50)}...
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Drop Location Input */}
                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                    <input 
                        type="text" 
                        placeholder="🔍 Search Drop Location..." 
                        value={drop} 
                        onChange={(e) => handleDropChange(e.target.value)}
                        onFocus={() => dropSuggestions.length > 0 && setShowDropDropdown(true)}
                        required 
                        style={{ marginBottom: 0 }}
                    />
                    {isSearchingDrop && (
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem' }}>🔄</span>
                    )}
                    {dropCoords && (
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#10B981' }}>✓</span>
                    )}
                    {/* Suggestions Dropdown */}
                    {showDropDropdown && dropSuggestions.length > 0 && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            zIndex: 100,
                            boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
                        }}>
                            {dropSuggestions.map((result, idx) => (
                                <div 
                                    key={idx}
                                    onMouseDown={() => selectDrop(result)}
                                    style={{
                                        padding: '0.75rem 1rem',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid var(--border)',
                                        fontSize: '0.85rem',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = 'rgba(99, 102, 241, 0.1)'}
                                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                >
                                    📍 {result.display_name.substring(0, 50)}...
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                    <button 
                        type="button" 
                        onClick={calculateFare} 
                        className="btn btn-secondary"
                        disabled={!pickupCoords || !dropCoords}
                        style={{ opacity: (!pickupCoords || !dropCoords) ? 0.5 : 1 }}
                    >
                        Estimate Fare
                    </button>
                    {fare > 0 && <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--secondary)' }}>₹{fare}</span>}
                </div>
                
                <button 
                    type="submit" 
                    disabled={!isFormValid} 
                    className="btn btn-primary" 
                    style={{ width: '100%', opacity: !isFormValid ? 0.5 : 1 }}
                >
                    Confirm Booking
                </button>
            </form>
        </div>
    );
};

export default BookingForm;
