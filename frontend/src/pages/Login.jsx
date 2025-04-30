import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Container, Box, Typography, TextField, Button, Alert, CircularProgress
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [form, setForm] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Если уже авторизован - перенаправляем
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Проверяем параметр 'registered' в URL
  useEffect(() => {
    if (location.search.includes('registered=true')) {
      setError('Регистрация успешна! Теперь войдите в систему');
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(form.username, form.password);
      // Перенаправление теперь происходит через эффект isAuthenticated
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Неверные учетные данные. Проверьте логин и пароль'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{
        mt: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <Typography component="h1" variant="h4" sx={{ mb: 2 }}>
          Вход в систему
        </Typography>

        {error && (
          <Alert
            severity={error.includes('успех') ? 'success' : 'error'}
            sx={{ width: '100%', mb: 3 }}
          >
            {error}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}
        >
          <TextField
            label="Логин"
            variant="outlined"
            fullWidth
            value={form.username}
            onChange={(e) => setForm({...form, username: e.target.value})}
            required
            disabled={isLoading}
          />

          <TextField
            label="Пароль"
            type="password"
            variant="outlined"
            fullWidth
            value={form.password}
            onChange={(e) => setForm({...form, password: e.target.value})}
            required
            disabled={isLoading}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isLoading}
            sx={{ mt: 1, height: 48 }}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Войти'
            )}
          </Button>

          <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
            Нет аккаунта?{' '}
            <Link
              to="/register"
              style={{ textDecoration: 'none' }}
            >
              Зарегистрируйтесь
            </Link>
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}