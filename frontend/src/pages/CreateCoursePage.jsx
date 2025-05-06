import { Container, TextField, Button, Typography, Box } from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useNavigate } from 'react-router-dom';
import api from '../api/auth';

const validationSchema = Yup.object({
  title: Yup.string().required('Required field'),
  description: Yup.string().required('Required field'),
});

export default function CreateCoursePage() {
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: {
      title: '',
      description: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        await api.post('/api/courses/', values);
        navigate('/courses');
      } catch (error) {
        console.error(error);
      }
    },
  });

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>
        Create a new course
      </Typography>

      <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 3 }}>
        <TextField
          fullWidth
          label="The name of the course"
          name="title"
          value={formik.values.title}
          onChange={formik.handleChange}
          error={formik.touched.title && Boolean(formik.errors.title)}
          helperText={formik.touched.title && formik.errors.title}
          sx={{ mb: 3 }}
        />

        <TextField
          fullWidth
          label="Description"
          name="description"
          multiline
          rows={4}
          value={formik.values.description}
          onChange={formik.handleChange}
          error={formik.touched.description && Boolean(formik.errors.description)}
          helperText={formik.touched.description && formik.errors.description}
          sx={{ mb: 3 }}
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
        >
          Create a course
        </Button>
      </Box>
    </Container>
  );
}