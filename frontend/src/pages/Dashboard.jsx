// Dashboard with Universal Sidebar for User/Driver/Admin
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BookingForm from '../components/BookingForm';
import api from '../api/axios';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [rides, setRides] = useState([]);
    const [stats, setStats] = useState({});
    const [availableDrivers, setAvailableDrivers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [selectedDriver, setSelectedDriver] = useState({});
    
    // Universal State for tabs
    const [activeTab, setActiveTab] = useState('dashboard');
    const [newDriver, setNewDriver] = useState({ name: '', email: '', password: '', phone: '', vehicle: '' });
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    // Admin: Locations & Fare Config state
    const [locations, setLocations] = useState([]);
    const [fareConfig, setFareConfig] = useState({ baseFare: 30, perKmRate: 12, minimumFare: 50 });
    const [newLocation, setNewLocation] = useState({ name: '', lat: '', lng: '' });
    const [createRideForm, setCreateRideForm] = useState({ userId: '', pickup: '', drop: '', fare: 0 });
    
    // Admin: Location search state (for Nominatim)
    const [locationSearch, setLocationSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (!user) return;
        fetchData();
        if (user.role === 'user' || user.role === 'driver') {
            fetchStats();
        }
    }, [user, activeTab]);

    const fetchData = async () => {
        if (!user) return;
        try {
            if (user.role === 'driver') {
                if (activeTab === 'dashboard') {
                    const { data } = await api.get('/rides/pending');
                    setRides(data);
                } else if (activeTab === 'history') {
                    const { data } = await api.get('/rides/my-rides');
                    setRides(data);
                }
            } else if (user.role === 'user') {
                const { data } = await api.get('/rides/my-rides');
                setRides(data);
            } else if (user.role === 'admin') {
                const ridesRes = await api.get('/admin/rides');
                setRides(ridesRes.data);

                const usersRes = await api.get('/admin/users');
                const driversRes = await api.get('/admin/drivers');
                setAllUsers(usersRes.data);
                setStats({
                    users: usersRes.data.length,
                    drivers: driversRes.data.length
                });
                setAvailableDrivers(driversRes.data);
                
                // Fetch fare config for admin
                try {
                    const fareRes = await api.get('/admin/fare-config');
                    setFareConfig(fareRes.data);
                } catch (err) {
                    console.log('Error fetching fare config');
                }
            }
        } catch (error) {
            console.error("Error fetching data", error);
        }
    };

    const fetchStats = async () => {
        try {
            const { data } = await api.get('/rides/stats');
            setStats(data);
        } catch (error) {
            console.error("Error fetching stats", error);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };
    
    const handleRideBooked = (newRide) => {
        setRides([newRide, ...rides]);
    };

    const handleAcceptRide = async (rideId) => {
        try {
            await api.put(`/rides/${rideId}/accept`);
            alert('Ride Accepted!');
            fetchData();
        } catch (error) {
            alert('Failed to accept ride');
        }
    };

    const handlePaymentUpdate = async (rideId, status) => {
        try {
            await api.put(`/admin/rides/${rideId}/payment`, { paymentStatus: status });
            alert(`Payment ${status}!`);
            fetchData();
        } catch (error) {
            console.error(error);
            alert('Failed to update payment status');
        }
    };

    const handleAssignDriver = async (rideId) => {
        const driverId = selectedDriver[rideId];
        if (!driverId) return alert('Select a driver first');

        try {
            await api.put(`/admin/rides/${rideId}/assign`, { driverId });
            alert('Driver Assigned!');
            fetchData();
        } catch (error) {
            console.error(error);
            alert('Failed to assign driver');
        }
    };

    const handleCollectPayment = async (rideId) => {
        try {
            await api.put(`/rides/${rideId}/collect-payment`);
            alert('Payment Collected!');
            fetchData();
            fetchStats();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to collect payment');
        }
    };

    // Admin function to update ride status
    const handleRideStatusUpdate = async (rideId, newStatus) => {
        try {
            await api.put(`/rides/${rideId}/status`, { status: newStatus });
            alert(`Ride status updated to ${newStatus}!`);
            fetchData();
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.message || 'Failed to update ride status');
        }
    };

    const handleCreateDriver = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/drivers', newDriver);
            alert('Driver Created!');
            setNewDriver({ name: '', email: '', password: '', phone: '', vehicle: '' });
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to create driver');
        }
    };

    const handleDeleteDriver = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            await api.delete(`/admin/drivers/${id}`);
            alert('Driver Deleted');
            fetchData();
        } catch (error) {
            alert('Failed to delete driver');
        }
    };

    const handleApproveDriver = async (id) => {
        try {
            const response = await api.put(`/admin/drivers/${id}/approve`);
            console.log('Approve response:', response.data);
            alert('Driver Approved!');
            
            // Update local state immediately
            setAvailableDrivers(prevDrivers => 
                prevDrivers.map(d => 
                    d._id === id ? { ...d, status: 'approved' } : d
                )
            );
        } catch (error) {
            console.error('Error approving driver:', error);
            alert('Failed to approve driver');
        }
    };

    const handleSuspendDriver = async (id) => {
        try {
            await api.put(`/admin/drivers/${id}/suspend`);
            alert('Driver Suspended');
            
            // Update local state immediately
            setAvailableDrivers(prevDrivers => 
                prevDrivers.map(d => 
                    d._id === id ? { ...d, status: 'suspended' } : d
                )
            );
        } catch (error) {
            console.error('Error suspending driver:', error);
            alert('Failed to suspend driver');
        }
    };

    // Sidebar Navigation Component
    const Sidebar = ({ role }) => {
        let tabs = [];
        
        if (role === 'user') {
            tabs = [
                { id: 'dashboard', label: 'Book Ride' },
                { id: 'history', label: 'Ride History' },
                { id: 'profile', label: 'Profile' }
            ];
        } else if (role === 'driver') {
            tabs = [
                { id: 'dashboard', label: 'Assigned Rides' },
                { id: 'stats', label: 'Earnings' },
                { id: 'history', label: 'History' },
                { id: 'profile', label: 'Profile' }
            ];
        } else if (role === 'admin') {
            tabs = [
                { id: 'dashboard', label: '📊 Dashboard' },
                { id: 'new-rides', label: '🚗 New Ride Requests' },
                { id: 'create-ride', label: '➕ Create Ride' },
                { id: 'fare-settings', label: '💵 Fare Settings' },
                { id: 'payments', label: '💰 Payments' },
                { id: 'drivers', label: '👷 Drivers' },
                { id: 'users', label: '👥 Users' },
                { id: 'reports', label: '📈 Reports' },
                { id: 'profile', label: '👤 Profile' }
            ];
        }

        const handleTabClick = (tabId) => {
            setActiveTab(tabId);
            setIsSidebarOpen(false); // Close sidebar on mobile after selection
        };

        return (
            <>
                {/* Mobile Overlay */}
                {isSidebarOpen && (
                    <div 
                        onClick={() => setIsSidebarOpen(false)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.5)',
                            zIndex: 998,
                            display: 'none'
                        }}
                        className="mobile-overlay"
                    />
                )}
                
                {/* Sidebar */}
                <div 
                    style={{ 
                        width: '250px', 
                        background: 'var(--bg-card)', 
                        borderRight: '1px solid var(--border)', 
                        padding: '2rem', 
                        minHeight: '100vh',
                        position: 'relative',
                        zIndex: 999
                    }}
                    className={`sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`}
                >
                    <h2 style={{ marginBottom: '2rem', color: 'var(--primary)' }}>{role.charAt(0).toUpperCase() + role.slice(1)} Panel</h2>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {tabs.map(tab => (
                            <li key={tab.id} style={{ marginBottom: '1rem' }}>
                                <button 
                                    onClick={() => handleTabClick(tab.id)} 
                                    style={{ 
                                        background: activeTab === tab.id ? 'var(--primary-light)' : 'transparent', 
                                        color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-light)',
                                        border: 'none', width: '100%', textAlign: 'left', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '500'
                                    }}
                                >
                                    {tab.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                    <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
                        <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%' }}>Logout</button>
                    </div>
                </div>
            </>
        );
    };

    // User Dashboard Content
    const renderUserContent = () => {
        // Helper functions
        const formatTimeAgo = (dateStr) => {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);
            
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        };
        
        const getStatusBadge = (status) => {
            const colors = {
                'pending': { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', label: 'Pending' },
                'assigned': { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', label: 'Driver Assigned' },
                'accepted': { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6', label: 'Driver Coming' },
                'ongoing': { bg: 'rgba(14, 165, 233, 0.15)', text: '#0ea5e9', label: 'In Progress' },
                'completed': { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', label: 'Completed' },
                'cancelled': { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', label: 'Cancelled' }
            };
            return colors[status] || { bg: 'rgba(107, 114, 128, 0.15)', text: '#6b7280', label: status };
        };
        
        // Get active rides (not completed or cancelled)
        const activeRides = rides.filter(r => !['completed', 'cancelled'].includes(r.status));
        const completedRides = rides.filter(r => r.status === 'completed');
        
        if (activeTab === 'dashboard') {
            return (
                <>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <div>
                            <h1 style={{ marginBottom: '0.25rem' }}>👋 Welcome, {user?.name?.split(' ')[0] || 'User'}!</h1>
                            <p className="text-muted">Book a ride and travel comfortably.</p>
                        </div>
                    </div>
                    
                    {/* Quick Stats Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--secondary)' }}>
                            <p className="text-muted" style={{ fontSize: '0.8rem' }}>Total Spent</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--secondary)' }}>₹{stats.totalSpent || 0}</p>
                        </div>
                        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--primary)' }}>
                            <p className="text-muted" style={{ fontSize: '0.8rem' }}>Total Rides</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{stats.totalRides || 0}</p>
                        </div>
                        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #f59e0b' }}>
                            <p className="text-muted" style={{ fontSize: '0.8rem' }}>Pending Payments</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>{stats.pendingPayments || 0}</p>
                        </div>
                    </div>
                    
                    {/* Active Rides Section - Show first if there are active rides */}
                    {activeRides.length > 0 && (
                        <div style={{ marginBottom: '2rem' }}>
                            <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                🚗 Your Active Rides
                                <span style={{ 
                                    padding: '0.25rem 0.75rem',
                                    background: 'rgba(59, 130, 246, 0.15)',
                                    color: '#3b82f6',
                                    borderRadius: '20px',
                                    fontSize: '0.9rem'
                                }}>{activeRides.length}</span>
                            </h2>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {activeRides.map(ride => {
                                    const statusBadge = getStatusBadge(ride.status);
                                    return (
                                        <div key={ride._id} className="card" style={{ 
                                            padding: '1.5rem',
                                            borderLeft: `4px solid ${statusBadge.text}`,
                                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.02), transparent)'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                                <div>
                                                    <span style={{ 
                                                        padding: '0.25rem 0.75rem', 
                                                        borderRadius: '20px', 
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        background: statusBadge.bg,
                                                        color: statusBadge.text
                                                    }}>
                                                        {statusBadge.label}
                                                    </span>
                                                    <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                                                        🕐 Booked {formatTimeAgo(ride.createdAt)}
                                                    </p>
                                                </div>
                                                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--secondary)' }}>₹{ride.fare}</p>
                                            </div>
                                            
                                            <div style={{ 
                                                background: 'var(--bg-input)', 
                                                borderRadius: '12px', 
                                                padding: '1rem',
                                                marginBottom: '1rem'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981' }}></div>
                                                        <div style={{ width: '2px', height: '25px', background: 'linear-gradient(to bottom, #10B981, #ef4444)' }}></div>
                                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></div>
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                                                            <span className="text-muted">From:</span> <strong>{ride.pickupLocation?.address}</strong>
                                                        </p>
                                                        <p style={{ fontSize: '0.85rem' }}>
                                                            <span className="text-muted">To:</span> <strong>{ride.dropLocation?.address}</strong>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {ride.driver && (
                                                <div style={{ 
                                                    padding: '1rem', 
                                                    background: 'rgba(16, 185, 129, 0.05)',
                                                    borderRadius: '12px',
                                                    border: '1px solid rgba(16, 185, 129, 0.2)',
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '1rem' 
                                                }}>
                                                    <div style={{ 
                                                        width: '45px', 
                                                        height: '45px', 
                                                        borderRadius: '50%', 
                                                        background: 'linear-gradient(135deg, #10B981, #059669)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: '#fff',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {(ride.driver?.name || 'D').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <p style={{ fontWeight: '600' }}>{ride.driver?.name}</p>
                                                        {ride.driver?.phone && (
                                                            <p style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '500' }}>📱 {ride.driver.phone}</p>
                                                        )}
                                                        <p className="text-muted" style={{ fontSize: '0.75rem' }}>Your Driver</p>
                                                    </div>
                                                    {ride.driver?.phone && (
                                                        <a 
                                                            href={`tel:${ride.driver.phone}`}
                                                            className="btn btn-primary"
                                                            style={{ textDecoration: 'none', background: '#10B981' }}
                                                        >
                                                            📞 Call Driver
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                            
                                            {!ride.driver && (
                                                <div style={{ 
                                                    padding: '1rem', 
                                                    background: 'rgba(245, 158, 11, 0.05)',
                                                    borderRadius: '12px',
                                                    border: '1px solid rgba(245, 158, 11, 0.2)',
                                                    textAlign: 'center'
                                                }}>
                                                    <p style={{ color: '#f59e0b', fontWeight: '500' }}>
                                                        ⏳ Waiting for driver assignment...
                                                    </p>
                                                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                                                        Admin will assign a driver soon
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Main Content - Booking Form and Recent Rides */}
                    <div style={{ display: 'grid', gridTemplateColumns: completedRides.length > 0 && activeRides.length === 0 ? '1.2fr 0.8fr' : '1fr', gap: '2rem' }}>
                        {/* Booking Form */}
                        <div>
                            <BookingForm onRideBooked={handleRideBooked} />
                        </div>
                        
                        {/* Recent Rides - Show only if no active rides */}
                        {activeRides.length === 0 && completedRides.length > 0 && (
                            <div className="card" style={{ padding: '1.5rem' }}>
                                <h3 style={{ marginBottom: '1rem' }}>📋 Recent Rides</h3>
                                <div style={{ display: 'grid', gap: '0.75rem' }}>
                                    {completedRides.slice(0, 3).map(ride => {
                                        const statusBadge = getStatusBadge(ride.status);
                                        return (
                                            <div key={ride._id} style={{ 
                                                padding: '0.75rem',
                                                background: 'var(--bg-input)',
                                                borderRadius: '10px',
                                                border: '1px solid var(--border)'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <p style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                                                            {ride.dropLocation?.address?.substring(0, 25)}...
                                                        </p>
                                                        <p className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                            {new Date(ride.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                        </p>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ fontWeight: '600', color: 'var(--secondary)' }}>₹{ride.fare}</p>
                                                        <span style={{ 
                                                            padding: '0.15rem 0.5rem', 
                                                            borderRadius: '10px', 
                                                            fontSize: '0.65rem',
                                                            fontWeight: '600',
                                                            background: statusBadge.bg,
                                                            color: statusBadge.text
                                                        }}>
                                                            {statusBadge.label}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <button 
                                    onClick={() => setActiveTab('history')}
                                    style={{ 
                                        width: '100%', 
                                        marginTop: '1rem',
                                        padding: '0.75rem',
                                        background: 'rgba(99, 102, 241, 0.1)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        color: 'var(--primary)',
                                        cursor: 'pointer',
                                        fontWeight: '500'
                                    }}
                                >
                                    View All History →
                                </button>
                            </div>
                        )}
                    </div>
                </>
            );
        } else if (activeTab === 'history') {
            return (
                <>
                    <div style={{ marginBottom: '2rem' }}>
                        <h1 style={{ marginBottom: '0.25rem' }}>📋 Ride History</h1>
                        <p className="text-muted">View all your past rides and bookings.</p>
                    </div>
                    
                    {rides.filter(r => ['completed', 'cancelled'].includes(r.status)).length === 0 ? (
                        <div className="card" style={{ padding: '4rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05))' }}>
                            <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚗</p>
                            <p style={{ fontSize: '1.2rem', fontWeight: '600' }}>No Completed Rides Yet</p>
                            <p className="text-muted" style={{ marginTop: '0.5rem' }}>Your completed rides will appear here.</p>
                            <button 
                                onClick={() => setActiveTab('dashboard')}
                                className="btn btn-primary"
                                style={{ marginTop: '1.5rem' }}
                            >
                                Book a Ride
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {rides.filter(r => ['completed', 'cancelled'].includes(r.status)).map((ride, index) => {
                                const statusBadge = getStatusBadge(ride.status);
                                return (
                                    <div key={ride._id} className="card" style={{ 
                                        padding: '1.25rem',
                                        animation: `fadeIn 0.3s ease ${index * 0.05}s both`
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                                    <span style={{ 
                                                        padding: '0.25rem 0.75rem', 
                                                        borderRadius: '20px', 
                                                        fontSize: '0.7rem',
                                                        fontWeight: '600',
                                                        background: statusBadge.bg,
                                                        color: statusBadge.text
                                                    }}>
                                                        {statusBadge.label}
                                                    </span>
                                                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                                                        {new Date(ride.createdAt).toLocaleDateString('en-IN', { 
                                                            day: 'numeric', 
                                                            month: 'short',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                                <p style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                                                    <span className="text-muted">From:</span> {ride.pickupLocation?.address}
                                                </p>
                                                <p style={{ fontSize: '0.9rem' }}>
                                                    <span className="text-muted">To:</span> {ride.dropLocation?.address}
                                                </p>
                                                {ride.driver && (
                                                    <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: 'var(--primary)' }}>
                                                        🚕 Driver: {ride.driver?.name}
                                                    </p>
                                                )}
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--secondary)' }}>₹{ride.fare}</p>
                                                <p style={{ 
                                                    fontSize: '0.75rem', 
                                                    marginTop: '0.25rem',
                                                    color: ride.paymentStatus === 'approved' ? '#10B981' : '#f59e0b'
                                                }}>
                                                    {ride.paymentStatus === 'approved' ? '✓ Paid' : '⏳ Payment Pending'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    
                    <style>{`
                        @keyframes fadeIn {
                            from { opacity: 0; transform: translateY(5px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                    `}</style>
                </>
            );
        } else if (activeTab === 'profile') {
            return (
                <>
                    <div style={{ marginBottom: '2rem' }}>
                        <h1 style={{ marginBottom: '0.25rem' }}>👤 My Profile</h1>
                        <p className="text-muted">Manage your account information.</p>
                    </div>
                    
                    <div className="card" style={{ padding: '2rem' }}>
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            {/* Profile Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.05))', borderRadius: '16px' }}>
                                <div style={{ 
                                    width: '80px', 
                                    height: '80px', 
                                    borderRadius: '50%', 
                                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontWeight: 'bold',
                                    fontSize: '2rem'
                                }}>
                                    {(user?.name || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>{user?.name}</p>
                                    <p className="text-muted">{user?.email}</p>
                                    <span style={{ 
                                        display: 'inline-block',
                                        marginTop: '0.5rem',
                                        padding: '0.25rem 0.75rem', 
                                        borderRadius: '20px', 
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        background: 'rgba(16, 185, 129, 0.15)',
                                        color: '#10B981'
                                    }}>
                                        ✓ Active Member
                                    </span>
                                </div>
                            </div>
                            
                            {/* Stats */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                <div style={{ padding: '1rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--secondary)' }}>₹{stats.totalSpent || 0}</p>
                                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>Total Spent</p>
                                </div>
                                <div style={{ padding: '1rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{stats.totalRides || 0}</p>
                                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>Rides Taken</p>
                                </div>
                                <div style={{ padding: '1rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10B981' }}>{completedRides.length}</p>
                                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>Completed</p>
                                </div>
                            </div>
                            
                            {/* Profile Details */}
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                <div style={{ padding: '1rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                    <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>📧 Email</p>
                                    <p style={{ fontWeight: '500' }}>{user?.email}</p>
                                </div>
                                <div style={{ padding: '1rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                    <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>📱 Phone</p>
                                    <p style={{ fontWeight: '500' }}>{user?.phone || 'Not set'}</p>
                                </div>
                                <div style={{ padding: '1rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                    <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>📅 Member Since</p>
                                    <p style={{ fontWeight: '500' }}>
                                        {user?.createdAt 
                                            ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                                            : 'N/A'
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <p className="text-muted" style={{ marginTop: '2rem', textAlign: 'center' }}>Profile editing coming soon...</p>
                    </div>
                </>
            );
        }
    };

    

    // Driver Dashboard Content
    const renderDriverContent = () => {
        // Helper function to get status actions
        const getNextStatus = (currentStatus) => {
            const statusFlow = {
                'assigned': { next: 'accepted', label: 'Accept Job', color: '#3b82f6' },
                'accepted': { next: 'ongoing', label: 'Start Ride', color: '#8b5cf6' },
                'ongoing': { next: 'completed', label: 'Complete Ride', color: '#10B981' }
            };
            return statusFlow[currentStatus] || null;
        };
        
        const handleStatusUpdate = async (rideId, newStatus) => {
            try {
                if (newStatus === 'accepted') {
                    await api.put(`/rides/${rideId}/accept`);
                } else {
                    await api.put(`/rides/${rideId}/status`, { status: newStatus });
                }
                alert(`Ride status updated to ${newStatus}!`);
                fetchData();
                fetchStats();
            } catch (error) {
                alert(error.response?.data?.message || 'Failed to update status');
            }
        };
        
        const formatTimeAgo = (dateStr) => {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        };
        
        const getStatusBadge = (status) => {
            const colors = {
                'assigned': { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', label: 'Assigned' },
                'accepted': { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6', label: 'Accepted' },
                'ongoing': { bg: 'rgba(14, 165, 233, 0.15)', text: '#0ea5e9', label: 'Ongoing' },
                'completed': { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', label: 'Completed' },
                'cancelled': { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', label: 'Cancelled' },
                'pending': { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', label: 'Pending' }
            };
            return colors[status] || { bg: 'rgba(107, 114, 128, 0.15)', text: '#6b7280', label: status };
        };
        
        // Account status banner component
        const AccountStatusBanner = () => {
            const accountStatus = user?.status || 'pending';
            
            const statusConfig = {
                'approved': {
                    bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 182, 212, 0.1))',
                    border: '#10B981',
                    icon: '✅',
                    title: 'Account Approved',
                    message: 'Your account is active. You can receive and complete rides.',
                    color: '#10B981'
                },
                'pending': {
                    bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(249, 115, 22, 0.1))',
                    border: '#f59e0b',
                    icon: '⏳',
                    title: 'Account Pending Approval',
                    message: 'Your account is awaiting admin approval. You cannot receive rides yet.',
                    color: '#f59e0b'
                },
                'suspended': {
                    bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1))',
                    border: '#ef4444',
                    icon: '⚠️',
                    title: 'Account Suspended',
                    message: 'Your account has been suspended. Please contact admin for more information.',
                    color: '#ef4444'
                }
            };
            
            const config = statusConfig[accountStatus] || statusConfig['pending'];
            
            return (
                <div style={{
                    background: config.bg,
                    borderLeft: `4px solid ${config.border}`,
                    borderRadius: '12px',
                    padding: '1rem 1.25rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <span style={{ fontSize: '1.5rem' }}>{config.icon}</span>
                    <div>
                        <p style={{ fontWeight: '600', color: config.color, marginBottom: '0.25rem' }}>
                            {config.title}
                        </p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {config.message}
                        </p>
                    </div>
                </div>
            );
        };
        
        if (activeTab === 'dashboard') {
            // Filter active rides (assigned, accepted, ongoing)
            const activeRides = rides.filter(r => ['assigned', 'accepted', 'ongoing'].includes(r.status));
            const accountStatus = user?.status || 'pending';
            
            return (
                <>
                    {/* Account Status Banner */}
                    <AccountStatusBanner />
                    
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <div>
                            <h1 style={{ marginBottom: '0.25rem' }}>🚕 Driver Dashboard</h1>
                            <p className="text-muted">Manage your assigned rides and track your earnings.</p>
                        </div>
                        {activeRides.length > 0 && (
                            <div style={{ 
                                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
                                padding: '0.75rem 1.5rem', 
                                borderRadius: '12px',
                                textAlign: 'center'
                            }}>
                                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>{activeRides.length}</p>
                                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)' }}>Active Rides</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Quick Stats Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--primary)' }}>
                            <p className="text-muted" style={{ fontSize: '0.8rem' }}>Today's Earnings</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>₹{stats.todayEarnings || 0}</p>
                        </div>
                        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #10B981' }}>
                            <p className="text-muted" style={{ fontSize: '0.8rem' }}>Total Earned</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10B981' }}>₹{stats.totalEarned || 0}</p>
                        </div>
                        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #f59e0b' }}>
                            <p className="text-muted" style={{ fontSize: '0.8rem' }}>Pending Cash</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>{stats.pendingPayments || 0}</p>
                        </div>
                    </div>

                    
                    
                    {/* Active Rides */}
                    <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🚗 Active Rides
                    </h2>
                    
                    {activeRides.length === 0 ? (
                        <div className="card" style={{ padding: '4rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(139, 92, 246, 0.05))' }}>
                            <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚗</p>
                            <p style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--primary)' }}>No Active Rides</p>
                            <p className="text-muted" style={{ marginTop: '0.5rem' }}>When admin assigns you a ride, it will appear here.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            {activeRides.map((ride, index) => {
                                const nextAction = getNextStatus(ride.status);
                                const statusBadge = getStatusBadge(ride.status);
                                
                                return (
                                    <div key={ride._id} className="card" style={{ 
                                        padding: '1.5rem', 
                                        borderLeft: `4px solid ${statusBadge.text}`,
                                        animation: `fadeIn 0.3s ease ${index * 0.1}s both`
                                    }}>
                                        {/* Header */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                                    <div style={{ 
                                                        width: '45px', 
                                                        height: '45px', 
                                                        borderRadius: '50%', 
                                                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: '#fff',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {(ride.user?.name || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{ride.user?.name || 'Customer'}</p>
                                                        {ride.user?.phone && (
                                                            <a 
                                                                href={`tel:${ride.user.phone}`}
                                                                style={{ color: '#10B981', textDecoration: 'none', fontSize: '0.9rem' }}
                                                            >
                                                                📞 {ride.user.phone}
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                                                    🕐 Booked {formatTimeAgo(ride.createdAt)}
                                                </p>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--secondary)' }}>₹{ride.fare}</p>
                                                <span style={{ 
                                                    padding: '0.25rem 0.75rem', 
                                                    borderRadius: '20px', 
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    background: statusBadge.bg,
                                                    color: statusBadge.text
                                                }}>
                                                    {statusBadge.label}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* Route */}
                                        <div style={{ 
                                            background: 'rgba(99, 102, 241, 0.05)', 
                                            borderRadius: '12px', 
                                            padding: '1rem',
                                            marginBottom: '1rem'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10B981' }}></div>
                                                    <div style={{ width: '2px', height: '30px', background: 'linear-gradient(to bottom, #10B981, #ef4444)' }}></div>
                                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }}></div>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                                                        <span className="text-muted">Pickup:</span><br/>
                                                        <strong>{ride.pickupLocation?.address}</strong>
                                                    </p>
                                                    <p style={{ fontSize: '0.9rem' }}>
                                                        <span className="text-muted">Drop:</span><br/>
                                                        <strong>{ride.dropLocation?.address}</strong>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Actions */}
                                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                            {ride.user?.phone && (
                                                <a 
                                                    href={`tel:${ride.user.phone}`}
                                                    className="btn btn-secondary"
                                                    style={{ textDecoration: 'none' }}
                                                >
                                                    📞 Call Customer
                                                </a>
                                            )}
                                            
                                            {/* Status Dropdown for Driver */}
                                            <select 
                                                value={ride.status}
                                                onChange={(e) => handleStatusUpdate(ride._id, e.target.value)}
                                                style={{ 
                                                    padding: '0.5rem 0.75rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border)',
                                                    background: 'var(--bg-input)',
                                                    color: 'inherit',
                                                    fontSize: '0.85rem',
                                                    cursor: 'pointer',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                <option value="assigned">📋 Assigned</option>
                                                <option value="accepted">✓ Accepted</option>
                                                <option value="ongoing">🚗 In Progress</option>
                                                <option value="completed">✅ Completed</option>
                                                <option value="cancelled">❌ Cancelled</option>
                                            </select>
                                            
                                            {nextAction && (
                                                <button 
                                                    onClick={() => handleStatusUpdate(ride._id, nextAction.next)}
                                                    className="btn btn-primary"
                                                    style={{ background: nextAction.color }}
                                                >
                                                    {nextAction.label}
                                                </button>
                                            )}
                                            
                                            {ride.status === 'completed' && ride.paymentStatus === 'pending' && (
                                                <button 
                                                    onClick={() => handleCollectPayment(ride._id)}
                                                    className="btn btn-primary"
                                                    style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
                                                >
                                                    💵 Collect Cash
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    
                    <style>{`
                        @keyframes fadeIn {
                            from { opacity: 0; transform: translateY(10px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                    `}</style>
                </>
            );
        } else if (activeTab === 'stats') {
            return (
                <>
                    <div style={{ marginBottom: '2rem' }}>
                        <h1 style={{ marginBottom: '0.25rem' }}>💰 Earnings Dashboard</h1>
                        <p className="text-muted">Track your earnings and performance.</p>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                        <div className="card" style={{ 
                            padding: '1.5rem',
                            borderLeft: '4px solid var(--primary)',
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), transparent)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Today's Earnings</p>
                                    <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>₹{stats.todayEarnings || 0}</p>
                                </div>
                                <span style={{ fontSize: '2rem' }}>📅</span>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                {stats.todayRides || 0} rides completed
                            </p>
                        </div>
                        
                        <div className="card" style={{ 
                            padding: '1.5rem',
                            borderLeft: '4px solid var(--secondary)',
                            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05), transparent)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <p className="text-muted" style={{ marginBottom: '0.5rem' }}>This Month</p>
                                    <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--secondary)' }}>₹{stats.monthEarnings || 0}</p>
                                </div>
                                <span style={{ fontSize: '2rem' }}>📊</span>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                {stats.monthRides || 0} rides completed
                            </p>
                        </div>
                        
                        <div className="card" style={{ 
                            padding: '1.5rem',
                            borderLeft: '4px solid #10B981',
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), transparent)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Total Earnings</p>
                                    <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10B981' }}>₹{stats.totalEarned || 0}</p>
                                </div>
                                <span style={{ fontSize: '2rem' }}>💰</span>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                {stats.totalRides || 0} total rides
                            </p>
                        </div>
                        
                        <div className="card" style={{ 
                            padding: '1.5rem',
                            borderLeft: '4px solid #f59e0b',
                            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), transparent)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Pending Collection</p>
                                    <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f59e0b' }}>{stats.pendingPayments || 0}</p>
                                </div>
                                <span style={{ fontSize: '2rem' }}>💵</span>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                Completed rides awaiting payment
                            </p>
                        </div>
                    </div>
                </>
            );
        } else if (activeTab === 'history') {
            return (
                <>
                    <div style={{ marginBottom: '2rem' }}>
                        <h1 style={{ marginBottom: '0.25rem' }}>📋 Ride History</h1>
                        <p className="text-muted">View all your past rides.</p>
                    </div>
                    
                    {rides.length === 0 ? (
                        <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
                            <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</p>
                            <p style={{ fontSize: '1.2rem', fontWeight: '600' }}>No Ride History</p>
                            <p className="text-muted" style={{ marginTop: '0.5rem' }}>Your completed rides will appear here.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {rides.map((ride, index) => {
                                const statusBadge = getStatusBadge(ride.status);
                                return (
                                    <div key={ride._id} className="card" style={{ 
                                        padding: '1.25rem',
                                        animation: `fadeIn 0.3s ease ${index * 0.05}s both`
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ 
                                                    width: '40px', 
                                                    height: '40px', 
                                                    borderRadius: '50%', 
                                                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#fff',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {(ride.user?.name || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p style={{ fontWeight: '600' }}>{ride.user?.name || 'Customer'}</p>
                                                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                                                        {ride.pickupLocation?.address?.substring(0, 30)}...
                                                    </p>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ textAlign: 'right' }}>
                                                    <p style={{ fontWeight: 'bold', color: 'var(--secondary)' }}>₹{ride.fare}</p>
                                                    <p className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                        {new Date(ride.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                    </p>
                                                </div>
                                                <span style={{ 
                                                    padding: '0.25rem 0.75rem', 
                                                    borderRadius: '15px', 
                                                    fontSize: '0.7rem',
                                                    fontWeight: '600',
                                                    background: statusBadge.bg,
                                                    color: statusBadge.text
                                                }}>
                                                    {statusBadge.label}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {ride.status === 'completed' && ride.paymentStatus === 'pending' && (
                                            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                                <button 
                                                    onClick={() => handleCollectPayment(ride._id)}
                                                    className="btn btn-primary"
                                                    style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
                                                >
                                                    💵 Collect Cash Payment
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    
                    <style>{`
                        @keyframes fadeIn {
                            from { opacity: 0; transform: translateY(5px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                    `}</style>
                </>
            );
        } else if (activeTab === 'profile') {
            const accountStatus = user?.status || 'pending';
            const statusStyles = {
                'approved': { bg: 'rgba(16, 185, 129, 0.15)', color: '#10B981', label: 'Approved', icon: '✅' },
                'pending': { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', label: 'Pending Approval', icon: '⏳' },
                'suspended': { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', label: 'Suspended', icon: '⚠️' }
            };
            const statusStyle = statusStyles[accountStatus] || statusStyles['pending'];
            
            return (
                <>
                    {/* Account Status Banner */}
                    <AccountStatusBanner />
                    
                    <div className="card" style={{ padding: '2rem' }}>
                        <h1 style={{ marginBottom: '1.5rem' }}>👤 Driver Profile</h1>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px' }}>
                                <div style={{ 
                                    width: '60px', 
                                    height: '60px', 
                                    borderRadius: '50%', 
                                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontWeight: 'bold',
                                    fontSize: '1.5rem'
                                }}>
                                    {(user?.name || 'D').charAt(0).toUpperCase()}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{user?.name}</p>
                                    <p className="text-muted">{user?.email}</p>
                                </div>
                                <span style={{ 
                                    padding: '0.5rem 1rem', 
                                    borderRadius: '20px', 
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    background: statusStyle.bg,
                                    color: statusStyle.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    {statusStyle.icon} {statusStyle.label}
                                </span>
                            </div>
                            
                            {/* Account Status Card */}
                            <div style={{ 
                                padding: '1rem', 
                                background: statusStyle.bg, 
                                borderRadius: '12px', 
                                border: `1px solid ${statusStyle.color}30`
                            }}>
                                <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>Account Status</p>
                                <p style={{ fontWeight: '600', color: statusStyle.color, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {statusStyle.icon} {statusStyle.label}
                                </p>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                    {accountStatus === 'approved' && 'Your account is active and you can receive rides.'}
                                    {accountStatus === 'pending' && 'Your account is awaiting admin approval.'}
                                    {accountStatus === 'suspended' && 'Your account has been suspended. Contact admin.'}
                                </p>
                            </div>
                            
                            <div style={{ padding: '1rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>Phone</p>
                                <p style={{ fontWeight: '500' }}>{user?.phone || 'Not set'}</p>
                            </div>
                            <div style={{ padding: '1rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>Role</p>
                                <p style={{ fontWeight: '500', textTransform: 'capitalize' }}>{user?.role}</p>
                            </div>
                            {user?.vehicle && (
                                <div style={{ padding: '1rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                    <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>Vehicle</p>
                                    <p style={{ fontWeight: '500' }}>
                                        {typeof user.vehicle === 'object' 
                                            ? `${user.vehicle.model || ''} ${user.vehicle.plateNumber ? `(${user.vehicle.plateNumber})` : ''}`.trim() || 'Not set'
                                            : user.vehicle
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                        <p className="text-muted" style={{ marginTop: '1.5rem' }}>Profile editing coming soon...</p>
                    </div>
                </>
            );
        }
    };

    // Admin Dashboard Content (existing)
    const renderAdminContent = () => {
        if (activeTab === 'dashboard') {
            // Calculate stats
            const pendingRides = rides.filter(r => r.status === 'pending');
            const assignedRides = rides.filter(r => r.status === 'assigned' || r.status === 'accepted' || r.status === 'ongoing');
            const completedRides = rides.filter(r => r.status === 'completed');
            const totalRevenue = rides.reduce((sum, r) => sum + (r.fare || 0), 0);
            const collectedRevenue = rides.filter(r => r.paymentStatus === 'approved').reduce((sum, r) => sum + (r.fare || 0), 0);
            const approvedDrivers = availableDrivers.filter(d => d.status === 'approved');
            
            // Get recent rides (last 5)
            const recentRides = rides.slice(0, 5);
            
            const getStatusColor = (status) => {
                const colors = {
                    'pending': { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
                    'assigned': { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' },
                    'accepted': { bg: 'rgba(99, 102, 241, 0.15)', text: '#6366f1' },
                    'ongoing': { bg: 'rgba(14, 165, 233, 0.15)', text: '#0ea5e9' },
                    'completed': { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981' },
                    'cancelled': { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' }
                };
                return colors[status] || { bg: 'rgba(107, 114, 128, 0.15)', text: '#6b7280' };
            };
            
            const formatTimeAgo = (dateStr) => {
                const date = new Date(dateStr);
                const now = new Date();
                const diffMs = now - date;
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMins / 60);
                const diffDays = Math.floor(diffHours / 24);
                
                if (diffMins < 1) return 'Just now';
                if (diffMins < 60) return `${diffMins}m ago`;
                if (diffHours < 24) return `${diffHours}h ago`;
                if (diffDays < 7) return `${diffDays}d ago`;
                return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            };
            
            return (
                <>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <div>
                            <h1 style={{ marginBottom: '0.25rem' }}>📊 Dashboard Overview</h1>
                            <p className="text-muted">Welcome back! Here's what's happening today.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button 
                                onClick={() => setActiveTab('new-rides')} 
                                className="btn btn-primary"
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.5rem',
                                    background: pendingRides.length > 0 ? 'linear-gradient(135deg, #ef4444, #f97316)' : undefined
                                }}
                            >
                                🚗 New Requests {pendingRides.length > 0 && `(${pendingRides.length})`}
                            </button>
                        </div>
                    </div>
                    
                    {/* Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                        {/* Pending Rides */}
                        <div className="card" style={{ 
                            padding: '1.25rem',
                            borderLeft: '4px solid #f59e0b',
                            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), transparent)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Pending Rides</p>
                                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>{pendingRides.length}</p>
                                </div>
                                <span style={{ fontSize: '1.5rem' }}>⏳</span>
                            </div>
                            {pendingRides.length > 0 && (
                                <p style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.5rem' }}>
                                    Needs attention!
                                </p>
                            )}
                        </div>
                        
                        {/* Active Rides */}
                        <div className="card" style={{ 
                            padding: '1.25rem',
                            borderLeft: '4px solid #3b82f6',
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), transparent)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Active Rides</p>
                                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>{assignedRides.length}</p>
                                </div>
                                <span style={{ fontSize: '1.5rem' }}>🚗</span>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                In progress
                            </p>
                        </div>
                        
                        {/* Completed */}
                        <div className="card" style={{ 
                            padding: '1.25rem',
                            borderLeft: '4px solid #10B981',
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), transparent)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Completed</p>
                                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10B981' }}>{completedRides.length}</p>
                                </div>
                                <span style={{ fontSize: '1.5rem' }}>✅</span>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                Total completed
                            </p>
                        </div>
                        
                        {/* Revenue */}
                        <div className="card" style={{ 
                            padding: '1.25rem',
                            borderLeft: '4px solid var(--secondary)',
                            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05), transparent)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Total Revenue</p>
                                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--secondary)' }}>₹{totalRevenue.toLocaleString()}</p>
                                </div>
                                <span style={{ fontSize: '1.5rem' }}>💰</span>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: '#10B981', marginTop: '0.5rem' }}>
                                ₹{collectedRevenue.toLocaleString()} collected
                            </p>
                        </div>
                        
                        {/* Users */}
                        <div className="card" style={{ 
                            padding: '1.25rem',
                            borderLeft: '4px solid #8b5cf6',
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05), transparent)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Total Users</p>
                                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#8b5cf6' }}>{stats.users || 0}</p>
                                </div>
                                <span style={{ fontSize: '1.5rem' }}>👥</span>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                Registered customers
                            </p>
                        </div>
                        
                        {/* Drivers */}
                        <div className="card" style={{ 
                            padding: '1.25rem',
                            borderLeft: '4px solid #06b6d4',
                            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.05), transparent)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Active Drivers</p>
                                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#06b6d4' }}>{approvedDrivers.length}</p>
                                </div>
                                <span style={{ fontSize: '1.5rem' }}>🚕</span>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                {stats.drivers || 0} total drivers
                            </p>
                        </div>
                    </div>
                    
                    {/* Quick Actions & Recent Rides */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
                        {/* Quick Actions */}
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                ⚡ Quick Actions
                            </h3>
                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                <button 
                                    onClick={() => setActiveTab('new-rides')}
                                    style={{
                                        padding: '0.85rem 1rem',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        background: 'rgba(245, 158, 11, 0.1)',
                                        color: '#f59e0b',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        fontWeight: '500',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <span>🚗 View Pending Rides</span>
                                    <span style={{ 
                                        background: '#f59e0b', 
                                        color: '#fff', 
                                        padding: '0.15rem 0.5rem', 
                                        borderRadius: '12px',
                                        fontSize: '0.75rem'
                                    }}>{pendingRides.length}</span>
                                </button>
                                
                                <button 
                                    onClick={() => setActiveTab('payments')}
                                    style={{
                                        padding: '0.85rem 1rem',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        background: 'rgba(16, 185, 129, 0.1)',
                                        color: '#10B981',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        fontWeight: '500',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <span>💰 Manage Payments</span>
                                    <span>→</span>
                                </button>
                                
                                <button 
                                    onClick={() => setActiveTab('drivers')}
                                    style={{
                                        padding: '0.85rem 1rem',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        background: 'rgba(99, 102, 241, 0.1)',
                                        color: 'var(--primary)',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        fontWeight: '500',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <span>👷 Add New Driver</span>
                                    <span>+</span>
                                </button>
                                
                                <button 
                                    onClick={() => setActiveTab('reports')}
                                    style={{
                                        padding: '0.85rem 1rem',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        background: 'rgba(139, 92, 246, 0.1)',
                                        color: '#8b5cf6',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        fontWeight: '500',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <span>📈 View Reports</span>
                                    <span>→</span>
                                </button>
                            </div>
                        </div>
                        
                        {/* Recent Rides */}
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    📋 Recent Activity
                                </h3>
                                <button 
                                    onClick={() => setActiveTab('reports')}
                                    className="text-muted"
                                    style={{ 
                                        background: 'none', 
                                        border: 'none', 
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        color: 'var(--primary)'
                                    }}
                                >
                                    View All →
                                </button>
                            </div>
                            
                            {recentRides.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center' }}>
                                    <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚗</p>
                                    <p className="text-muted">No rides yet. They'll appear here!</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gap: '0.75rem' }}>
                                    {recentRides.map((ride, index) => (
                                        <div 
                                            key={ride._id} 
                                            style={{ 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                alignItems: 'center',
                                                padding: '0.85rem',
                                                background: 'rgba(255, 255, 255, 0.02)',
                                                borderRadius: '10px',
                                                border: '1px solid var(--border)',
                                                animation: `fadeIn 0.3s ease ${index * 0.05}s both`
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ 
                                                    width: '38px', 
                                                    height: '38px', 
                                                    borderRadius: '50%', 
                                                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#fff',
                                                    fontWeight: 'bold',
                                                    fontSize: '0.9rem'
                                                }}>
                                                    {(ride.user?.name || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p style={{ fontWeight: '500', fontSize: '0.9rem' }}>
                                                        {ride.user?.name || 'User'}
                                                    </p>
                                                    <p className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                        {ride.pickupLocation?.address?.substring(0, 25)}... → {ride.dropLocation?.address?.substring(0, 20)}...
                                                    </p>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ textAlign: 'right' }}>
                                                    <p style={{ fontWeight: '600', color: 'var(--secondary)' }}>₹{ride.fare}</p>
                                                    <p className="text-muted" style={{ fontSize: '0.7rem' }}>{formatTimeAgo(ride.createdAt)}</p>
                                                </div>
                                                <span style={{ 
                                                    padding: '0.25rem 0.6rem', 
                                                    borderRadius: '15px', 
                                                    fontSize: '0.65rem',
                                                    fontWeight: '600',
                                                    background: getStatusColor(ride.status).bg,
                                                    color: getStatusColor(ride.status).text,
                                                    textTransform: 'capitalize'
                                                }}>
                                                    {ride.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <style>{`
                        @keyframes fadeIn {
                            from { opacity: 0; transform: translateY(5px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                    `}</style>
                </>
            );
        } else if (activeTab === 'drivers') {
            return (
                <>
                    <h1 style={{ marginBottom: '2rem' }}>Manage Drivers</h1>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <div>
                            <h3>Create New Driver</h3>
                            <form onSubmit={handleCreateDriver} className="card">
                                <div className="form-group">
                                    <label>Name</label>
                                    <input type="text" required value={newDriver.name} onChange={e => setNewDriver({...newDriver, name: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input type="email" required value={newDriver.email} onChange={e => setNewDriver({...newDriver, email: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Password</label>
                                    <input type="password" required value={newDriver.password} onChange={e => setNewDriver({...newDriver, password: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Phone</label>
                                    <input type="text" required value={newDriver.phone} onChange={e => setNewDriver({...newDriver, phone: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Vehicle Details</label>
                                    <input type="text" required value={newDriver.vehicle} onChange={e => setNewDriver({...newDriver, vehicle: e.target.value})} />
                                </div>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Create Driver</button>
                            </form>
                        </div>

                        <div>
                            <h3>Existing Drivers</h3>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {availableDrivers.map(driver => (
                                    <div key={driver._id} className="card" style={{ padding: '1rem', marginBottom: '0.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <div>
                                                <p style={{ fontWeight: 'bold' }}>{driver.name}</p>
                                                <p className="text-muted" style={{ fontSize: '0.8rem' }}>{driver.email} | {driver.phone}</p>
                                            </div>
                                            <span style={{ 
                                                padding: '0.25rem 0.75rem', 
                                                borderRadius: '20px', 
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                background: driver.status === 'approved' ? 'rgba(16, 185, 129, 0.2)' : driver.status === 'suspended' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                                color: driver.status === 'approved' ? '#10B981' : driver.status === 'suspended' ? '#ef4444' : '#f59e0b'
                                            }}>
                                                {driver.status || 'pending'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {driver.status !== 'approved' && (
                                                <button onClick={() => handleApproveDriver(driver._id)} className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: '#10B981' }}>
                                                    ✓ Approve
                                                </button>
                                            )}
                                            {driver.status !== 'suspended' && (
                                                <button onClick={() => handleSuspendDriver(driver._id)} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: '#f59e0b' }}>
                                                    ⏸ Suspend
                                                </button>
                                            )}
                                            <button onClick={() => handleDeleteDriver(driver._id)} className="btn btn-secondary" style={{ color: '#ef4444', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                                                🗑 Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            );
        } else if (activeTab === 'new-rides') {
            // New Ride Requests (pending rides)
            const pendingRides = rides.filter(r => r.status === 'pending');
            const approvedDrivers = availableDrivers.filter(d => d.status === 'approved');
            
            const formatTime = (dateStr) => {
                const date = new Date(dateStr);
                const now = new Date();
                const diffMs = now - date;
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMins / 60);
                
                if (diffMins < 1) return 'Just now';
                if (diffMins < 60) return `${diffMins} min ago`;
                if (diffHours < 24) return `${diffHours}h ago`;
                return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            };
            
            return (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div>
                            <h1 style={{ marginBottom: '0.5rem' }}>🚗 New Ride Requests</h1>
                            <p className="text-muted">Pending rides awaiting driver assignment. Call user to verify payment.</p>
                        </div>
                        <div style={{ 
                            background: pendingRides.length > 0 ? 'linear-gradient(135deg, #ef4444, #f97316)' : 'rgba(16, 185, 129, 0.2)', 
                            padding: '0.75rem 1.5rem', 
                            borderRadius: '12px',
                            textAlign: 'center'
                        }}>
                            <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: pendingRides.length > 0 ? '#fff' : '#10B981' }}>{pendingRides.length}</p>
                            <p style={{ fontSize: '0.75rem', color: pendingRides.length > 0 ? 'rgba(255,255,255,0.8)' : '#10B981' }}>Pending</p>
                        </div>
                    </div>
                    
                    {pendingRides.length === 0 ? (
                        <div className="card" style={{ padding: '4rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 182, 212, 0.1))' }}>
                            <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</p>
                            <p style={{ fontSize: '1.2rem', fontWeight: '600', color: '#10B981' }}>All caught up!</p>
                            <p className="text-muted" style={{ marginTop: '0.5rem' }}>No pending ride requests at the moment.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            {pendingRides.map((ride, index) => (
                                <div key={ride._id} className="card" style={{ 
                                    padding: '1.5rem', 
                                    borderLeft: '4px solid var(--primary)',
                                    animation: `fadeIn 0.3s ease ${index * 0.1}s both`
                                }}>
                                    {/* Header with User Info and Fare */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                                <div style={{ 
                                                    width: '45px', 
                                                    height: '45px', 
                                                    borderRadius: '50%', 
                                                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#fff',
                                                    fontWeight: 'bold',
                                                    fontSize: '1.1rem'
                                                }}>
                                                    {(ride.user?.name || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{ride.user?.name || 'User'}</p>
                                                    {ride.user?.phone && (
                                                        <a 
                                                            href={`tel:${ride.user.phone}`}
                                                            style={{ 
                                                                color: '#10B981', 
                                                                textDecoration: 'none', 
                                                                fontSize: '0.9rem',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.25rem'
                                                            }}
                                                        >
                                                            📞 {ride.user.phone}
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                                                🕐 Booked {formatTime(ride.createdAt)}
                                            </p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ 
                                                fontSize: '1.8rem', 
                                                fontWeight: 'bold', 
                                                background: 'linear-gradient(135deg, var(--secondary), var(--primary))',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent'
                                            }}>₹{ride.fare}</p>
                                            <span style={{ 
                                                padding: '0.25rem 0.75rem', 
                                                borderRadius: '20px', 
                                                fontSize: '0.7rem',
                                                fontWeight: '600',
                                                background: ride.paymentStatus === 'approved' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                                color: ride.paymentStatus === 'approved' ? '#10B981' : '#f59e0b'
                                            }}>
                                                {ride.paymentStatus === 'approved' ? '✓ Payment Verified' : '⏳ Payment Pending'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Route Info */}
                                    <div style={{ 
                                        background: 'rgba(99, 102, 241, 0.05)', 
                                        borderRadius: '12px', 
                                        padding: '1rem',
                                        marginBottom: '1rem'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10B981' }}></div>
                                                <div style={{ width: '2px', height: '30px', background: 'linear-gradient(to bottom, #10B981, #ef4444)' }}></div>
                                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }}></div>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                                                    <span className="text-muted">Pickup:</span><br/>
                                                    <strong>{ride.pickupLocation?.address}</strong>
                                                </p>
                                                <p style={{ fontSize: '0.9rem' }}>
                                                    <span className="text-muted">Drop:</span><br/>
                                                    <strong>{ride.dropLocation?.address}</strong>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {ride.user?.phone && (
                                            <a 
                                                href={`tel:${ride.user.phone}`}
                                                className="btn btn-secondary"
                                                style={{ 
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    textDecoration: 'none'
                                                }}
                                            >
                                                📞 Call User
                                            </a>
                                        )}
                                        <select 
                                            style={{ 
                                                padding: '0.6rem 1rem', 
                                                borderRadius: '8px', 
                                                background: '#334155', 
                                                color: 'white', 
                                                border: '1px solid rgba(255,255,255,0.1)', 
                                                flex: 1,
                                                minWidth: '180px',
                                                cursor: 'pointer'
                                            }}
                                            onChange={(e) => setSelectedDriver({...selectedDriver, [ride._id]: e.target.value})}
                                            value={selectedDriver[ride._id] || ''}
                                        >
                                            <option value="">Select Driver</option>
                                            {approvedDrivers.length === 0 ? (
                                                <option disabled>No approved drivers available</option>
                                            ) : (
                                                approvedDrivers.map(d => {
                                                    const vehicleInfo = typeof d.vehicle === 'object' 
                                                        ? (d.vehicle?.model || d.vehicle?.plateNumber || 'Vehicle') 
                                                        : (d.vehicle || 'No vehicle info');
                                                    return (
                                                        <option key={d._id} value={d._id}>{d.name} - {vehicleInfo}</option>
                                                    );
                                                })
                                            )}
                                        </select>
                                        <button 
                                            onClick={() => handleAssignDriver(ride._id)} 
                                            className="btn btn-primary"
                                            disabled={!selectedDriver[ride._id]}
                                            style={{ opacity: selectedDriver[ride._id] ? 1 : 0.6 }}
                                        >
                                            Assign Driver
                                        </button>
                                        {ride.paymentStatus !== 'approved' && (
                                            <button 
                                                onClick={() => handlePaymentUpdate(ride._id, 'approved')} 
                                                className="btn btn-primary" 
                                                style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
                                            >
                                                ✓ Verify Payment
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <style>{`
                        @keyframes fadeIn {
                            from { opacity: 0; transform: translateY(10px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                    `}</style>
                </>
            );
        } else if (activeTab === 'payments') {
            // Payments - Enhanced with status change
            const pendingPayments = rides.filter(r => r.paymentStatus === 'pending');
            const approvedPayments = rides.filter(r => r.paymentStatus === 'approved');
            const totalPending = pendingPayments.reduce((sum, r) => sum + (r.fare || 0), 0);
            const totalApproved = approvedPayments.reduce((sum, r) => sum + (r.fare || 0), 0);
            
            const getStatusBadge = (status) => {
                const colors = {
                    'pending': { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', label: 'Pending' },
                    'assigned': { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', label: 'Driver Assigned' },
                    'accepted': { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6', label: 'Driver Coming' },
                    'ongoing': { bg: 'rgba(14, 165, 233, 0.15)', text: '#0ea5e9', label: 'In Progress' },
                    'completed': { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', label: 'Completed' },
                    'cancelled': { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', label: 'Cancelled' }
                };
                return colors[status] || { bg: 'rgba(107, 114, 128, 0.15)', text: '#6b7280', label: status };
            };
            
            const formatDate = (dateStr) => {
                return new Date(dateStr).toLocaleDateString('en-IN', { 
                    day: 'numeric', 
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            };
            
            const RideCard = ({ ride, showPaymentActions = true }) => {
                const statusInfo = getStatusBadge(ride.status);
                return (
                    <div className="card" style={{ 
                        padding: '1.25rem',
                        marginBottom: '0.75rem',
                        borderLeft: `4px solid ${statusInfo.text}`
                    }}>
                        {/* Header Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                {/* User Avatar */}
                                <div style={{ 
                                    width: '40px', 
                                    height: '40px', 
                                    borderRadius: '50%', 
                                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontWeight: 'bold'
                                }}>
                                    {(ride.user?.name || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p style={{ fontWeight: '600' }}>{ride.user?.name || 'Unknown User'}</p>
                                    <p className="text-muted" style={{ fontSize: '0.75rem' }}>{formatDate(ride.createdAt)}</p>
                                </div>
                            </div>
                            
                            {/* Fare */}
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--secondary)' }}>₹{ride.fare}</p>
                                <span style={{ 
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                    background: ride.paymentStatus === 'approved' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                    color: ride.paymentStatus === 'approved' ? '#10B981' : '#f59e0b'
                                }}>
                                    {ride.paymentStatus === 'approved' ? '✓ Paid' : '○ Pending'}
                                </span>
                            </div>
                        </div>
                        
                        {/* Route Display */}
                        <div style={{ 
                            background: 'var(--bg-input)', 
                            padding: '0.75rem', 
                            borderRadius: '8px',
                            marginBottom: '1rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <span style={{ color: '#10B981' }}>●</span>
                                <span style={{ fontSize: '0.85rem' }}>{ride.pickupLocation?.address || 'Pickup'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ color: '#ef4444' }}>●</span>
                                <span style={{ fontSize: '0.85rem' }}>{ride.dropLocation?.address || 'Drop'}</span>
                            </div>
                        </div>
                        
                        {/* Driver Info */}
                        {ride.driver && (
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.75rem', 
                                marginBottom: '1rem',
                                padding: '0.5rem',
                                background: 'rgba(99, 102, 241, 0.05)',
                                borderRadius: '8px'
                            }}>
                                <span>🚗</span>
                                <div>
                                    <p style={{ fontSize: '0.85rem', fontWeight: '500' }}>{ride.driver.name}</p>
                                    {ride.driver.phone && (
                                        <a href={`tel:${ride.driver.phone}`} style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>
                                            📞 {ride.driver.phone}
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {/* Status & Actions */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                            {/* Current Status Badge */}
                            <span style={{ 
                                padding: '0.35rem 0.75rem',
                                borderRadius: '20px',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                background: statusInfo.bg,
                                color: statusInfo.text
                            }}>
                                {statusInfo.label}
                            </span>
                            
                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                {/* Status Change Dropdown */}
                                <select 
                                    value={ride.status}
                                    onChange={(e) => handleRideStatusUpdate(ride._id, e.target.value)}
                                    style={{ 
                                        padding: '0.4rem 0.75rem',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-input)',
                                        color: 'inherit',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="pending">Pending</option>
                                    <option value="assigned">Assigned</option>
                                    <option value="accepted">Accepted</option>
                                    <option value="ongoing">Ongoing</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                                
                                {/* Payment Actions */}
                                {showPaymentActions && (
                                    <>
                                        {ride.paymentStatus === 'pending' ? (
                                            <button 
                                                onClick={() => handlePaymentUpdate(ride._id, 'approved')} 
                                                className="btn btn-primary"
                                                style={{ 
                                                    padding: '0.4rem 0.75rem',
                                                    fontSize: '0.8rem',
                                                    background: '#10B981'
                                                }}
                                            >
                                                ✓ Approve Payment
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => handlePaymentUpdate(ride._id, 'pending')} 
                                                className="btn btn-secondary"
                                                style={{ 
                                                    padding: '0.4rem 0.75rem',
                                                    fontSize: '0.8rem'
                                                }}
                                            >
                                                Mark Unpaid
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                );
            };
            
            return (
                <>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <div>
                            <h1 style={{ marginBottom: '0.25rem' }}>💰 Payments & Ride Management</h1>
                            <p className="text-muted">Manage payments and change ride status</p>
                        </div>
                    </div>
                    
                    {/* Stats Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), transparent)' }}>
                            <p className="text-muted" style={{ fontSize: '0.85rem' }}>Pending Payments</p>
                            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>₹{totalPending.toLocaleString()}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{pendingPayments.length} rides</p>
                        </div>
                        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10B981', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), transparent)' }}>
                            <p className="text-muted" style={{ fontSize: '0.85rem' }}>Collected</p>
                            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10B981' }}>₹{totalApproved.toLocaleString()}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{approvedPayments.length} rides</p>
                        </div>
                        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), transparent)' }}>
                            <p className="text-muted" style={{ fontSize: '0.85rem' }}>Total Rides</p>
                            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{rides.length}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>All time</p>
                        </div>
                    </div>
                    
                    {/* Pending Payments Section */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h2 style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            marginBottom: '1rem'
                        }}>
                            <span style={{ color: '#f59e0b' }}>⏳</span> 
                            Pending Payments 
                            <span style={{ 
                                background: 'rgba(245, 158, 11, 0.15)',
                                color: '#f59e0b',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '20px',
                                fontSize: '0.9rem'
                            }}>{pendingPayments.length}</span>
                        </h2>
                        
                        {pendingPayments.length === 0 ? (
                            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                                <p className="text-muted">No pending payments</p>
                            </div>
                        ) : (
                            pendingPayments.map(ride => <RideCard key={ride._id} ride={ride} />)
                        )}
                    </div>
                    
                    {/* Approved Payments Section */}
                    <div>
                        <h2 style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            marginBottom: '1rem'
                        }}>
                            <span style={{ color: '#10B981' }}>✓</span> 
                            Approved Payments 
                            <span style={{ 
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10B981',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '20px',
                                fontSize: '0.9rem'
                            }}>{approvedPayments.length}</span>
                        </h2>
                        
                        {approvedPayments.length === 0 ? (
                            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                                <p className="text-muted">No approved payments yet</p>
                            </div>
                        ) : (
                            approvedPayments.slice(0, 20).map(ride => <RideCard key={ride._id} ride={ride} />)
                        )}
                        
                        {approvedPayments.length > 20 && (
                            <p className="text-muted" style={{ textAlign: 'center', marginTop: '1rem' }}>
                                Showing 20 of {approvedPayments.length} approved payments
                            </p>
                        )}
                    </div>
                </>
            );
        } else if (activeTab === 'users') {
            // Users list (fetched from Admin API)
            const formatDate = (dateStr) => {
                if (!dateStr) return 'N/A';
                return new Date(dateStr).toLocaleDateString('en-IN', { 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric' 
                });
            };
            
            // Get ride count per user
            const getUserRideCount = (userId) => {
                return rides.filter(r => r.user?._id === userId).length;
            };
            
            const getUserTotalSpent = (userId) => {
                return rides
                    .filter(r => r.user?._id === userId && r.status === 'completed')
                    .reduce((sum, r) => sum + (r.fare || 0), 0);
            };
            
            return (
                <>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <div>
                            <h1 style={{ marginBottom: '0.25rem' }}>👥 Users</h1>
                            <p className="text-muted">All registered customers in the system.</p>
                        </div>
                        <div style={{ 
                            padding: '0.75rem 1.5rem', 
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
                            borderRadius: '12px',
                            border: '1px solid rgba(99, 102, 241, 0.2)'
                        }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Users: </span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{allUsers.length}</span>
                        </div>
                    </div>
                    
                    {/* Stats Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--primary)' }}>
                            <p className="text-muted" style={{ fontSize: '0.8rem' }}>Total Users</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{allUsers.length}</p>
                        </div>
                        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #10B981' }}>
                            <p className="text-muted" style={{ fontSize: '0.8rem' }}>Total Bookings</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10B981' }}>
                                {rides.filter(r => r.user).length}
                            </p>
                        </div>
                        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--secondary)' }}>
                            <p className="text-muted" style={{ fontSize: '0.8rem' }}>Revenue from Users</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--secondary)' }}>
                                ₹{rides.filter(r => r.status === 'completed').reduce((sum, r) => sum + (r.fare || 0), 0).toLocaleString()}
                            </p>
                        </div>
                    </div>
                    
                    {/* Users List */}
                    {allUsers.length === 0 ? (
                        <div className="card" style={{ padding: '4rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05))' }}>
                            <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</p>
                            <p style={{ fontSize: '1.2rem', fontWeight: '600' }}>No Users Yet</p>
                            <p className="text-muted" style={{ marginTop: '0.5rem' }}>Users will appear here when they register.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {allUsers.map((u, index) => {
                                const userRides = getUserRideCount(u._id);
                                const totalSpent = getUserTotalSpent(u._id);
                                
                                return (
                                    <div key={u._id} className="card" style={{ 
                                        padding: '1.25rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1.25rem',
                                        animation: `fadeIn 0.3s ease ${index * 0.03}s both`
                                    }}>
                                        {/* Avatar */}
                                        <div style={{ 
                                            width: '50px', 
                                            height: '50px', 
                                            borderRadius: '50%', 
                                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            fontWeight: 'bold',
                                            fontSize: '1.25rem',
                                            flexShrink: 0
                                        }}>
                                            {(u.name || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        
                                        {/* User Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontWeight: '600', fontSize: '1rem', marginBottom: '0.25rem' }}>{u.name}</p>
                                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                                <span className="text-muted" style={{ fontSize: '0.85rem' }}>📧 {u.email}</span>
                                                {u.phone && (
                                                    <a 
                                                        href={`tel:${u.phone}`} 
                                                        style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none' }}
                                                    >
                                                        📱 {u.phone}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Stats */}
                                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>{userRides}</p>
                                                <p className="text-muted" style={{ fontSize: '0.7rem' }}>Rides</p>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--secondary)' }}>₹{totalSpent}</p>
                                                <p className="text-muted" style={{ fontSize: '0.7rem' }}>Spent</p>
                                            </div>
                                            <div style={{ textAlign: 'center', minWidth: '80px' }}>
                                                <p className="text-muted" style={{ fontSize: '0.75rem' }}>Joined</p>
                                                <p style={{ fontSize: '0.8rem', fontWeight: '500' }}>{formatDate(u.createdAt)}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    
                    <style>{`
                        @keyframes fadeIn {
                            from { opacity: 0; transform: translateY(5px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                    `}</style>
                </>
            );
        } else if (activeTab === 'reports') {
            // Reports - Stats overview
            const completedRides = rides.filter(r => r.status === 'completed');
            const totalRevenue = rides.reduce((sum, r) => sum + (r.fare || 0), 0);
            const approvedRevenue = rides.filter(r => r.paymentStatus === 'approved').reduce((sum, r) => sum + (r.fare || 0), 0);
            
            return (
                <>
                    <h1 style={{ marginBottom: '2rem' }}>📈 Reports</h1>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div className="card">
                            <h4>Total Revenue</h4>
                            <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--primary)' }}>₹{totalRevenue}</p>
                        </div>
                        <div className="card">
                            <h4>Collected</h4>
                            <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#10B981' }}>₹{approvedRevenue}</p>
                        </div>
                        <div className="card">
                            <h4>Total Rides</h4>
                            <p style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{rides.length}</p>
                        </div>
                        <div className="card">
                            <h4>Completed</h4>
                            <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#10B981' }}>{completedRides.length}</p>
                        </div>
                        <div className="card">
                            <h4>Users</h4>
                            <p style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{stats.users || 0}</p>
                        </div>
                        <div className="card">
                            <h4>Drivers</h4>
                            <p style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{stats.drivers || 0}</p>
                        </div>
                    </div>
                    
                    <h2>Recent Rides</h2>
                    <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {rides.slice(0, 10).map(ride => (
                            <div key={ride._id} className="card" style={{ padding: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{ride.user?.name} → {ride.driver?.name || 'Unassigned'}</span>
                                <span>₹{ride.fare} | {ride.status}</span>
                            </div>
                        ))}
                    </div>
                </>
            );
        } else if (activeTab === 'locations') {
            // Location Management Tab with OpenStreetMap Nominatim Search (FREE)

            // Search locations using Nominatim API (Free)
            const searchLocationAPI = async (query) => {
                if (!query || query.length < 3) {
                    setSearchResults([]);
                    return;
                }
                setIsSearching(true);
                try {
                    // Search in West Bengal area
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}, West Bengal, India&limit=5`
                    );
                    const data = await response.json();
                    setSearchResults(data);
                } catch (error) {
                    console.error('Search error:', error);
                }
                setIsSearching(false);
            };

            // Debounce search
            const handleSearchChange = (value) => {
                setLocationSearch(value);
                setTimeout(() => searchLocationAPI(value), 500);
            };

            // Select location from search results
            const selectSearchLocation = (result) => {
                const name = result.display_name.split(',')[0]; // Get first part as name
                setNewLocation({
                    name: name,
                    lat: parseFloat(result.lat).toFixed(4),
                    lng: parseFloat(result.lon).toFixed(4)
                });
                setLocationSearch('');
                setSearchResults([]);
            };

            const handleAddLocation = async (e) => {
                e.preventDefault();
                try {
                    await api.post('/admin/locations', newLocation);
                    alert('Location added successfully!');
                    setNewLocation({ name: '', lat: '', lng: '' });
                    fetchData();
                } catch (error) {
                    alert(error.response?.data?.message || 'Error adding location');
                }
            };

            const handleDeleteLocation = async (name) => {
                if (!confirm(`Delete location "${name}"?`)) return;
                try {
                    await api.delete(`/admin/locations/${encodeURIComponent(name)}`);
                    alert('Location deleted!');
                    fetchData();
                } catch (error) {
                    alert('Error deleting location');
                }
            };

            return (
                <>
                    <div style={{ marginBottom: '2rem' }}>
                        <h1 style={{ marginBottom: '0.5rem' }}>📍 Location Management</h1>
                        <p className="text-muted">Add or remove pickup/drop locations for Kolkata Ride.</p>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                        {/* Add Location Form */}
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1.5rem' }}>➕ Add New Location</h3>
                            
                            {/* Search Box */}
                            <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                    🔍 Search Location (Auto-fill coordinates)
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="Search any Kolkata location..."
                                    value={locationSearch}
                                    onChange={e => handleSearchChange(e.target.value)}
                                    style={{ width: '100%', marginBottom: 0 }}
                                />
                                {isSearching && (
                                    <p style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '0.5rem' }}>
                                        🔄 Searching...
                                    </p>
                                )}
                                
                                {/* Search Results Dropdown */}
                                {searchResults.length > 0 && (
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
                                        {searchResults.map((result, idx) => (
                                            <div 
                                                key={idx}
                                                onClick={() => selectSearchLocation(result)}
                                                style={{
                                                    padding: '0.75rem 1rem',
                                                    cursor: 'pointer',
                                                    borderBottom: '1px solid var(--border)',
                                                    fontSize: '0.85rem'
                                                }}
                                                onMouseEnter={e => e.target.style.background = 'rgba(99, 102, 241, 0.1)'}
                                                onMouseLeave={e => e.target.style.background = 'transparent'}
                                            >
                                                📍 {result.display_name.substring(0, 50)}...
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            <div style={{ 
                                padding: '0.75rem', 
                                background: 'rgba(16, 185, 129, 0.1)', 
                                borderRadius: '8px', 
                                marginBottom: '1rem',
                                fontSize: '0.8rem',
                                color: '#10B981'
                            }}>
                                💡 Type location name above to auto-fill coordinates
                            </div>
                            
                            <form onSubmit={handleAddLocation}>
                                <div className="form-group">
                                    <label>Location Name</label>
                                    <input type="text" placeholder="e.g., New Town" value={newLocation.name} onChange={e => setNewLocation({...newLocation, name: e.target.value})} required />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label>Latitude</label>
                                        <input type="number" step="0.0001" placeholder="22.5800" value={newLocation.lat} onChange={e => setNewLocation({...newLocation, lat: e.target.value})} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Longitude</label>
                                        <input type="number" step="0.0001" placeholder="88.4200" value={newLocation.lng} onChange={e => setNewLocation({...newLocation, lng: e.target.value})} required />
                                    </div>
                                </div>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Add Location</button>
                            </form>
                        </div>
                        
                        {/* Locations List */}
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1rem' }}>📋 All Locations ({locations.length})</h3>
                            <div style={{ maxHeight: '500px', overflowY: 'auto', display: 'grid', gap: '0.5rem' }}>
                                {locations.map((loc, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                        <div>
                                            <p style={{ fontWeight: '500' }}>{loc.name}</p>
                                            <p className="text-muted" style={{ fontSize: '0.75rem' }}>Lat: {loc.lat}, Lng: {loc.lng}</p>
                                        </div>
                                        <button onClick={() => handleDeleteLocation(loc.name)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '0.4rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>🗑 Delete</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            );
        } else if (activeTab === 'fare-settings') {
            // Fare Settings Tab
            const handleSaveFareConfig = async (e) => {
                e.preventDefault();
                try {
                    await api.put('/admin/fare-config', fareConfig);
                    alert('Fare settings updated successfully!');
                } catch (error) {
                    alert('Error updating fare settings');
                }
            };

            return (
                <>
                    <div style={{ marginBottom: '2rem' }}>
                        <h1 style={{ marginBottom: '0.5rem' }}>💵 Fare Settings</h1>
                        <p className="text-muted">Configure base fare, per kilometer rate, and minimum fare.</p>
                    </div>
                    
                    <div className="card" style={{ padding: '2rem', maxWidth: '500px' }}>
                        <form onSubmit={handleSaveFareConfig}>
                            <div className="form-group">
                                <label>🏁 Base Fare (₹)</label>
                                <input type="number" value={fareConfig.baseFare} onChange={e => setFareConfig({...fareConfig, baseFare: Number(e.target.value)})} required style={{ fontSize: '1.2rem' }} />
                                <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Initial fare charged for every ride</p>
                            </div>
                            
                            <div className="form-group">
                                <label>📏 Per Kilometer Rate (₹)</label>
                                <input type="number" value={fareConfig.perKmRate} onChange={e => setFareConfig({...fareConfig, perKmRate: Number(e.target.value)})} required style={{ fontSize: '1.2rem' }} />
                                <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Charge per kilometer traveled</p>
                            </div>
                            
                            <div className="form-group">
                                <label>⬇️ Minimum Fare (₹)</label>
                                <input type="number" value={fareConfig.minimumFare} onChange={e => setFareConfig({...fareConfig, minimumFare: Number(e.target.value)})} required style={{ fontSize: '1.2rem' }} />
                                <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Minimum fare for short distance rides</p>
                            </div>
                            
                            <div style={{ padding: '1.25rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 182, 212, 0.1))', borderRadius: '12px', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                                <p style={{ fontWeight: '600', marginBottom: '0.75rem' }}>📊 Fare Formula</p>
                                <p className="text-muted">Fare = ₹{fareConfig.baseFare} + (Distance × ₹{fareConfig.perKmRate}/km)</p>
                                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: '#10B981' }}>Example: 5km = ₹{fareConfig.baseFare + 5 * fareConfig.perKmRate}</p>
                            </div>
                            
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>💾 Save Fare Settings</button>
                        </form>
                    </div>
                </>
            );
        } else if (activeTab === 'create-ride') {
            // Create Ride Tab
            const calculateDistance = (lat1, lng1, lat2, lng2) => {
                const R = 6371;
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLng = (lng2 - lng1) * Math.PI / 180;
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) * Math.sin(dLng/2);
                return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            };

            const handleCalculateFare = () => {
                const pickupLoc = locations.find(l => l.name === createRideForm.pickup);
                const dropLoc = locations.find(l => l.name === createRideForm.drop);
                if (!pickupLoc || !dropLoc) { alert('Select valid locations'); return; }
                const distance = calculateDistance(pickupLoc.lat, pickupLoc.lng, dropLoc.lat, dropLoc.lng);
                setCreateRideForm({...createRideForm, fare: Math.max(Math.round(fareConfig.baseFare + distance * fareConfig.perKmRate), fareConfig.minimumFare)});
            };

            const handleCreateRide = async (e) => {
                e.preventDefault();
                if (!createRideForm.userId || !createRideForm.pickup || !createRideForm.drop || !createRideForm.fare) { alert('Fill all fields'); return; }
                const pickupLoc = locations.find(l => l.name === createRideForm.pickup);
                const dropLoc = locations.find(l => l.name === createRideForm.drop);
                try {
                    await api.post('/admin/rides', {
                        userId: createRideForm.userId,
                        pickupLocation: { address: createRideForm.pickup, lat: pickupLoc.lat, lng: pickupLoc.lng },
                        dropLocation: { address: createRideForm.drop, lat: dropLoc.lat, lng: dropLoc.lng },
                        fare: createRideForm.fare
                    });
                    alert('Ride created!');
                    setCreateRideForm({ userId: '', pickup: '', drop: '', fare: 0 });
                    fetchData();
                } catch (error) { alert('Error creating ride'); }
            };

            return (
                <>
                    <div style={{ marginBottom: '2rem' }}>
                        <h1 style={{ marginBottom: '0.5rem' }}>➕ Create Manual Ride</h1>
                        <p className="text-muted">Create a ride booking on behalf of a user.</p>
                    </div>
                    
                    <div className="card" style={{ padding: '2rem', maxWidth: '600px' }}>
                        <form onSubmit={handleCreateRide}>
                            <div className="form-group">
                                <label>👤 Select User</label>
                                <select value={createRideForm.userId} onChange={e => setCreateRideForm({...createRideForm, userId: e.target.value})} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
                                    <option value="">Select a user...</option>
                                    {allUsers.filter(u => u.role === 'user').map(u => (<option key={u._id} value={u._id}>{u.name} ({u.phone || u.email})</option>))}
                                </select>
                            </div>
                            
                            <div className="form-group">
                                <label>📍 Pickup Location</label>
                                <select value={createRideForm.pickup} onChange={e => setCreateRideForm({...createRideForm, pickup: e.target.value})} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
                                    <option value="">Select pickup...</option>
                                    {locations.map((loc, idx) => (<option key={idx} value={loc.name}>{loc.name}</option>))}
                                </select>
                            </div>
                            
                            <div className="form-group">
                                <label>🏁 Drop Location</label>
                                <select value={createRideForm.drop} onChange={e => setCreateRideForm({...createRideForm, drop: e.target.value})} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
                                    <option value="">Select drop...</option>
                                    {locations.map((loc, idx) => (<option key={idx} value={loc.name}>{loc.name}</option>))}
                                </select>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
                                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                    <label>💰 Fare (₹)</label>
                                    <input type="number" value={createRideForm.fare} onChange={e => setCreateRideForm({...createRideForm, fare: Number(e.target.value)})} required style={{ fontSize: '1.2rem' }} />
                                </div>
                                <button type="button" onClick={handleCalculateFare} className="btn btn-secondary">🧮 Calculate</button>
                            </div>
                            
                            {createRideForm.fare > 0 && (
                                <div style={{ padding: '1rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.1))', borderRadius: '10px', marginBottom: '1.5rem', textAlign: 'center' }}>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10B981' }}>₹{createRideForm.fare}</p>
                                </div>
                            )}
                            
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={!createRideForm.fare}>🚕 Create Ride</button>
                        </form>
                    </div>
                </>
            );
        } else if (activeTab === 'profile') {
            return (
                <div className="card">
                    <h1>👤 Admin Profile</h1>
                    <div style={{ marginTop: '1.5rem' }}>
                        <p><strong>Name:</strong> {user?.name}</p>
                        <p><strong>Email:</strong> {user?.email}</p>
                        <p><strong>Role:</strong> {user?.role}</p>
                    </div>
                    <p className="text-muted" style={{ marginTop: '1rem' }}>Profile editing coming soon...</p>
                </div>
            );
        }
    };

    // Render Ride List (for driver assigned rides and history)
    const renderRideList = () => (
        <div style={{ display: 'grid', gap: '1rem' }}>
            {rides.map(ride => (
                <div key={ride._id} className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div>
                            <p style={{ fontWeight: 'bold' }}>{ride.user?.name || 'Unknown'}</p>
                            <p className="text-muted" style={{ fontSize: '0.8rem' }}>{new Date(ride.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--secondary)' }}>₹{ride.fare}</p>
                            <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '8px', background: ride.status === 'completed' ? '#10B981' : '#3b82f6', color: '#fff' }}>
                                {ride.status}
                            </span>
                        </div>
                    </div>
                    
                    <p style={{ fontSize: '0.9rem' }}><span className="text-muted">From:</span> {ride.pickupLocation.address}</p>
                    <p style={{ fontSize: '0.9rem' }}><span className="text-muted">To:</span> {ride.dropLocation.address}</p>
                    <p style={{ fontSize: '0.9rem' }}><span className="text-muted">Payment:</span> {ride.paymentStatus}</p>
                    
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                        {user.role === 'driver' && ride.status === 'assigned' && (
                            <button onClick={() => handleAcceptRide(ride._id)} className="btn btn-primary">
                                Accept Job
                            </button>
                        )}
                        {user.role === 'driver' && ride.status === 'completed' && ride.paymentStatus === 'pending' && (
                            <button onClick={() => handleCollectPayment(ride._id)} className="btn btn-primary" style={{ background: '#10B981', borderColor: '#10B981' }}>
                                Collect Cash
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );

    // Render History
    const renderHistory = (role) => (
        <>
            <h1 style={{ marginBottom: '2rem' }}>Ride History</h1>
            {rides.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                    <p className="text-muted">No ride history.</p>
                </div>
            ) : (
                renderRideList()
            )}
        </>
    );

    // Loading state
    if (!user) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <p>Loading...</p>
            </div>
        );
    }

    // Main Layout
    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Mobile Hamburger Menu */}
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="hamburger-menu"
                style={{
                    position: 'fixed',
                    top: '1rem',
                    left: '1rem',
                    zIndex: 1000,
                    width: '44px',
                    height: '44px',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    display: 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '1.5rem'
                }}
                aria-label="Toggle menu"
            >
                {isSidebarOpen ? '✕' : '☰'}
            </button>
            
            <Sidebar role={user.role} />
            
            <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }} className="dashboard-content">
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    {user.role === 'user' && renderUserContent()}
                    {user.role === 'driver' && renderDriverContent()}
                    {user.role === 'admin' && renderAdminContent()}
                </div>
            </div>
            
            <style>{`
                @media (max-width: 768px) {
                    .hamburger-menu {
                        display: flex !important;
                    }
                    
                    .sidebar {
                        position: fixed !important;
                        top: 0;
                        left: -250px;
                        height: 100vh;
                        transition: left 0.3s ease;
                        box-shadow: 2px 0 8px rgba(0, 0, 0, 0.2);
                    }
                    
                    .sidebar-open {
                        left: 0 !important;
                    }
                    
                    .mobile-overlay {
                        display: block !important;
                    }
                    
                    .dashboard-content {
                        padding: 1rem !important;
                        padding-top: 4rem !important;
                    }
                    
                    /* Responsive grids */
                    div[style*="grid-template-columns"] {
                        grid-template-columns: 1fr !important;
                    }
                    
                    /* Better spacing on mobile */
                    div[style*="gridTemplateColumns"] {
                        grid-template-columns: 1fr !important;
                        gap: 1rem !important;
                    }
                }
                
                @media (max-width: 480px) {
                    .dashboard-content {
                        padding: 0.75rem !important;
                        padding-top: 4rem !important;
                    }
                    
                    /* Stack all grid layouts */
                    div[style*="grid-template-columns"],
                    div[style*="gridTemplateColumns"] {
                        grid-template-columns: 1fr !important;
                    }
                    
                    /* Reduce font sizes for mobile */
                    h1 {
                        font-size: 1.5rem !important;
                    }
                    
                    h2 {
                        font-size: 1.25rem !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default Dashboard;
