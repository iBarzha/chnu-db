import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Paper, Box, Button, Divider, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import api from '../api/auth';

export default function TaskDetailPage() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (id) {
      setLoading(true);
      api.get(`/api/assignments/${id}/`)
        .then(res => {
          setTask(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching task:', err);
          setError(t('task.loadingError'));
          setLoading(false);
        });
    }
  }, [id, t]);

  const handleBack = () => {
    if (task && task.course) {
      navigate(`/courses/${task.course}`);
    } else {
      navigate('/courses');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !task) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="error">
            {error || t('task.taskNotFound')}
          </Typography>
          <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate('/courses')}>
            {t('task.backToCourses')}
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4">{task.title}</Typography>
          <Button variant="outlined" onClick={handleBack}>
            {t('task.backToCourse')}
          </Button>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            {t('task.dueDate')}
          </Typography>
          <Typography variant="body1">
            {new Date(task.due_date).toLocaleDateString()}
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            {t('task.description')}
          </Typography>
          <Typography variant="body1">
            {task.description}
          </Typography>
        </Box>

        {/* Additional task details can be added here */}
      </Paper>
    </Container>
  );
}
