// pages/Home.jsx
import { Container, Box, Typography, Button, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <Container maxWidth="lg">
      <Box sx={{ textAlign: 'center', mt: 4, mb: 4 }}>
        <Typography variant="h2" gutterBottom>
          {t('navbar.appName')}
        </Typography>
        <Typography variant="h5" sx={{ mb: 4 }}>
          {t('home.subtitle')}
        </Typography>

        {!user && (
          <Box sx={{ mb: 4 }}>
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
          </Box>
        )}
      </Box>

      {user ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/dashboard')}
          >
            {t('home.goToDashboard')}
          </Button>
        </Box>
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            {t('common.login')} / {t('common.register')}
          </Typography>
          <Typography variant="body1">
            {t('home.subtitle')}
          </Typography>
        </Paper>
      )}
    </Container>
  );
}
