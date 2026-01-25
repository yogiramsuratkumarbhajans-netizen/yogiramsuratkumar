import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PasswordInput from '../components/PasswordInput';
import './AdminLoginPage.css';

const AdminLoginPage = () => {
    const { loginAdmin } = useAuth();
    const { success, error } = useToast();
    const navigate = useNavigate();

    const [credentials, setCredentials] = useState({
        username: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCredentials(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!credentials.username || !credentials.password) {
            error('Please enter both username and password.');
            return;
        }

        setLoading(true);

        // Small delay for UX
        await new Promise(resolve => setTimeout(resolve, 500));

        const result = loginAdmin(credentials.username, credentials.password);

        setLoading(false);

        if (result.success) {
            success('Welcome, Admin!');
            navigate('/admin/dashboard');
        } else {
            error(result.error || 'Invalid credentials.');
        }
    };

    return (
        <div className="admin-login-page page-enter">
            <div className="admin-login-container">
                <Link to="/" className="back-link">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                    Back to Home
                </Link>

                <div className="admin-login-card">
                    <div className="admin-login-header">
                        <div className="admin-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                        </div>
                        <h1>Admin Login</h1>
                        <p>Restricted Access</p>
                    </div>

                    <form onSubmit={handleSubmit} className="admin-login-form">
                        <div className="form-group">
                            <label className="form-label">Username</label>
                            <input
                                type="text"
                                name="username"
                                value={credentials.username}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="Enter admin username"
                                autoComplete="username"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <PasswordInput
                                name="password"
                                value={credentials.password}
                                onChange={handleChange}
                                placeholder="Enter admin password"
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg w-full"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="loader loader-sm"></span>
                                    Authenticating...
                                </>
                            ) : (
                                'Login as Admin'
                            )}
                        </button>
                    </form>

                    <div className="admin-login-footer">
                        <p className="security-note">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            This area is for authorized administrators only
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLoginPage;
