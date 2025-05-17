import { Box, Button, Container, Paper, TextField, Typography, MenuItem, Select, InputLabel, FormControl } from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/auth';
import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';

const validationSchema = Yup.object({
  title: Yup.string().required('Title is required'),
  description: Yup.string().required('Description is required'),
  due_date: Yup.date().nullable(),
  teacher_database: Yup.string().required('Database selection is required'),
  solution_sql: Yup.string().required('Solution SQL is required')
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
      solution_sql: ''
    },
    validationSchema,
    onSubmit: async (values) => {
      if (isSubmitting) return;

      try {
        setIsSubmitting(true);
        setError(null);

        const taskData = {
          title: values.title,
          description: values.description,
          due_date: values.due_date,
          teacher_database: values.teacher_database,
          solution_sql: values.solution_sql
        };

        const response = await api.post(`/api/courses/${courseId}/assignments/`, taskData);
        navigate(`/courses/${courseId}`);
      } catch (error) {
        console.error('Error creating task:', error);
        setError(error.response?.data?.detail || JSON.stringify(error.response?.data) || error.message || 'Failed to create task. Please try again.');
        setIsSubmitting(false);
      }
    },
  });

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
          {/* Title Field */}
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

          {/* Description Field */}
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

          {/* Due Date Field */}
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

          {/* Database Selection */}
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

          {/* Solution SQL Field */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              {t('task.solutionSql')}
            </Typography>
            <Editor
              height="300px"
              defaultLanguage="sql"
              value={formik.values.solution_sql}
              onChange={(value) => formik.setFieldValue('solution_sql', value)}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                fontSize: 14,
              }}
            />
            {formik.touched.solution_sql && formik.errors.solution_sql && (
              <Typography color="error" variant="caption">
                {formik.errors.solution_sql}
              </Typography>
            )}
          </Box>
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
