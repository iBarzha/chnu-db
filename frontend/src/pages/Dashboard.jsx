import { useAuth } from '../contexts/AuthContext';
import { Typography, Button, Container, Box, Paper, Grid } from '@mui/material';
import { useEffect, useState } from 'react';

export default function Dashboard() {
    const { user, logout } = useAuth();
    const [greeting, setGreeting] = useState('');

    // Get role display name
    const getRoleDisplay = (role) => {
        switch(role) {
            case 'ADMIN':
                return 'Администратор';
            case 'TEACHER':
                return 'Преподаватель';
            case 'STUDENT':
                return 'Студент';
            default:
                return 'Пользователь';
        }
    };

    // Set greeting based on time of day
    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) {
            setGreeting('Доброе утро');
        } else if (hour < 18) {
            setGreeting('Добрый день');
        } else {
            setGreeting('Добрый вечер');
        }
    }, []);

    if (!user) {
        return (
            <Container>
                <Typography variant="h5" color="error">
                    Пользователь не авторизован
                </Typography>
            </Container>
        );
    }

    return (
        <Container>
            <Paper elevation={3} sx={{ p: 4, mt: 2, mb: 4 }}>
                <Typography variant="h4" gutterBottom>
                    {greeting}, {user.username}!
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                    Ваша роль: <strong>{getRoleDisplay(user.role)}</strong>
                </Typography>

                <Grid container spacing={3} sx={{ mt: 2 }}>
                    {/* Dashboard content can be added here based on user role */}
                    <Grid item xs={12}>
                        <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                            <Typography variant="h6" gutterBottom>
                                Последние активности
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Здесь будет отображаться информация о последних активностях.
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>

                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        variant="outlined"
                        color="error"
                        onClick={logout}
                    >
                        Выйти
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}
