import axios from 'axios';

// Отримуємо базовий URL із середовища або використовуємо за замовчуванням
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Налаштовуємо CSRF захист для Django
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // Таймаут 10 секунд
    withCredentials: true, // Важливо для передачі sessionid
});

// Допоміжна функція для перевірки закінчення терміну дії токена
const isTokenExpired = () => {
    const expiry = sessionStorage.getItem('tokenExpiry');
    if (!expiry) return true; // Термін не встановлено
    return new Date().getTime() > parseInt(expiry, 10); // Перевіряємо, чи поточний час перевищує термін дії
};

// Перехоплювач запитів - додаємо токен до запитів
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

// Перехоплювач відповідей - обробляємо закінчення дії токенів та помилки глобально
api.interceptors.response.use(
    response => response, // Пропускаємо успішні відповіді
    async error => {
        const originalRequest = error.config;

        // Виявляємо помилки Unauthorized (401) та повторюємо за потреби
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Перевіряємо, чи закінчився термін дії токена
                if (isTokenExpired()) {
                    const refreshToken = sessionStorage.getItem('refreshToken');

                    if (!refreshToken) {
                        // Немає refresh token: переспрямовуємо на сторінку входу
                        console.warn('No refresh token found. Redirecting to login...');
                        window.location.href = '/login';
                        return Promise.reject(error);
                    }

                    // Намагаємося оновити токени
                    const refreshResponse = await axios.post(`${BASE_URL}/api/auth/token/refresh/`, {
                        refresh: refreshToken,
                    });

                    if (refreshResponse.data.access) {
                        // Зберігаємо новий access token
                        const newAccessToken = refreshResponse.data.access;

                        sessionStorage.setItem('token', newAccessToken);
                        const expiresAt = new Date().getTime() + 60 * 60 * 1000; // 1 година від поточного моменту
                        sessionStorage.setItem('tokenExpiry', expiresAt.toString());

                        // Повторюємо оригінальний запит з новим access token
                        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                        console.log('Token refreshed, retrying original request...');
                        return api(originalRequest);
                    }
                }
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);

                // Очищаємо недійсні токени та переспрямовуємо на сторінку входу
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('refreshToken');
                sessionStorage.removeItem('tokenExpiry');
                window.location.href = '/login';
            }
        }

        // Логуємо інші типи помилок для налагодження
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

