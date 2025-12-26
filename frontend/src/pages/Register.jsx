import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        vehicleModel: '',
        vehiclePlate: '',
        vehicleType: 'Sedan' 
    });
    const [error, setError] = useState('');
    const { register } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    const roleParam = searchParams.get('role');
    const [role, setRole] = useState(roleParam || 'user');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        const payload = {
            name: formData.name,
            email: formData.email,
            password: formData.password,
            phone: formData.phone,
            role: role
        };

        if (role === 'driver') {
            payload.vehicle = {
                model: formData.vehicleModel,
                plateNumber: formData.vehiclePlate,
                type: formData.vehicleType
            };
        }

        try {
            await register(payload, role);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '2rem 0' }}>
            <div className="card" style={{ width: '450px' }}>
                <h2 style={{ textAlign: 'center' }}>Create Account</h2>
                <p className="text-muted" style={{ textAlign: 'center', marginBottom: '2rem' }}>Join as {role === 'driver' ? 'Driver' : 'User'}</p>
                
                 <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input 
                            type="radio" 
                            value="user" 
                            checked={role === 'user'} 
                            onChange={() => setRole('user')} 
                        /> <span>User</span>
                    </label>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input 
                            type="radio" 
                            value="driver" 
                            checked={role === 'driver'} 
                            onChange={() => setRole('driver')} 
                        /> <span>Driver</span>
                    </label>
                </div>

                {error && <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
                
                <form onSubmit={handleSubmit}>
                    <input type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} required />
                    <input type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleChange} required />
                    <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required />
                    <input type="text" name="phone" placeholder="Phone Number" value={formData.phone} onChange={handleChange} required />

                    {role === 'driver' && (
                        <>
                            <div style={{ margin: '1rem 0', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Vehicle Details</h3>
                                <input type="text" name="vehicleModel" placeholder="Vehicle Model (e.g. Toyota Corolla)" value={formData.vehicleModel} onChange={handleChange} required />
                                <input type="text" name="vehiclePlate" placeholder="License Plate Number" value={formData.vehiclePlate} onChange={handleChange} required />
                                <select name="vehicleType" value={formData.vehicleType} onChange={handleChange}>
                                    <option value="Sedan">Sedan</option>
                                    <option value="SUV">SUV</option>
                                    <option value="Bike">Bike</option>
                                </select>
                            </div>
                        </>
                    )}

                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                        Register
                    </button>
                </form>
                 <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <p className="text-muted" style={{ fontSize: '0.9rem' }}>Already have an account? <span style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={() => navigate('/login?role=' + role)}>Login</span></p>
                </div>
            </div>
        </div>
    );
};

export default Register;
