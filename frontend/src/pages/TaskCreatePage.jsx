import { Box, Button, Container, Paper, TextField, Typography, MenuItem, Select, InputLabel, FormControl, CircularProgress, Grid, List, ListItem, ListItemText, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert, Divider } from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/auth';
import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import React from 'react';

const validationSchema = Yup.object({
  title: Yup.string().required('Title is required'),
  description: Yup.string().required('Description is required'),
  due_date: Yup.date().nullable(),
  teacher_database: Yup.string().required('Database selection is required'),
  reference_database: Yup.string().required('Reference database selection is required'),
});

export default function TaskCreatePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [databases, setDatabases] = useState([]);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Завантаження даних курсу при монтуванні
  useEffect(() => {
    if (courseId) {
      setLoading(true);
      api.get(`/api/courses/${courseId}/`)
        .then(res => {
          setCourse(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching course:', err);
          setLoading(false);
        });
    }
  }, [courseId]);

  // Завантаження списку баз даних вчителя при монтуванні
  useEffect(() => {
    api.get('/api/teacher-databases/')
      .then(res => {
        setDatabases(res.data);
      })
      .catch(err => {
        console.error('Error fetching databases:', err);
      });
  }, []);

  const formik = useFormik({
    initialValues: {
      title: '',
      description: '',
      due_date: null,
      teacher_database: '',
      reference_database: ''
    },
    validationSchema,
    onSubmit: async (values) => {
      if (isSubmitting) return;

      try {
        setIsSubmitting(true);
        setError(null);

        // Get the selected database
        const selectedDb = await api.get(`/api/teacher-databases/${values.teacher_database}/`);
        if (!selectedDb.data.sql_dump) {
          throw new Error('Selected database has no SQL dump file');
        }

        // Get the reference database
        const referenceDb = await api.get(`/api/teacher-databases/${values.reference_database}/`);
        if (!referenceDb.data.sql_dump) {
          throw new Error('Reference database has no SQL dump file');
        }

        // Create form data
        const formData = new FormData();
        formData.append('title', values.title);
        formData.append('description', values.description);
        if (values.due_date) {
          formData.append('due_date', new Date(values.due_date).toISOString());
        }
        formData.append('course', courseId); // Привязка таска к курсу

        // Fetch the SQL dump file and attach it as original_db
        const response = await fetch(selectedDb.data.sql_dump);
        const blob = await response.blob();
        formData.append('original_db', blob, 'database.sql');

        // Fetch the reference SQL dump and attach as reference_db
        const refResponse = await fetch(referenceDb.data.sql_dump);
        const refBlob = await refResponse.blob();
        formData.append('reference_db', refBlob, 'reference_database.sql');

        console.log('Submitting task data:', values);
        const taskResponse = await api.post('/api/tasks/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        console.log('Server response:', taskResponse);
        navigate(`/courses/${courseId}`);
      } catch (err) {
        console.error('Detailed error:', err.response || err);
        let errorMessage = 'Failed to create task';
        if (err.response) {
          errorMessage = err.response.data?.detail || err.response.data?.message || JSON.stringify(err.response.data) || err.response.statusText;
        }
        setError(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  // Обробка скасування створення завдання
  const handleCancel = () => {
    navigate(`/courses/${courseId}`);
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>
        {t('course.createTask')}
      </Typography>

      {course && (
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          {t('course.courses')}: {course.title}
        </Typography>
      )}

      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Typography variant="body1">{error}</Typography>
        </Paper>
      )}

      <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 3 }}>
        <Paper sx={{ p: 3, mb: 3 }}>
          {/* Поле для назви завдання */}
          <TextField
            fullWidth
            label={t('task.title')}
            name="title"
            value={formik.values.title}
            onChange={formik.handleChange}
            error={formik.touched.title && Boolean(formik.errors.title)}
            helperText={formik.touched.title && formik.errors.title}
            sx={{ mb: 3 }}
          />

          {/* Поле для опису завдання */}
          <TextField
            fullWidth
            label={t('task.description')}
            name="description"
            multiline
            rows={6}
            value={formik.values.description}
            onChange={formik.handleChange}
            error={formik.touched.description && Boolean(formik.errors.description)}
            helperText={formik.touched.description && formik.errors.description}
            sx={{ mb: 3 }}
          />

          {/* Поле для дати дедлайну */}
          <TextField
            fullWidth
            label={t('task.dueDate')}
            name="due_date"
            type="datetime-local"
            value={formik.values.due_date || ''}
            onChange={formik.handleChange}
            InputLabelProps={{
              shrink: true,
            }}
            sx={{ mb: 3 }}
          />

          {/* Вибір бази даних */}
          <FormControl fullWidth sx={{ mb: 3 }} error={formik.touched.teacher_database && Boolean(formik.errors.teacher_database)}>
            <InputLabel>{t('task.selectDatabase')}</InputLabel>
            <Select
              name="teacher_database"
              value={formik.values.teacher_database}
              onChange={formik.handleChange}
              label={t('task.selectDatabase')}
            >
              {databases.map(db => (
                <MenuItem key={db.id} value={db.id}>
                  {db.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Вибір бази даних для еталонного рішення */}
          <FormControl fullWidth sx={{ mb: 3 }} error={formik.touched.reference_database && Boolean(formik.errors.reference_database)}>
            <InputLabel>{t('task.selectReferenceDatabase')}</InputLabel>
            <Select
              name="reference_database"
              value={formik.values.reference_database}
              onChange={formik.handleChange}
              label={t('task.selectReferenceDatabase')}
            >
              {databases.map(db => (
                <MenuItem key={db.id} value={db.id}>
                  {db.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            variant="outlined"
            onClick={handleCancel}
          >
            {t('course.cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isSubmitting}
          >
            {isSubmitting ? t('common.submitting') : t('course.createTask')}
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
