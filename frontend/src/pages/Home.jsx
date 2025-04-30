// pages/Home.jsx
import { Container, Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <Container maxWidth="md">
      <Box sx={{ textAlign: 'center', mt: 8 }}>
        <Typography variant="h2" gutterBottom>
          SQL Classroom
        </Typography>
        <Typography variant="h5" sx={{ mb: 4 }}>
          Платформа для обучения работе с базами данных
        </Typography>

        {user ? (
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/dashboard')}
          >
            Перейти в кабинет
          </Button>
        ) : (
          <>
            <Button
              variant="contained"
              size="large"
              sx={{ mr: 2 }}
              onClick={() => navigate('/login')}
            >
              Вход
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/register')}
            >
              Регистрация
            </Button>
          </>
        )}
      </Box>
    </Container>
  );
}