import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Container, Box, Typography, TextField, Button, Alert, CircularProgress,
  InputAdornment, IconButton, Paper, Divider, Snackbar
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  // Form state
  const [form, setForm] = useState({
    username: '',
    password: ''
  });

  // Form validation state
  const [formErrors, setFormErrors] = useState({
    username: '',
    password: ''
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);

  // Hooks
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Check for 'registered' parameter in URL
  useEffect(() => {
    if (location.search.includes('registered=true')) {
      setMessage({ 
        text: 'Регистрация успешна! Теперь войдите в систему', 
        type: 'success' 
      });
      setShowSnackbar(true);
    }
  }, [location]);

  // Validate form fields
  const validateForm = () => {
    let valid = true;
    const errors = { username: '', password: '' };

    if (!form.username.trim()) {
      errors.username = 'Логин обязателен';
      valid = false;
    }

    if (!form.password) {
      errors.password = 'Пароль обязателен';
      valid = false;
    } else if (form.password.length < 6) {
      errors.password = 'Пароль должен содержать минимум 6 символов';
      valid = false;
    }

    setFormErrors(errors);
    return valid;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous messages
    setMessage({ text: '', type: '' });

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await login(form.username, form.password);
      // Redirect happens via the isAuthenticated effect
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 
                          'Неверные учетные данные. Проверьте логин и пароль';

      setMessage({ text: errorMessage, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));

    // Clear error when user types
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Toggle password visibility
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
            Вход в систему
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
            <TextField
              label="Логин"
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

            <TextField
              label="Пароль"
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
                'Войти'
              )}
            </Button>

            <Divider sx={{ my: 2 }}>или</Divider>

            <Typography variant="body2" sx={{ textAlign: 'center' }}>
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
      </Paper>

      <Snackbar
        open={showSnackbar}
        autoHideDuration={6000}
        onClose={() => setShowSnackbar(false)}
        message={message.text}
      />
    </Container>
  );
}
