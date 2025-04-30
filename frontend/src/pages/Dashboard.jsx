import { useAuth } from '../contexts/AuthContext';
import { Typography, Button, Container } from '@mui/material';

export default function Dashboard() {
    const { user, logout } = useAuth();

    return (
        <Container>
            <Typography variant="h4" gutterBottom>
                Добро пожаловать, {user?.username}!
            </Typography>
            <Typography variant="body1">
                Ваша роль: {user?.role === 'TEACHER' ? 'Преподаватель' : 'Студент'}
            </Typography>
            <Button
                variant="outlined"
                color="error"
                onClick={logout}
                sx={{ mt: 3 }}
            >
                Выйти
            </Button>
        </Container>
    );
}