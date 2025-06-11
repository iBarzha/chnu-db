// TaskCreatePage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Alert,
  CircularProgress
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/auth';

export default function TaskCreatePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [databases, setDatabases] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    due_date: '',
    teacher_database: '',
    reference_database: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [cRes, dbRes] = await Promise.all([
          api.get(`/api/courses/${courseId}/`),
          api.get('/api/teacher-databases/')
        ]);
        setCourse(cRes.data);
        setDatabases(dbRes.data);
      } catch {
        setError('Не вдалося завантажити дані.');
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId]);

  const handleChange = e =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      // 1) Отримуємо URL дампів
      const selRes = await api.get(`/api/teacher-databases/${form.teacher_database}/`);
      const refRes = await api.get(`/api/teacher-databases/${form.reference_database}/`);

      // 2) Формуємо FormData
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      if (form.due_date) {
        fd.append('due_date', new Date(form.due_date).toISOString());
      }
      fd.append('course', courseId);

      // 3) Завантажуємо дампи та додаємо як файли
      const blob1 = await (await fetch(selRes.data.sql_dump)).blob();
      fd.append('original_db', blob1, 'original.sql');

      const blob2 = await (await fetch(refRes.data.sql_dump)).blob();
      fd.append('etalon_db', blob2, 'reference.sql');

      // Debug: переконайтесь, що в fd є обидва ключі
      for (let [k, v] of fd.entries()) {
        console.log(k, v);
      }

      // 4) Відправляємо multipart/form-data
      await api.post('/api/tasks/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      navigate(`/courses/${courseId}`);
    } catch (err) {
      console.error(err);
      const data = err.response?.data;
      setError(
        data?.error ||
        (data && Object.values(data)[0]) ||
        err.message
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container sx={{ textAlign: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Створити завдання
      </Typography>

      {course && (
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Курс: {course.title}
        </Typography>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <TextField
            fullWidth label="Назва" name="title"
            value={form.title} onChange={handleChange}
            required sx={{ mb: 2 }}
          />
          <TextField
            fullWidth label="Опис" name="description" multiline rows={4}
            value={form.description} onChange={handleChange}
            required sx={{ mb: 2 }}
          />
          <TextField
            fullWidth label="Термін" name="due_date" type="datetime-local"
            value={form.due_date} onChange={handleChange}
            InputLabelProps={{ shrink: true }} sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Початковий дамп</InputLabel>
            <Select
              name="teacher_database"
              value={form.teacher_database}
              onChange={handleChange}
              required
            >
              {databases.map(db => (
                <MenuItem key={db.id} value={db.id}>
                  {db.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Еталонний дамп</InputLabel>
            <Select
              name="reference_database"
              value={form.reference_database}
              onChange={handleChange}
              required
            >
              {databases.map(db => (
                <MenuItem key={db.id} value={db.id}>
                  {db.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button variant="outlined" onClick={() => navigate(-1)} disabled={submitting}>
            Скасувати
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Завантаження…' : 'Створити завдання'}
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
