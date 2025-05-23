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
    withCredentials: true, // Важно для передачи sessionid
});

// Helper to check if token is expired
const isTokenExpired = () => {
    const expiry = sessionStorage.getItem('tokenExpiry');
    if (!expiry) return true; // Expiry not set
    return new Date().getTime() > parseInt(expiry, 10); // Check if current time exceeds expiry
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
    error => {
        console.error('Request Error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor - handle token expiration and errors globally
api.interceptors.response.use(
    response => response, // Pass through successful responses
    async error => {
        const originalRequest = error.config;

        // Detect Unauthorized (401) errors and retry if appropriate
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Check if the token is expired
                if (isTokenExpired()) {
                    const refreshToken = sessionStorage.getItem('refreshToken');

                    if (!refreshToken) {
                        // No refresh token: redirect to login
                        console.warn('No refresh token found. Redirecting to login...');
                        window.location.href = '/login';
                        return Promise.reject(error);
                    }

                    // Attempt to refresh tokens
                    const refreshResponse = await axios.post(`${BASE_URL}/api/auth/token/refresh/`, {
                        refresh: refreshToken,
                    });

                    if (refreshResponse.data.access) {
                        // Store the new access token
                        const newAccessToken = refreshResponse.data.access;

                        sessionStorage.setItem('token', newAccessToken);
                        const expiresAt = new Date().getTime() + 60 * 60 * 1000; // 1 hour from now
                        sessionStorage.setItem('tokenExpiry', expiresAt.toString());

                        // Retry the original request with the new access token
                        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                        console.log('Token refreshed, retrying original request...');
                        return api(originalRequest);
                    }
                }
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);

                // Clear any invalid tokens and redirect to login
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('refreshToken');
                sessionStorage.removeItem('tokenExpiry');
                window.location.href = '/login';
            }
        }

        // Log other types of errors for debugging
        if (!error.response) {
            console.error('Network or Server Error:', error.message);
        } else {
            console.error(
                `API Error: ${error.response.status} - ${error.response.statusText}`,
                error.response.data
            );
        }

        return Promise.reject(error);
    }
);

export default api;

