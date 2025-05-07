import { 
  Container, Typography, Button, Box, Tab, Tabs, 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import AssignmentList from '../components/Assignment/AssignmentList';
import CourseMaterials from '../components/Course/CourseMaterials';
import api from '../api/auth';

export default function CourseDetailPage() {
  const { id } = useParams();
  const [tab, setTab] = useState(0);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { t } = useTranslation();

  useEffect(() => {
    if (id) {
      setLoading(true);
      api.get(`/api/courses/${id}/`)
        .then(res => {
          setCourse(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching course:', err);
          setLoading(false);
        });
    }
  }, [id]);

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
        await api.post(`/api/courses/${id}/assignments/`, values);
        setOpenTaskDialog(false);
        taskFormik.resetForm();
        // Force a re-render of the AssignmentList component by changing the key
        setRefreshKey(prevKey => prevKey + 1);
      } catch (error) {
        console.error('Error creating task:', error);
      }
    }
  });

  const handleOpenTaskDialog = () => {
    setOpenTaskDialog(true);
  };

  const handleCloseTaskDialog = () => {
    setOpenTaskDialog(false);
    taskFormik.resetForm();
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4">{course?.title || 'Course'}</Typography>
        <Button 
          variant="contained" 
          onClick={handleOpenTaskDialog}
        >
          {t('course.addTask')}
        </Button>
      </Box>

      <Tabs value={tab} onChange={(e, newVal) => setTab(newVal)} sx={{ mb: 3 }}>
        <Tab label={t('course.tasks')} />
        <Tab label={t('course.materials')} />
        <Tab label={t('course.members')} />
      </Tabs>

      {tab === 0 && <AssignmentList key={refreshKey} courseId={id} />}
      {tab === 1 && <CourseMaterials courseId={id} />}
      {tab === 2 && (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Course members will be displayed here.
          </Typography>
        </Box>
      )}

      {/* Add Task Dialog */}
      <Dialog open={openTaskDialog} onClose={handleCloseTaskDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{t('course.addTask')}</DialogTitle>
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
            <Button onClick={handleCloseTaskDialog}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">Create</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
}
