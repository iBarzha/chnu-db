import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container, Box, Typography, TextField, Button,
} from '@mui/material';
import api from '../api/auth';
import { useTranslation } from 'react-i18next';

export default function Register() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'STUDENT'
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Валідація форми при сабміті
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/auth/register/', form);
      navigate('/login?registered=true');
    } catch (err) {
      setError(err.response?.data?.message || t('register.error'));
    }
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, textAlign: 'center' }}>
        <Typography variant="h4">{t('register.title')}</Typography>

        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          {/* Поле для імені користувача */}
          <TextField
            label={t('common.username')}
            fullWidth
            margin="normal"
            value={form.username}
            onChange={(e) => setForm({...form, username: e.target.value})}
            required
          />

          {/* Поле для email */}
          <TextField
            label={t('common.email')}
            type="email"
            fullWidth
            margin="normal"
            value={form.email}
            onChange={(e) => setForm({...form, email: e.target.value})}
            required
          />

          {/* Поле для пароля */}
          <TextField
            label={t('common.password')}
            type="password"
            fullWidth
            margin="normal"
            value={form.password}
            onChange={(e) => setForm({...form, password: e.target.value})}
            required
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            {t('common.register')}
          </Button>

          <Typography>
            {t('register.alreadyHaveAccount')} <Link to="/login">{t('register.loginLink')}</Link>
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}
