// pages/Home.jsx
import { Container, Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <Container maxWidth="md">
      <Box sx={{ textAlign: 'center', mt: 8 }}>
        <Typography variant="h2" gutterBottom>
          {t('navbar.appName')}
        </Typography>
        <Typography variant="h5" sx={{ mb: 4 }}>
          {t('home.subtitle')}
        </Typography>

        {user ? (
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/dashboard')}
          >
            {t('home.goToDashboard')}
          </Button>
        ) : (
          <>
            <Button
              variant="contained"
              size="large"
              sx={{ mr: 2 }}
              onClick={() => navigate('/login')}
            >
              {t('common.login')}
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/register')}
            >
              {t('common.register')}
            </Button>
          </>
        )}
      </Box>
    </Container>
  );
}
