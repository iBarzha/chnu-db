import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Paper, Box, Button, Divider, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import api from '../api/auth';
import Editor from '@monaco-editor/react';

export default function TaskDetailPage() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentSql, setStudentSql] = useState('');
  const [submitResult, setSubmitResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Завантаження завдання при монтуванні компонента
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

  // Повернення до курсу або списку курсів
  const handleBack = () => {
    if (task && task.course) {
      navigate(`/courses/${task.course}`);
    } else {
      navigate('/courses');
    }
  };

  // Відправка SQL-відповіді студента
  const handleSubmitSql = async () => {
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await api.post(`/api/tasks/${id}/submit/`, { sql: studentSql });
      setSubmitResult(res.data);
    } catch (err) {
      setSubmitResult({ error: err.response?.data?.error || err.message || 'Submission failed.' });
    } finally {
      setSubmitting(false);
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

        <Divider sx={{ my: 3 }} />
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6">Your SQL Solution</Typography>
          <Editor
            height="200px"
            defaultLanguage="sql"
            value={studentSql}
            onChange={setStudentSql}
            options={{ minimap: { enabled: false }, fontSize: 14 }}
          />
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={handleSubmitSql}
            disabled={submitting || !studentSql}
          >
            {submitting ? 'Submitting...' : 'Submit Solution'}
          </Button>
        </Box>
        {/* Відображення результату перевірки SQL-відповіді */}
        {submitResult && (
          <Box sx={{ mt: 2 }}>
            {submitResult.correct ? (
              <Typography color="success.main">Correct! Your solution matches the reference.</Typography>
            ) : submitResult.error ? (
              <Typography color="error">{submitResult.error}</Typography>
            ) : (
              <Typography color="warning.main">Incorrect. Please try again.</Typography>
            )}
          </Box>
        )}
      </Paper>
    </Container>
  );
}
