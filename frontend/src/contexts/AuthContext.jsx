import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/auth';

const AuthContext = createContext();

// Допоміжна функція для безпечного збереження токена з терміном дії
const securelyStoreToken = (token, refreshToken) => {
    if (!token) return;

    // Зберігаємо у sessionStorage замість localStorage для більшої безпеки
    // (токен буде втрачено після закриття браузера)
    sessionStorage.setItem('token', token);

    // Зберігаємо refresh token, якщо він є
    if (refreshToken) {
        sessionStorage.setItem('refreshToken', refreshToken);
    }

    // Встановлюємо термін дії токена (наприклад, 1 година від поточного часу)
    const expiresAt = new Date().getTime() + 60 * 60 * 1000;
    sessionStorage.setItem('tokenExpiry', expiresAt.toString());
};

// Допоміжна функція для перевірки, чи токен протермінований
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

    // Функція для отримання профілю користувача
    const fetchUserProfile = useCallback(async () => {
        try {
            const { data } = await api.get('/api/auth/profile/');
            setUser(data);
            setIsAuthenticated(true);
            return true;
        } catch (error) {
            console.error('Помилка отримання профілю користувача:', error);
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('tokenExpiry');
            setIsAuthenticated(false);
            setUser(null);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    // Перевірка статусу автентифікації при монтуванні
    useEffect(() => {
        const token = sessionStorage.getItem('token');

        if (token && !isTokenExpired()) {
            fetchUserProfile();
        } else {
            // Очищення протермінованого токена
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
            securelyStoreToken(data.access, data.refresh);
            setUser(data.user);
            setIsAuthenticated(true);
            navigate('/dashboard');
            return data;
        } catch (error) {
            console.error('Помилка входу:', error);
            throw error;
        }
    };

    const logout = () => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('tokenExpiry');
        setUser(null);
        setIsAuthenticated(false);
        navigate('/login');
    };

    // Функція для оновлення токена
    const refreshToken = async () => {
        try {
            const refreshToken = sessionStorage.getItem('refreshToken');
            if (!refreshToken) throw new Error('Відсутній refresh token');

            const { data } = await api.post('/api/auth/token/refresh/', { refresh: refreshToken });
            // Зберігаємо новий access token, залишаючи refresh token
            securelyStoreToken(data.access, refreshToken);
            return true;
        } catch (error) {
            console.error('Помилка оновлення токена:', error);
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
