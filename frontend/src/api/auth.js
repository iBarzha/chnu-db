import axios from 'axios';

// Get base URL from environment or use default
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Configure CSRF protection for Django
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 seconds timeout
});

// Helper to check if token is expired
const isTokenExpired = () => {
    const expiry = sessionStorage.getItem('tokenExpiry');
    if (!expiry) return true;
    return new Date().getTime() > parseInt(expiry);
};

// Request interceptor - add token to requests
api.interceptors.request.use(
    config => {
        const token = sessionStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    error => Promise.reject(error)
);

// Response interceptor - handle token expiration
api.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;

        // If error is 401 Unauthorized and we haven't tried to refresh the token yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Check if token is expired
                if (isTokenExpired()) {
                    // Try to refresh the token
                    const refreshToken = sessionStorage.getItem('refreshToken');
                    if (!refreshToken) {
                        // No refresh token available, redirect to login
                        window.location.href = '/login';
                        return Promise.reject(error);
                    }

                    const response = await axios.post(`${BASE_URL}/api/auth/token/refresh/`, {
                        refresh: refreshToken
                    });

                    if (response.data.access) {
                        // Store the new token
                        sessionStorage.setItem('token', response.data.access);
                        const expiresAt = new Date().getTime() + 60 * 60 * 1000; // 1 hour
                        sessionStorage.setItem('tokenExpiry', expiresAt.toString());

                        // Update the Authorization header
                        originalRequest.headers.Authorization = `Bearer ${response.data.access}`;

                        // Retry the original request
                        return api(originalRequest);
                    }
                }
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                // Clear tokens and redirect to login
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('refreshToken');
                sessionStorage.removeItem('tokenExpiry');
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

// Authentication specific functions
export const authService = {
    login: (username, password) => api.post('/api/auth/login/', { username, password }),
    register: (userData) => api.post('/api/auth/register/', userData),
    getProfile: () => api.get('/api/auth/profile/'),
    refreshToken: (refresh) => api.post('/api/auth/token/refresh/', { refresh }),
    logout: () => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('tokenExpiry');
    }
};

export default api;
