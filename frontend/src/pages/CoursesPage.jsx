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
  DialogContentText,
  Snackbar,
  Alert
} from '@mui/material';
import { useEffect, useState, useCallback } from 'react';
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
  const [openCreateCourseDialog, setOpenCreateCourseDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const { t } = useTranslation();

  const showNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  const fetchCourses = useCallback(() => {
    api.get('/api/courses/')
      .then(res => setCourses(res.data))
      .catch(err => {
        console.error(err);
        showNotification(t('course.fetchError'), 'error');
      });
  }, []);

  // Отримання списку курсів при монтуванні компонента
  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

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

  const handleOpenCreateCourseDialog = () => {
    setOpenCreateCourseDialog(true);
  };

  const confirmDeleteCourse = async () => {
    try {
      await api.delete(`/api/courses/${selectedCourse.id}/`);
      fetchCourses();
      setOpenDeleteDialog(false);
      showNotification(t('course.courseDeleted'), 'success');
    } catch (error) {
      console.error('Error deleting course:', error);
      showNotification(t('course.deleteError'), 'error');
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
        showNotification(t('course.courseUpdated'), 'success');
      } catch (error) {
        console.error('Error updating course:', error);
        showNotification(t('course.updateError'), 'error');
      }
    },
  });

  const taskFormik = useFormik({
    initialValues: {
      title: '',
      description: '',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // \u0417\u0430 \u0437\u0430\u043c\u043e\u0432\u0447\u0443\u0432\u0430\u043d\u043d\u044f\u043c \u0442\u0438\u0436\u0434\u0435\u043d\u044c \u0432\u0456\u0434 \u0441\u044c\u043e\u0433\u043e\u0434\u043d\u0456
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
        showNotification(t('course.taskCreated'), 'success');
      } catch (error) {
        console.error('Error creating task:', error);
        showNotification(t('course.taskError'), 'error');
      }
    }
  });

  const createCourseFormik = useFormik({
    initialValues: {
      title: '',
      description: '',
    },
    validationSchema: Yup.object({
      title: Yup.string().required('Title is required'),
      description: Yup.string().required('Description is required'),
    }),
    onSubmit: async (values) => {
      try {
        await api.post('/api/courses/', values);
        fetchCourses();
        setOpenCreateCourseDialog(false);
        createCourseFormik.resetForm();
        showNotification(t('course.courseCreated') || 'Course created successfully', 'success');
      } catch (error) {
        console.error('Error creating course:', error);
        showNotification(t('course.createError') || 'Failed to create course', 'error');
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
          onClick={handleOpenCreateCourseDialog}
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

      {/* Діалог редагування курсу */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('course.editCourse')}</DialogTitle>
        <form onSubmit={editFormik.handleSubmit}>
          <DialogContent>
            {/* Поле для назви курсу */}
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
            {/* Поле для опису курсу */}
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

      {/* Діалог видалення курсу */}
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

      {/* Діалог створення завдання */}
      <Dialog open={openTaskDialog} onClose={() => setOpenTaskDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('course.createTask')}</DialogTitle>
        <form onSubmit={taskFormik.handleSubmit}>
          <DialogContent>
            {/* Поля для створення завдання */}
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
            {/* Дата дедлайну для завдання */}
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

      {/* Діалог створення курсу */}
      <Dialog open={openCreateCourseDialog} onClose={() => setOpenCreateCourseDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('sidebar.createCourse')}</DialogTitle>
        <form onSubmit={createCourseFormik.handleSubmit}>
          <DialogContent>
            {/* Поля для створення курсу */}
            <TextField
              fullWidth
              margin="normal"
              label="Title"
              name="title"
              value={createCourseFormik.values.title}
              onChange={createCourseFormik.handleChange}
              error={createCourseFormik.touched.title && Boolean(createCourseFormik.errors.title)}
              helperText={createCourseFormik.touched.title && createCourseFormik.errors.title}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Description"
              name="description"
              multiline
              rows={4}
              value={createCourseFormik.values.description}
              onChange={createCourseFormik.handleChange}
              error={createCourseFormik.touched.description && Boolean(createCourseFormik.errors.description)}
              helperText={createCourseFormik.touched.description && createCourseFormik.errors.description}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCreateCourseDialog(false)}>{t('course.cancel')}</Button>
            <Button type="submit" variant="contained" color="primary">{t('course.save')}</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Сповіщення (Snackbar) */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
