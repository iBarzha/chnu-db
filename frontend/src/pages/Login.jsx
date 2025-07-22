import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Container, Box, Typography, TextField, Button, Alert, CircularProgress,
  InputAdornment, IconButton, Paper, Divider, Snackbar
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export default function Login() {
  // Стан форми
  const [form, setForm] = useState({
    username: '',
    password: ''
  });

  // Стан валідації форми
  const [formErrors, setFormErrors] = useState({
    username: '',
    password: ''
  });

  // Стан інтерфейсу
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);

  // Хуки
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // Переспрямовуємо, якщо користувач вже аутентифікований
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Перевіряємо параметр 'registered' в URL
  useEffect(() => {
    if (location.search.includes('registered=true')) {
      setMessage({ 
        text: t('login.registrationSuccess'), 
        type: 'success' 
      });
      setShowSnackbar(true);
    }
  }, [location, t]);

  // Валідуємо поля форми
  const validateForm = () => {
    let valid = true;
    const errors = { username: '', password: '' };

    if (!form.username.trim()) {
      errors.username = t('login.usernameRequired');
      valid = false;
    }

    if (!form.password) {
      errors.password = t('login.passwordRequired');
      valid = false;
    } else if (form.password.length < 6) {
      errors.password = t('login.passwordMinLength');
      valid = false;
    }

    setFormErrors(errors);
    return valid;
  };

  // Валідація форми при сабміті
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Очищаємо попередні повідомлення
    setMessage({ text: '', type: '' });

    // Валідуємо форму
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await login(form.username, form.password);
      // Переспрямування відбувається через isAuthenticated effect
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 
                          t('login.invalidCredentials');

      setMessage({ text: errorMessage, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Обробляємо зміни в полях
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));

    // Очищаємо помилку, коли користувач друкує
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Перемикаємо видимість пароля
  const handleTogglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <Typography component="h1" variant="h4" sx={{ mb: 3 }}>
            {t('login.title')}
          </Typography>

          {message.text && (
            <Alert
              severity={message.type}
              sx={{ width: '100%', mb: 3 }}
              onClose={() => setMessage({ text: '', type: '' })}
            >
              {message.text}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5
            }}
          >
            {/* Поле для імені користувача */}
            <TextField
              label={t('common.username')}
              name="username"
              variant="outlined"
              fullWidth
              value={form.username}
              onChange={handleChange}
              error={!!formErrors.username}
              helperText={formErrors.username}
              required
              disabled={isLoading}
              autoFocus
            />

            {/* Поле для пароля */}
            <TextField
              label={t('common.password')}
              name="password"
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              fullWidth
              value={form.password}
              onChange={handleChange}
              error={!!formErrors.password}
              helperText={formErrors.password}
              required
              disabled={isLoading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleTogglePasswordVisibility}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
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
                t('common.login')
              )}
            </Button>

            <Divider sx={{ my: 2 }}>{t('common.or')}</Divider>

            <Typography variant="body2" sx={{ textAlign: 'center' }}>
              {t('login.noAccount')}{' '}
              <Link
                to="/register"
                style={{ textDecoration: 'none' }}
              >
                {t('login.registerLink')}
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Snackbar
        open={showSnackbar}
        autoHideDuration={6000}
        onClose={() => setShowSnackbar(false)}
      >
        <Alert 
          onClose={() => setShowSnackbar(false)} 
          severity={message.type || "info"}
          sx={{ width: '100%' }}
        >
          {message.text}
        </Alert>
      </Snackbar>
    </Container>
  );
}
