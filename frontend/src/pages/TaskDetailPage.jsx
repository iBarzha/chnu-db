import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Paper, Box, Button, Divider, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import api from '../api/auth';
import Editor from '@monaco-editor/react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
// --- добавляем необходимые компоненты для схемы и результатов
import {
  Tabs, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Alert, Chip
} from '@mui/material';

export default function TaskDetailPage() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentSql, setStudentSql] = useState('');
  const [submitResult, setSubmitResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [schema, setSchema] = useState(null);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [results, setResults] = useState(null);
  const [executionTime, setExecutionTime] = useState(null);

  // Завантаження завдання при монтуванні компонента
  useEffect(() => {
    if (id) {
      setLoading(true);
      api.get(`/api/tasks/${id}/`)
        .then(res => {
          setTask(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching task:', err);
          setError(t('task.loadingError'));
          setLoading(false);
        });
    }
  }, [id, t]);

  useEffect(() => {
    if (id) {
      loadSchema();
    }
    // eslint-disable-next-line
  }, [id]);

  const loadSchema = async () => {
    setLoadingSchema(true);
    try {
      const res = await api.get(`/api/tasks/${id}/schema/`);
      setSchema(res.data);
    } catch (err) {
      setSchema(null);
    } finally {
      setLoadingSchema(false);
    }
  };

  // Повернення до курсу або списку курсів
  const handleBack = () => {
    if (task && task.course) {
      navigate(`/courses/${task.course}`);
    } else {
      navigate('/courses');
    }
  };

  // Видалення таска
  const handleDelete = async () => {
    setDeleteDialogOpen(false);
    try {
      await api.delete(`/api/tasks/${id}/`);
      navigate('/tasks');
    } catch (err) {
      setError(t('task.deleteError') || 'Failed to delete task.');
    }
  };

  // Відправка SQL-відповіді студента
  const handleSubmitSql = async () => {
    setSubmitting(true);
    setSubmitResult(null);
    setResults(null);
    setExecutionTime(null);
    try {
      const res = await api.post(`/api/tasks/${id}/submit/`, { sql: studentSql });
      setSubmitResult(res.data);
      setResults(res.data.results || []);
      setExecutionTime(res.data.execution_time);
    } catch (err) {
      setSubmitResult({ error: err.response?.data?.error || err.message || 'Submission failed.' });
      setResults(null);
      setExecutionTime(null);
    } finally {
      setSubmitting(false);
    }
  };

  // --- відображення результатів
  const renderResults = () => {
    if (submitting) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      );
    }
    if (submitResult?.error) {
      return (
        <Alert severity="error" sx={{ my: 2 }}>
          {submitResult.error}
        </Alert>
      );
    }
    if (!results || results.length === 0) {
      return (
        <Alert severity="success" sx={{ my: 2 }}>
          {t('sql.queryExecutedSuccessfully') || 'Query executed successfully (no results to display)'}
        </Alert>
      );
    }
    if (results.length > 0 && Object.keys(results[0]).length > 0) {
      const columns = Object.keys(results[0]);
      return (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2">
              {t('sql.rowsReturned', { count: results.length }) || `Rows: ${results.length}`}
            </Typography>
            {executionTime && (
              <Typography variant="caption" color="text.secondary">
                {`Execution time: ${(executionTime * 1000).toFixed(2)} ms`}
              </Typography>
            )}
          </Box>
          <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell key={column}>{column}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {columns.map((column) => (
                      <TableCell key={`${rowIndex}-${column}`}>
                        {row[column] !== null ? String(row[column]) : 'NULL'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      );
    }
    return (
      <Alert severity="success" sx={{ my: 2 }}>
        {t('sql.queryExecutedSuccessfully', { count: results.length })}
        {executionTime && (
          <Typography variant="caption" display="block">
            {`Execution time: ${(executionTime * 1000).toFixed(2)} ms`}
          </Typography>
        )}
      </Alert>
    );
  };

  // --- Відображення схеми бази даних
  const renderSchema = () => {
    if (loadingSchema) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress size={24} />
        </Box>
      );
    }
    if (!schema || !schema.tables || schema.tables.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ my: 2 }}>
          {t('sql.noSchemaAvailable') || 'No schema available.'}
        </Typography>
      );
    }
    return (
      <Box sx={{ mt: 2 }}>
        {schema.tables.map((table) => (
          <Paper key={table} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              {table}
            </Typography>
            <TableContainer sx={{ mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('sql.column') || 'Column'}</TableCell>
                    <TableCell>{t('sql.type') || 'Type'}</TableCell>
                    <TableCell align="center">PK</TableCell>
                    <TableCell align="center">Not Null</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schema.schema[table].map((column) => (
                    <TableRow key={column.name}>
                      <TableCell>{column.name}</TableCell>
                      <TableCell>{column.type}</TableCell>
                      <TableCell align="center">{column.pk ? '✓' : ''}</TableCell>
                      <TableCell align="center">{column.notnull ? '✓' : ''}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ))}
      </Box>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !task) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="error">
            {error || t('task.taskNotFound')}
          </Typography>
          <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate('/courses')}>
            {t('task.backToCourses')}
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4">{task.title}</Typography>
          <Box>
            <Button variant="outlined" onClick={handleBack} sx={{ mr: 2 }}>
              {t('task.backToCourse')}
            </Button>
            {/* Кнопка удаления и диалог удалены для студентов */}
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            {t('task.dueDate')}
          </Typography>
          <Typography variant="body1">
            {task.due_date && !isNaN(Date.parse(task.due_date))
              ? new Date(task.due_date).toLocaleString()
              : t('task.noDueDate') || '-'}
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            {t('task.description')}
          </Typography>
          <Typography variant="body1">
            {task.description}
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6">{t('task.yourSqlSolution', 'Your SQL Solution')}</Typography>
          <Editor
            height="200px"
            defaultLanguage="sql"
            value={studentSql}
            onChange={setStudentSql}
            options={{ minimap: { enabled: false }, fontSize: 14 }}
          />
          <Button
            variant="contained"
            sx={{ mt: 2, mr: 2 }}
            onClick={async () => {
              setSubmitting(true);
              setSubmitResult(null);
              setResults(null);
              setExecutionTime(null);
              try {
                const res = await api.post(`/api/tasks/${id}/submit/`, { sql: studentSql });
                setResults(res.data.results || []);
                setExecutionTime(res.data.execution_time);
                await loadSchema();
              } catch (err) {
                setResults(null);
                setExecutionTime(null);
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={submitting || !studentSql}
          >
            {submitting ? t('task.applying', 'Applying...') : t('task.applySql', 'Apply SQL')}
          </Button>
        </Box>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
          <Tab label={t('sql.results', 'Results')} />
          <Tab label={t('sql.schema', 'Schema')} />
        </Tabs>
        {activeTab === 0 && renderResults()}
        {activeTab === 1 && renderSchema()}
        {/* Сабмит вынесен вниз, только сравнение эталона и временной БД */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            variant="contained"
            color="success"
            size="large"
            onClick={handleSubmitSql}
            disabled={submitting}
          >
            {submitting ? t('task.submitting', 'Submitting...') : t('task.submitSolution', 'Submit Solution')}
          </Button>
          {submitResult && (
            <Box sx={{ mt: 2 }}>
              {submitResult.correct === true && (
                <Typography color="success.main">{t('task.correct', 'Correct! Your solution matches the reference.')}</Typography>
              )}
              {submitResult.correct === false && (
                <Typography color="warning.main">{t('task.incorrect', 'Incorrect. Please try again.')}</Typography>
              )}
              {submitResult.error && (
                <Typography color="error">{submitResult.error}</Typography>
              )}
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
}
