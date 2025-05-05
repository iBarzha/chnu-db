import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <AppBar position="fixed">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {t('navbar.appName')}
        </Typography>

        <LanguageSwitcher />

        {user ? (
          <>
            <Typography sx={{ mr: 2 }}>{user.username}</Typography>
            <Button color="inherit" onClick={logout}>
              {t('common.logout')}
            </Button>
          </>
        ) : (
          <>
            <Button color="inherit" onClick={() => navigate('/login')}>
              {t('common.login')}
            </Button>
            <Button color="inherit" onClick={() => navigate('/register')}>
              {t('common.register')}
            </Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}
