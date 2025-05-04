import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/auth';

const AuthContext = createContext();

// Helper function to securely store token with expiration
const securelyStoreToken = (token) => {
    if (!token) return;

    // Store in sessionStorage instead of localStorage for better security
    // (token is lost when browser is closed)
    sessionStorage.setItem('token', token);

    // Set token expiration (e.g., 1 hour from now)
    const expiresAt = new Date().getTime() + 60 * 60 * 1000;
    sessionStorage.setItem('tokenExpiry', expiresAt.toString());
};

// Helper function to check if token is expired
const isTokenExpired = () => {
    const expiry = sessionStorage.getItem('tokenExpiry');
    if (!expiry) return true;

    return new Date().getTime() > parseInt(expiry);
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Function to fetch user profile
    const fetchUserProfile = useCallback(async () => {
        try {
            const { data } = await api.get('/api/auth/profile/');
            setUser(data);
            setIsAuthenticated(true);
            return true;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('tokenExpiry');
            setIsAuthenticated(false);
            setUser(null);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    // Check authentication status on mount
    useEffect(() => {
        const token = sessionStorage.getItem('token');

        if (token && !isTokenExpired()) {
            fetchUserProfile();
        } else {
            // Clear expired token
            if (token && isTokenExpired()) {
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('tokenExpiry');
            }
            setLoading(false);
        }
    }, [fetchUserProfile]);

    const login = async (username, password) => {
        try {
            const { data } = await api.post('/api/auth/login/', { username, password });
            securelyStoreToken(data.access);
            setUser(data.user);
            setIsAuthenticated(true);
            navigate('/dashboard');
            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const logout = () => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('tokenExpiry');
        setUser(null);
        setIsAuthenticated(false);
        navigate('/login');
    };

    // Provide a function to refresh the token
    const refreshToken = async () => {
        try {
            const refreshToken = sessionStorage.getItem('refreshToken');
            if (!refreshToken) throw new Error('No refresh token available');

            const { data } = await api.post('/api/auth/token/refresh/', { refresh: refreshToken });
            securelyStoreToken(data.access);
            return true;
        } catch (error) {
            console.error('Token refresh error:', error);
            logout();
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated,
            login,
            logout,
            refreshToken,
            loading
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
