import { useAuth } from '../contexts/AuthContext';
import { Typography, Button, Container, Box, Paper, Grid } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function Dashboard() {
    const { user, logout } = useAuth();
    const [greeting, setGreeting] = useState('');
    const { t } = useTranslation();

    // Get role display name
    const getRoleDisplay = (role) => {
        switch(role) {
            case 'ADMIN':
                return t('common.admin');
            case 'TEACHER':
                return t('common.teacher');
            case 'STUDENT':
                return t('common.student');
            default:
                return t('common.user');
        }
    };

    // Set greeting based on time of day
    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) {
            setGreeting(t('dashboard.greeting.morning'));
        } else if (hour < 18) {
            setGreeting(t('dashboard.greeting.afternoon'));
        } else {
            setGreeting(t('dashboard.greeting.evening'));
        }
    }, [t]);

    if (!user) {
        return (
            <Container>
                <Typography variant="h5" color="error">
                    {t('dashboard.notAuthorized')}
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
                    {t('dashboard.yourRole')} <strong>{getRoleDisplay(user.role)}</strong>
                </Typography>

                <Grid container spacing={3} sx={{ mt: 2 }}>
                    {/* Dashboard content can be added here based on user role */}
                    <Grid item xs={12}>
                        <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                            <Typography variant="h6" gutterBottom>
                                {t('dashboard.recentActivities')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {t('dashboard.activitiesInfo')}
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>

                <Box sx={{ mt: 4, mb: 4 }}>
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h5" gutterBottom>
                            {t('sql.welcome')}
                        </Typography>
                        <Typography variant="body1" paragraph>
                            {t('sql.introText')}
                        </Typography>
                        <Typography variant="body1">
                            {t('sql.featuresText')}
                        </Typography>
                    </Paper>


                </Box>

                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        variant="outlined"
                        color="error"
                        onClick={logout}
                    >
                        {t('common.logout')}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}
