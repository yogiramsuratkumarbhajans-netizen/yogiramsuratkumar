import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PasswordInput from '../components/PasswordInput';
import './ModeratorLoginPage.css';

const ModeratorLoginPage = () => {
    const { loginModerator } = useAuth();
    const { success, error } = useToast();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!username || !password) {
            error('Please enter both username and password.');
            return;
        }

        setLoading(true);

        const result = await loginModerator(username, password);

        setLoading(false);

        if (result.success) {
            success('Welcome, Moderator! Hari Om 🙏');
            navigate('/moderator/dashboard');
        } else {
            error(result.error || 'Invalid credentials.');
        }
    };

    return (
        <div className="moderator-login-page page-enter">
            <div className="moderator-login-container">
                <Link to="/" className="back-link">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                    Back to Home
                </Link>

                <div className="moderator-login-card">
                    <div className="moderator-login-header">
                        <div className="moderator-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <h1>Moderator Login</h1>
                        <p>Access moderator dashboard to manage Namavruksha Sankalpas</p>
                    </div>

                    <form onSubmit={handleSubmit} className="moderator-login-form">
                        <div className="form-group">
                            <label className="form-label">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="form-input"
                                placeholder="Enter username"
                                autoComplete="username"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <PasswordInput
                                name="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
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
                                    Logging in...
                                </>
                            ) : (
                                'Login as Moderator'
                            )}
                        </button>
                    </form>

                    <div className="moderator-login-footer">
                        <p>
                            Moderator accounts are created by Admin.{' '}
                            <Link to="/admin/login">Admin Login</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModeratorLoginPage;
