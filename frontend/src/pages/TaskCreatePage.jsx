import { Container, TextField, Button, Typography, Box } from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/auth';
import { useState, useEffect } from 'react';

const validationSchema = Yup.object({
  title: Yup.string().required('Required field'),
  description: Yup.string().required('Required field'),
  due_date: Yup.date().required('Required field')
});

export default function TaskCreatePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const formik = useFormik({
    initialValues: {
      title: '',
      description: '',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Default to 1 week from now
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        await api.post(`/api/courses/${courseId}/assignments/`, values);
        navigate(`/courses/${courseId}`);
      } catch (error) {
        console.error('Error creating task:', error);
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

      <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 3 }}>
        <TextField
          fullWidth
          label={t('task.taskDetails')}
          name="title"
          value={formik.values.title}
          onChange={formik.handleChange}
          error={formik.touched.title && Boolean(formik.errors.title)}
          helperText={formik.touched.title && formik.errors.title}
          sx={{ mb: 3 }}
        />

        <TextField
          fullWidth
          label={t('task.description')}
          name="description"
          multiline
          rows={4}
          value={formik.values.description}
          onChange={formik.handleChange}
          error={formik.touched.description && Boolean(formik.errors.description)}
          helperText={formik.touched.description && formik.errors.description}
          sx={{ mb: 3 }}
        />

        <TextField
          fullWidth
          label={t('task.dueDate')}
          name="due_date"
          type="date"
          value={formik.values.due_date}
          onChange={formik.handleChange}
          error={formik.touched.due_date && Boolean(formik.errors.due_date)}
          helperText={formik.touched.due_date && formik.errors.due_date}
          InputLabelProps={{
            shrink: true,
          }}
          sx={{ mb: 3 }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
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
          >
            {t('course.createTask')}
          </Button>
        </Box>
      </Box>
    </Container>
  );
}