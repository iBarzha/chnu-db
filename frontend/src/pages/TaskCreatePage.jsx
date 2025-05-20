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
  standard_solution: Yup.string()
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
  const [savedSolution, setSavedSolution] = useState('');
  const [showChanges, setShowChanges] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [columns, setColumns] = useState([]);
  const [tables, setTables] = useState([]);
  const [schema, setSchema] = useState({});
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState(null);
  const [querySuccess, setQuerySuccess] = useState(null);

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
      standard_solution: ''
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

        // Create form data
        const formData = new FormData();
        formData.append('title', values.title);
        formData.append('description', values.description);
        if (values.due_date) {
          formData.append('due_date', values.due_date);
        }

        // Fetch the SQL dump file and attach it as original_db
        const response = await fetch(selectedDb.data.sql_dump);
        const blob = await response.blob();
        formData.append('original_db', blob, 'database.sql');

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

  useEffect(() => {
    const fetchSchema = async () => {
      if (!formik.values.teacher_database) {
        setTables([]);
        setSchema({});
        return;
      }

      try {
        setLoading(true);
        const res = await api.get(`/api/database-schema/${formik.values.teacher_database}/`);
        setTables(res.data.tables);
        setSchema(res.data.schema);
        setError(null);
      } catch (err) {
        setQueryError(err.response?.data?.error || 'Failed to load database schema');
        setTables([]);
        setSchema({});
      } finally {
        setLoading(false);
      }
    };

    fetchSchema();
  }, [formik.values.teacher_database]);

  const handleCancel = () => {
    navigate(`/courses/${courseId}`);
  };

  const handleSaveSolution = () => {
    setSavedSolution(formik.values.standard_solution);
    setShowChanges(true);
  };

  const executeQuery = async () => {
    if (!query.trim()) {
      setQueryError('Please enter a SQL query');
      return;
    }

    try {
      setQueryLoading(true);
      setQueryError(null);
      setQuerySuccess(null);

      const res = await api.post('/api/execute-sql/', {
        query: query,
        database_id: formik.values.teacher_database || null
      });

      setResults(res.data.results || []);
      setColumns(res.data.columns || []);
      setQuerySuccess('Query executed successfully');

      // After successful query execution, suggest saving it as the reference solution
      if (res.data.results) {
        formik.setFieldValue('standard_solution', query);
        setSavedSolution(query);
        setShowChanges(true);
      }
    } catch (err) {
      console.error('Query execution error:', err);
      setQueryError(err.response?.data?.error || 'Failed to execute query');
      setResults([]);
      setColumns([]);
    } finally {
      setQueryLoading(false);
    }
  };

  const saveAsEtalon = () => {
    formik.setFieldValue('standard_solution', query);
    setSavedSolution(query);
    setShowChanges(true);
  };

  // Function to highlight changes between saved and current solution
  const getHighlightedChanges = () => {
    if (!savedSolution || !formik.values.standard_solution) return '';

    // Simple diff implementation - in a real app, you might want to use a proper diff library
    const savedLines = savedSolution.split('\n');
    const currentLines = formik.values.standard_solution.split('\n');

    let result = '';
    const maxLines = Math.max(savedLines.length, currentLines.length);

    for (let i = 0; i < maxLines; i++) {
      const savedLine = savedLines[i] || '';
      const currentLine = currentLines[i] || '';

      if (savedLine !== currentLine) {
        result += `- ${savedLine}\n+ ${currentLine}\n`;
      } else {
        result += `  ${currentLine}\n`;
      }
    }

    return result;
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

          {/* Interactive SQL Editor Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('sql.editor')}
            </Typography>
            <Grid container spacing={2}>
              {/* Database Schema */}
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('sql.tables')}
                </Typography>
                <Paper variant="outlined" sx={{ height: '300px', overflow: 'auto', p: 1 }}>
                  <List dense>
                    {tables.map(table => (
                      <ListItem key={table}>
                        <ListItemText
                          primary={table}
                          secondary={schema[table]?.map(col =>
                            `${col.name} (${col.type})${col.pk ? ' [PK]' : ''}`
                          ).join(', ')}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Grid>

              {/* SQL Editor */}
              <Grid item xs={12} md={8}>
                <Editor
                  height="300px"
                  defaultLanguage="sql"
                  value={query}
                  onChange={setQuery}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14
                  }}
                />
                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    onClick={executeQuery}
                    disabled={queryLoading || !formik.values.teacher_database}
                  >
                    {queryLoading ? <CircularProgress size={24} /> : t('sql.execute')}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={saveAsEtalon}
                    disabled={!query}
                  >
                    {t('task.saveAsEtalon')}
                  </Button>
                </Box>

                {queryError && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {queryError}
                  </Alert>
                )}
                {querySuccess && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    {querySuccess}
                  </Alert>
                )}

                {/* Query Results */}
                {columns.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {t('sql.results')}
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            {columns.map(col => (
                              <TableCell key={col}>{col}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {results.map((row, idx) => (
                            <TableRow key={idx}>
                              {columns.map(col => (
                                <TableCell key={col}>{row[col]}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </Grid>
            </Grid>
          </Box>

          {/* Standard Solution Field */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1">
                {t('task.standardSolution')}
              </Typography>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={handleSaveSolution}
                disabled={!formik.values.standard_solution}
              >
                {t('task.saveChanges')}
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('task.standardSolutionDescription')}
            </Typography>
            <Editor
              height="300px"
              defaultLanguage="sql"
              value={formik.values.standard_solution}
              onChange={(value) => formik.setFieldValue('standard_solution', value)}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                fontSize: 14,
              }}
            />
            {formik.touched.standard_solution && formik.errors.standard_solution && (
              <Typography color="error" variant="caption">
                {formik.errors.standard_solution}
              </Typography>
            )}

            {/* Changes Display */}
            {showChanges && savedSolution && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('task.changesPreview')}
                </Typography>
                <Box 
                  component="pre" 
                  sx={{ 
                    p: 1, 
                    bgcolor: 'grey.100', 
                    borderRadius: 1, 
                    overflow: 'auto',
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                    maxHeight: '200px'
                  }}
                >
                  {getHighlightedChanges()}
                </Box>
              </Box>
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
