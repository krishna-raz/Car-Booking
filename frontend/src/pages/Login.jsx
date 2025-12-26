import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    const roleParam = searchParams.get('role');
    const [role, setRole] = useState(roleParam || 'user');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await login(email, password, role);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
            <div className="card" style={{ width: '400px' }}>
                <h2 style={{ textAlign: 'center' }}>Welcome Back</h2>
                <p className="text-muted" style={{ textAlign: 'center', marginBottom: '2rem' }}>Login as {role === 'driver' ? 'Driver' : 'User/Admin'}</p>
                
                 <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input 
                            type="radio" 
                            value="user" 
                            checked={role === 'user'} 
                            onChange={() => setRole('user')} 
                        /> <span>User/Admin</span>
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
                    <div>
                        <input 
                            type="email" 
                            placeholder="Email Address"
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                        />
                    </div>
                    <div>
                        <input 
                            type="password" 
                            placeholder="Password"
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                        Sign In
                    </button>
                </form>
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <p className="text-muted" style={{ fontSize: '0.9rem' }}>Don't have an account? <span style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={() => navigate('/register?role=' + role)}>Register</span></p>
                </div>
            </div>
        </div>
    );
};

export default Login;
