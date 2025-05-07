import { 
  Container, 
  TextField, 
  Button, 
  Typography, 
  Box, 
  Paper, 
  Divider, 
  Grid, 
  FormControl, 
  FormLabel, 
  IconButton,
  InputAdornment,
  Tooltip
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/auth';
import { useState, useEffect } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckIcon from '@mui/icons-material/Check';
import AssessmentIcon from '@mui/icons-material/Assessment';

const validationSchema = Yup.object({
  theory: Yup.string().required('Required field')
});

export default function TaskCreatePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  // State for query fields
  const [demoQueries, setDemoQueries] = useState([
    { id: 1, value: 'SELECT * FROM users', isEditable: false }
  ]);

  const [taskQueries, setTaskQueries] = useState([
    { id: 1, value: '', isEditable: true }
  ]);

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

  // Handler for adding a new demo query
  const handleAddDemoQuery = () => {
    const newId = demoQueries.length > 0 
      ? Math.max(...demoQueries.map(field => field.id)) + 1 
      : 1;
    setDemoQueries([...demoQueries, { id: newId, value: '', isEditable: false }]);
  };

  // Handler for removing a demo query
  const handleRemoveDemoQuery = (id) => {
    setDemoQueries(demoQueries.filter(field => field.id !== id));
  };

  // Handler for updating a demo query
  const handleDemoQueryChange = (id, value) => {
    setDemoQueries(demoQueries.map(field => 
      field.id === id ? { ...field, value } : field
    ));
  };

  // Handler for adding a new task query
  const handleAddTaskQuery = () => {
    const newId = taskQueries.length > 0 
      ? Math.max(...taskQueries.map(field => field.id)) + 1 
      : 1;
    setTaskQueries([...taskQueries, { id: newId, value: '', isEditable: true }]);
  };

  // Handler for removing a task query
  const handleRemoveTaskQuery = (id) => {
    setTaskQueries(taskQueries.filter(field => field.id !== id));
  };

  // Handler for updating a task query
  const handleTaskQueryChange = (id, value) => {
    setTaskQueries(taskQueries.map(field => 
      field.id === id ? { ...field, value } : field
    ));
  };

  // Handler for moving a query up
  const handleMoveQueryUp = (queries, setQueries, index) => {
    if (index <= 0) return; // Can't move the first item up

    const newQueries = [...queries];
    const temp = newQueries[index];
    newQueries[index] = newQueries[index - 1];
    newQueries[index - 1] = temp;

    setQueries(newQueries);
  };

  // Handler for moving a query down
  const handleMoveQueryDown = (queries, setQueries, index) => {
    if (index >= queries.length - 1) return; // Can't move the last item down

    const newQueries = [...queries];
    const temp = newQueries[index];
    newQueries[index] = newQueries[index + 1];
    newQueries[index + 1] = temp;

    setQueries(newQueries);
  };

  // Handler for running a query
  const handleRunQuery = (query) => {
    console.log(`Running query: ${query}`);
    // In a real app, this would send the query to the backend for execution
    alert(`Running query: ${query}`);
  };

  // Handler for checking a query
  const handleCheckQuery = (query) => {
    console.log(`Checking query: ${query}`);
    // In a real app, this would send the query to the backend for validation
    alert(`Checking query: ${query}`);
  };

  // Handler for viewing query results
  const handleViewResults = (query) => {
    console.log(`Viewing results for query: ${query}`);
    // In a real app, this would display the results of the query
    alert(`Results for query: ${query}`);
  };

  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formik = useFormik({
    initialValues: {
      theory: ''
    },
    validationSchema,
    onSubmit: async (values) => {
      if (isSubmitting) return; // Prevent multiple submissions

      try {
        setIsSubmitting(true);
        setError(null);
        // Combine form values with query data
        const taskData = {
          title: "Task", // Default title
          description: values.theory || '', // Use theory as description, ensure it's not undefined
          schema_script: 'CREATE TABLE example (id INT);', // Default schema script
          solution_hash: 'default_hash_value', // Default solution hash
          due_date: null // Explicitly set due_date to null
        };

        console.log('Sending task data:', taskData);
        const response = await api.post(`/api/courses/${courseId}/assignments/`, taskData);
        console.log('Task created successfully:', response.data);
        navigate(`/courses/${courseId}`);
      } catch (error) {
        console.error('Error creating task:', error);
        console.error('Error response data:', error.response?.data);
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

        {/* Theory/Description Section */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>{t('task.theory')}</Typography>
          <TextField
            fullWidth
            label={t('task.theoryLabel')}
            name="theory"
            multiline
            rows={6}
            value={formik.values.theory}
            onChange={formik.handleChange}
            error={formik.touched.theory && Boolean(formik.errors.theory)}
            helperText={formik.touched.theory && formik.errors.theory}
            sx={{ mb: 3 }}
          />
        </Paper>

        {/* Demonstration Queries Section */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{t('task.queries')} ({t('task.demonstration')})</Typography>
            <Button 
              variant="outlined" 
              startIcon={<AddIcon />}
              onClick={handleAddDemoQuery}
            >
              {t('task.addQuery')}
            </Button>
          </Box>

          {demoQueries.map((query, index) => (
            <Box key={query.id} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TextField
                  fullWidth
                  label={`${t('task.query')} ${index + 1}`}
                  value={query.value}
                  onChange={(e) => handleDemoQueryChange(query.id, e.target.value)}
                  multiline
                  rows={2}
                  InputProps={{
                    readOnly: !query.isEditable,
                  }}
                  sx={{ mr: 1 }}
                />
                <Box>
                  <IconButton 
                    color="primary" 
                    onClick={() => handleRunQuery(query.value)}
                    title={t('task.run')}
                  >
                    <PlayArrowIcon />
                  </IconButton>
                  <IconButton 
                    color="primary" 
                    onClick={() => handleViewResults(query.value)}
                    title={t('task.results')}
                  >
                    <AssessmentIcon />
                  </IconButton>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  {t('task.textChangeBlocked')}
                </Typography>
                <Box>
                  <IconButton
                    onClick={() => handleMoveQueryUp(demoQueries, setDemoQueries, index)}
                    disabled={index === 0}
                    size="small"
                  >
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    onClick={() => handleMoveQueryDown(demoQueries, setDemoQueries, index)}
                    disabled={index === demoQueries.length - 1}
                    size="small"
                  >
                    <ArrowDownwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    onClick={() => handleRemoveDemoQuery(query.id)}
                    size="small"
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              {index < demoQueries.length - 1 && <Divider sx={{ mt: 2, mb: 2 }} />}
            </Box>
          ))}
        </Paper>

        {/* Task Queries Section */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{t('task.queries')}</Typography>
            <Button 
              variant="outlined" 
              startIcon={<AddIcon />}
              onClick={handleAddTaskQuery}
            >
              {t('task.addQuery')}
            </Button>
          </Box>

          {taskQueries.map((query, index) => (
            <Box key={query.id} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TextField
                  fullWidth
                  label={`${t('task.query')} ${index + 1}`}
                  value={query.value}
                  onChange={(e) => handleTaskQueryChange(query.id, e.target.value)}
                  multiline
                  rows={2}
                  sx={{ mr: 1 }}
                />
                <Box>
                  <IconButton 
                    color="primary" 
                    onClick={() => handleRunQuery(query.value)}
                    title={t('task.run')}
                  >
                    <PlayArrowIcon />
                  </IconButton>
                  <IconButton 
                    color="primary" 
                    onClick={() => handleCheckQuery(query.value)}
                    title={t('task.check')}
                  >
                    <CheckIcon />
                  </IconButton>
                  <IconButton 
                    color="primary" 
                    onClick={() => handleViewResults(query.value)}
                    title={t('task.results')}
                  >
                    <AssessmentIcon />
                  </IconButton>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  {index === 0 ? t('task.individualLinesChangeable') : t('task.writeFullQuery')}
                </Typography>
                <Box>
                  <IconButton
                    onClick={() => handleMoveQueryUp(taskQueries, setTaskQueries, index)}
                    disabled={index === 0}
                    size="small"
                  >
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    onClick={() => handleMoveQueryDown(taskQueries, setTaskQueries, index)}
                    disabled={index === taskQueries.length - 1}
                    size="small"
                  >
                    <ArrowDownwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    onClick={() => handleRemoveTaskQuery(query.id)}
                    size="small"
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              {index < taskQueries.length - 1 && <Divider sx={{ mt: 2, mb: 2 }} />}
            </Box>
          ))}
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
