import { useState, useEffect } from 'react';
import api from '../api/axios';
import kolkataLocations from '../data/locations.json';

const BookingForm = ({ onRideBooked }) => {
    const [pickup, setPickup] = useState('');
    const [drop, setDrop] = useState('');
    const [fare, setFare] = useState(0);
    const [pickupSuggestions, setPickupSuggestions] = useState([]);
    const [dropSuggestions, setDropSuggestions] = useState([]);
    const [showPickupDropdown, setShowPickupDropdown] = useState(false);
    const [showDropDropdown, setShowDropDropdown] = useState(false);
    const [fareConfig, setFareConfig] = useState({ baseFare: 30, perKmRate: 12, minimumFare: 50 });

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

    // Calculate distance using Haversine formula
    const calculateDistance = (lat1, lng1, lat2, lng2) => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };

    const calculateFare = () => {
        const pickupArea = kolkataLocations.areas.find(a => 
            pickup.toLowerCase().includes(a.name.toLowerCase())
        );
        const dropArea = kolkataLocations.areas.find(a => 
            drop.toLowerCase().includes(a.name.toLowerCase())
        );
        
        if (pickupArea && dropArea) {
            const distance = calculateDistance(pickupArea.lat, pickupArea.lng, dropArea.lat, dropArea.lng);
            let calculatedFare = fareConfig.baseFare + (distance * fareConfig.perKmRate);
            calculatedFare = Math.max(calculatedFare, fareConfig.minimumFare);
            setFare(Math.round(calculatedFare));
        } else {
            // Fallback if locations not found exactly
            const defaultFare = fareConfig.baseFare + (5 * fareConfig.perKmRate);
            setFare(Math.round(Math.max(defaultFare, fareConfig.minimumFare)));
        }
    };

    // Search locations from locations.json
    const searchLocations = (query) => {
        if (!query || query.length < 2) return [];
        const results = kolkataLocations.areas.filter(area =>
            area.name.toLowerCase().includes(query.toLowerCase())
        );
        return results;
    };

    // Handle pickup input change
    const handlePickupChange = (value) => {
        setPickup(value);
        const results = searchLocations(value);
        setPickupSuggestions(results);
        setShowPickupDropdown(value.length >= 2);
    };

    // Handle drop input change
    const handleDropChange = (value) => {
        setDrop(value);
        const results = searchLocations(value);
        setDropSuggestions(results);
        setShowDropDropdown(value.length >= 2);
    };

    // Select pickup suggestion
    const selectPickup = (area) => {
        setPickup(area.name);
        setShowPickupDropdown(false);
    };

    // Select drop suggestion
    const selectDrop = (area) => {
        setDrop(area.name);
        setShowDropDropdown(false);
    };

    // Check if location is in Kolkata using locations.json
    const isKolkataLocation = (location) => {
        const areaNames = kolkataLocations.areas.map(area => area.name.toLowerCase());
        return areaNames.some(area => location.toLowerCase().includes(area));
    };

    // Get coordinates for a location
    const getLocationCoords = (location) => {
        const area = kolkataLocations.areas.find(a => 
            location.toLowerCase().includes(a.name.toLowerCase())
        );
        return area 
            ? { lat: area.lat, lng: area.lng } 
            : { lat: kolkataLocations.coordinates.lat, lng: kolkataLocations.coordinates.lng };
    };

    const handleBook = async (e) => {
        e.preventDefault();
        
        // Validate Kolkata location
        if (!isKolkataLocation(pickup) && !isKolkataLocation(drop)) {
            return; // Error will show in the UI
        }

        const pickupCoords = getLocationCoords(pickup);
        const dropCoords = getLocationCoords(drop);

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
        } catch (error) {
            console.error(error);
            alert('Failed to book ride');
        }
    };

    // Check if current input has valid location
    const pickupValid = pickup.length < 2 || isKolkataLocation(pickup);
    const dropValid = drop.length < 2 || isKolkataLocation(drop);

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
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(249, 115, 22, 0.1))',
                    borderRadius: '20px',
                    border: '1px solid rgba(245, 158, 11, 0.2)'
                }}>
                    <span style={{ fontSize: '0.9rem' }}>📍</span>
                    <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: '500' }}>
                        Service available only in Kolkata
                    </span>
                </div>
            </div>
            <form onSubmit={handleBook}>
                {/* Pickup Location Input */}
                <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                    <input 
                        type="text" 
                        placeholder="Pickup Location (e.g., Howrah)" 
                        value={pickup} 
                        onChange={(e) => handlePickupChange(e.target.value)}
                        onFocus={() => pickup.length >= 2 && setShowPickupDropdown(true)}
                        onBlur={() => setTimeout(() => setShowPickupDropdown(false), 200)}
                        required 
                        style={{ marginBottom: 0 }}
                    />
                    {/* Suggestions Dropdown */}
                    {showPickupDropdown && (
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
                            zIndex: 10,
                            boxShadow: '0 4px 15px var(--shadow)'
                        }}>
                            {pickupSuggestions.length > 0 ? (
                                pickupSuggestions.map((area, idx) => (
                                    <div 
                                        key={idx}
                                        onMouseDown={() => selectPickup(area)}
                                        style={{
                                            padding: '0.75rem 1rem',
                                            cursor: 'pointer',
                                            borderBottom: '1px solid var(--border)',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.target.style.background = 'var(--bg-input)'}
                                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                    >
                                        📍 {area.name}
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '0.75rem 1rem', color: 'var(--danger)' }}>
                                    ❌ Sorry, location not found in Kolkata
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {/* Pickup validation message */}
                {pickup.length >= 2 && !pickupValid && (
                    <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                        ⚠️ Please select a valid Kolkata location
                    </p>
                )}

                {/* Drop Location Input */}
                <div style={{ position: 'relative', marginBottom: '0.5rem', marginTop: '0.5rem' }}>
                    <input 
                        type="text" 
                        placeholder="Drop Location (e.g., Salt Lake)" 
                        value={drop} 
                        onChange={(e) => handleDropChange(e.target.value)}
                        onFocus={() => drop.length >= 2 && setShowDropDropdown(true)}
                        onBlur={() => setTimeout(() => setShowDropDropdown(false), 200)}
                        required 
                        style={{ marginBottom: 0 }}
                    />
                    {/* Suggestions Dropdown */}
                    {showDropDropdown && (
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
                            zIndex: 10,
                            boxShadow: '0 4px 15px var(--shadow)'
                        }}>
                            {dropSuggestions.length > 0 ? (
                                dropSuggestions.map((area, idx) => (
                                    <div 
                                        key={idx}
                                        onMouseDown={() => selectDrop(area)}
                                        style={{
                                            padding: '0.75rem 1rem',
                                            cursor: 'pointer',
                                            borderBottom: '1px solid var(--border)',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.target.style.background = 'var(--bg-input)'}
                                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                    >
                                        📍 {area.name}
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '0.75rem 1rem', color: 'var(--danger)' }}>
                                    ❌ Sorry, location not found in Kolkata
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {/* Drop validation message */}
                {drop.length >= 2 && !dropValid && (
                    <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                        ⚠️ Please select a valid Kolkata location
                    </p>
                )}
                
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem', marginTop: '1rem' }}>
                    <button type="button" onClick={calculateFare} className="btn btn-secondary">
                        Estimate Fare
                    </button>
                    {fare > 0 && <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--secondary)' }}>₹{fare}</span>}
                </div>
                
                <button 
                    type="submit" 
                    disabled={fare === 0 || !pickupValid || !dropValid} 
                    className="btn btn-primary" 
                    style={{ width: '100%', opacity: (fare === 0 || !pickupValid || !dropValid) ? 0.5 : 1 }}
                >
                    Confirm Booking
                </button>
            </form>
        </div>
    );
};

export default BookingForm;
