import { 
  Container, 
  Grid, 
  Typography, 
  Button, 
  Box, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField,
  DialogContentText
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CourseCard from '../components/Course/CourseCard';
import api from '../api/auth';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Add as AddIcon } from '@mui/icons-material';

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const { t } = useTranslation();

  const fetchCourses = () => {
    api.get('/api/courses/')
      .then(res => setCourses(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleEditCourse = (course) => {
    setSelectedCourse(course);
    setOpenEditDialog(true);
  };

  const handleDeleteCourse = (course) => {
    setSelectedCourse(course);
    setOpenDeleteDialog(true);
  };

  const handleCreateTask = (course) => {
    setSelectedCourse(course);
    setOpenTaskDialog(true);
  };

  const confirmDeleteCourse = async () => {
    try {
      await api.delete(`/api/courses/${selectedCourse.id}/`);
      fetchCourses();
      setOpenDeleteDialog(false);
      alert(t('course.courseDeleted'));
    } catch (error) {
      console.error('Error deleting course:', error);
    }
  };

  const editFormik = useFormik({
    initialValues: {
      title: selectedCourse?.title || '',
      description: selectedCourse?.description || '',
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      title: Yup.string().required('Title is required'),
      description: Yup.string().required('Description is required'),
    }),
    onSubmit: async (values) => {
      try {
        await api.put(`/api/courses/${selectedCourse.id}/`, values);
        fetchCourses();
        setOpenEditDialog(false);
        alert(t('course.courseUpdated'));
      } catch (error) {
        console.error('Error updating course:', error);
      }
    },
  });

  const taskFormik = useFormik({
    initialValues: {
      title: '',
      description: '',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Default to 1 week from now
    },
    validationSchema: Yup.object({
      title: Yup.string().required('Title is required'),
      description: Yup.string().required('Description is required'),
      due_date: Yup.date().required('Due date is required')
    }),
    onSubmit: async (values) => {
      try {
        await api.post(`/api/courses/${selectedCourse.id}/assignments/`, values);
        setOpenTaskDialog(false);
        taskFormik.resetForm();
        alert('Task created successfully');
      } catch (error) {
        console.error('Error creating task:', error);
      }
    }
  });

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {t('course.myCourses')}
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => window.location.href = '/create-course'}
        >
          {t('sidebar.createCourse')}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {courses.map(course => (
          <Grid item key={course.id} xs={12} sm={6} md={4}>
            <CourseCard 
              course={course} 
              onEdit={handleEditCourse} 
              onDelete={handleDeleteCourse} 
              onCreateTask={handleCreateTask}
            />
          </Grid>
        ))}
      </Grid>

      {/* Edit Course Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('course.editCourse')}</DialogTitle>
        <form onSubmit={editFormik.handleSubmit}>
          <DialogContent>
            <TextField
              fullWidth
              margin="normal"
              label="Title"
              name="title"
              value={editFormik.values.title}
              onChange={editFormik.handleChange}
              error={editFormik.touched.title && Boolean(editFormik.errors.title)}
              helperText={editFormik.touched.title && editFormik.errors.title}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Description"
              name="description"
              multiline
              rows={4}
              value={editFormik.values.description}
              onChange={editFormik.handleChange}
              error={editFormik.touched.description && Boolean(editFormik.errors.description)}
              helperText={editFormik.touched.description && editFormik.errors.description}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenEditDialog(false)}>{t('course.cancel')}</Button>
            <Button type="submit" variant="contained" color="primary">{t('course.save')}</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Course Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>{t('course.deleteCourse')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('course.confirmDelete')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>{t('course.cancel')}</Button>
          <Button onClick={confirmDeleteCourse} color="error" variant="contained">
            {t('course.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={openTaskDialog} onClose={() => setOpenTaskDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('course.createTask')}</DialogTitle>
        <form onSubmit={taskFormik.handleSubmit}>
          <DialogContent>
            <TextField
              fullWidth
              margin="normal"
              label="Title"
              name="title"
              value={taskFormik.values.title}
              onChange={taskFormik.handleChange}
              error={taskFormik.touched.title && Boolean(taskFormik.errors.title)}
              helperText={taskFormik.touched.title && taskFormik.errors.title}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Description"
              name="description"
              multiline
              rows={4}
              value={taskFormik.values.description}
              onChange={taskFormik.handleChange}
              error={taskFormik.touched.description && Boolean(taskFormik.errors.description)}
              helperText={taskFormik.touched.description && taskFormik.errors.description}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Due Date"
              name="due_date"
              type="date"
              value={taskFormik.values.due_date}
              onChange={taskFormik.handleChange}
              error={taskFormik.touched.due_date && Boolean(taskFormik.errors.due_date)}
              helperText={taskFormik.touched.due_date && taskFormik.errors.due_date}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenTaskDialog(false)}>{t('course.cancel')}</Button>
            <Button type="submit" variant="contained" color="primary">{t('course.save')}</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
}
