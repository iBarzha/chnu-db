import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <AppBar position="fixed">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          SQL Classroom
        </Typography>

        {user ? (
          <>
            <Typography sx={{ mr: 2 }}>{user.username}</Typography>
            <Button color="inherit" onClick={logout}>
              Выйти
            </Button>
          </>
        ) : (
          <>
            <Button color="inherit" onClick={() => navigate('/login')}>
              Вход
            </Button>
            <Button color="inherit" onClick={() => navigate('/register')}>
              Регистрация
            </Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}