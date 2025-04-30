import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container, Box, Typography, TextField, Button,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import api from '../api/auth';

export default function Register() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'STUDENT'
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/auth/register/', form);
      navigate('/login?registered=true');
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка регистрации');
    }
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, textAlign: 'center' }}>
        <Typography variant="h4">Регистрация</Typography>

        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <TextField
            label="Логин"
            fullWidth
            margin="normal"
            value={form.username}
            onChange={(e) => setForm({...form, username: e.target.value})}
            required
          />

          <TextField
            label="Email"
            type="email"
            fullWidth
            margin="normal"
            value={form.email}
            onChange={(e) => setForm({...form, email: e.target.value})}
            required
          />

          <TextField
            label="Пароль"
            type="password"
            fullWidth
            margin="normal"
            value={form.password}
            onChange={(e) => setForm({...form, password: e.target.value})}
            required
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Роль</InputLabel>
            <Select
              value={form.role}
              label="Роль"
              onChange={(e) => setForm({...form, role: e.target.value})}
            >
              <MenuItem value="STUDENT">Студент</MenuItem>
              <MenuItem value="TEACHER">Преподаватель</MenuItem>
            </Select>
          </FormControl>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Зарегистрироваться
          </Button>

          <Typography>
            Уже есть аккаунт? <Link to="/login">Войти</Link>
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}