import React, { useState, useEffect, useRef } from 'react';
import {
  Container, Paper, Typography, Box, Button,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Divider,
  Tabs, Tab, IconButton, Tooltip, Alert, Chip
} from '@mui/material';
import Editor from '@monaco-editor/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/auth';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ClearIcon from '@mui/icons-material/Clear';
import HistoryIcon from '@mui/icons-material/History';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import SchemaIcon from '@mui/icons-material/Schema';

const SQLEditorPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [sql, setSql] = useState('');
  const [executing, setExecuting] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [executionTime, setExecutionTime] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [databases, setDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState(null);
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [schema, setSchema] = useState(null);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const editorRef = useRef(null);

  // Sample queries for different operations
  const sampleQueries = {
    select: 'SELECT * FROM users LIMIT 10;',
    insert: 'INSERT INTO users (username, email) VALUES (\'newuser\', \'newuser@example.com\');',
    update: 'UPDATE users SET email = \'updated@example.com\' WHERE username = \'newuser\';',
    delete: 'DELETE FROM users WHERE username = \'newuser\';',
    create: 'CREATE TABLE test_table (id SERIAL PRIMARY KEY, name VARCHAR(100));',
    join: 'SELECT u.username, p.title FROM users u JOIN posts p ON u.id = p.user_id LIMIT 10;'
  };

  // Load user's databases on component mount
  useEffect(() => {
    if (user && user.role === 'TEACHER') {
      loadDatabases();
    }
  }, [user]);

  // Load SQL history
  useEffect(() => {
    loadHistory();
  }, []);

  const loadDatabases = async () => {
    setLoadingDatabases(true);
    try {
      const response = await api.get('/api/teacher-databases/');
      setDatabases(response.data);
      if (response.data.length > 0 && !selectedDatabase) {
        setSelectedDatabase(response.data[0]);
        loadSchema(response.data[0].id);
      }
    } catch (err) {
      console.error('Error loading databases:', err);
    } finally {
      setLoadingDatabases(false);
    }
  };

  const loadSchema = async (databaseId) => {
    if (!databaseId) return;

    setLoadingSchema(true);
    try {
      const response = await api.get(`/api/database-schema/${databaseId}/`);
      setSchema(response.data);
    } catch (err) {
      console.error('Error loading schema:', err);
      setError(t('sql.failedToFetchSchema'));
    } finally {
      setLoadingSchema(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await api.get('/api/sql-history/');
      setHistory(response.data);
    } catch (err) {
      console.error('Error loading SQL history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleExecute = async () => {
    if (!sql.trim()) {
      setError(t('sql.enterSqlQuery'));
      return;
    }

    setExecuting(true);
    setError(null);
    setResults(null);

    try {
      const payload = {
        query: sql,
      };

      // Add database_id if a database is selected
      if (selectedDatabase) {
        payload.database_id = selectedDatabase.id;
      }

      const response = await api.post('/api/execute-sql/', payload);

      setResults(response.data.results || []);
      setExecutionTime(response.data.execution_time);

      // Refresh history after execution
      loadHistory();

    } catch (err) {
      console.error('Error executing SQL:', err);
      setError(err.response?.data?.error || t('sql.failedToExecute'));
      setExecutionTime(err.response?.data?.execution_time);
    } finally {
      setExecuting(false);
    }
  };

  const handleClear = () => {
    setSql('');
    if (editorRef.current) {
      editorRef.current.setValue('');
    }
  };

  const handleHistoryItemClick = (item) => {
    setSql(item.sql);
    if (editorRef.current) {
      editorRef.current.setValue(item.sql);
    }
  };

  const handleSampleQuery = (query) => {
    setSql(query);
    if (editorRef.current) {
      editorRef.current.setValue(query);
    }
  };

  const handleDatabaseChange = (database) => {
    setSelectedDatabase(database);
    loadSchema(database.id);
  };

  const renderResults = () => {
    if (executing) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
      );
    }

    if (!results || results.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ my: 2 }}>
          {t('sql.executeToSeeResults')}
        </Typography>
      );
    }

    // If we have results with columns, display as table
    if (results.length > 0 && Object.keys(results[0]).length > 0) {
      const columns = Object.keys(results[0]);

      return (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2">
              {t('sql.rowsReturned', { count: results.length })}
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

    // For non-SELECT queries that don't return rows
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

  const renderHistory = () => {
    if (loadingHistory) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress size={24} />
        </Box>
      );
    }

    if (history.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ my: 2 }}>
          No SQL history available.
        </Typography>
      );
    }

    return (
      <Box sx={{ mt: 2 }}>
        {history.map((item) => (
          <Paper
            key={item.id}
            sx={{
              p: 2,
              mb: 1,
              cursor: 'pointer',
              borderLeft: item.success ? '4px solid green' : '4px solid red',
              '&:hover': { bgcolor: 'action.hover' }
            }}
            onClick={() => handleHistoryItemClick(item)}
          >
            <Typography variant="subtitle2" component="pre" sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '100px',
              overflow: 'auto'
            }}>
              {item.sql}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {new Date(item.timestamp).toLocaleString()}
              </Typography>
              <Box>
                {item.execution_time && (
                  <Chip
                    label={`${(item.execution_time * 1000).toFixed(2)} ms`}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                )}
                <Chip
                  label={item.success ? 'Success' : 'Error'}
                  color={item.success ? 'success' : 'error'}
                  size="small"
                />
              </Box>
            </Box>
            {item.error_message && (
              <Typography variant="caption" color="error" component="pre" sx={{
                mt: 1,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {item.error_message}
              </Typography>
            )}
            {item.result_summary && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                {item.result_summary}
              </Typography>
            )}
          </Paper>
        ))}
      </Box>
    );
  };

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
          {t('sql.noSchemaAvailable')}
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
                    <TableCell>{t('sql.column')}</TableCell>
                    <TableCell>{t('sql.type')}</TableCell>
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

  // Render different content based on user role
  const renderRoleSpecificContent = () => {
    if (!user) {
      return (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6">{t('sql.loginRequired')}</Typography>
          <Typography variant="body1" sx={{ mt: 2 }}>
            {t('sql.loginRequiredText')}
          </Typography>
        </Paper>
      );
    }

    const isTeacher = user.role === 'TEACHER';

    return (
      <>
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h5">
            {isTeacher ? t('sql.teacherWorkspace') : t('sql.studentWorkspace')}
          </Typography>

          {isTeacher && (
            <Box sx={{ mt: 2, mb: 3 }}>
              <Typography variant="subtitle1">{t('task.selectDatabase')}</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {loadingDatabases ? (
                  <CircularProgress size={24} />
                ) : (
                  <>
                    {databases.map((db) => (
                      <Chip
                        key={db.id}
                        label={db.name}
                        onClick={() => handleDatabaseChange(db)}
                        color={selectedDatabase?.id === db.id ? 'primary' : 'default'}
                        variant={selectedDatabase?.id === db.id ? 'filled' : 'outlined'}
                      />
                    ))}
                    {databases.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        {t('task.noDatabases')}
                      </Typography>
                    )}
                  </>
                )}
              </Box>
            </Box>
          )}

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1">{t('sql.editor')}</Typography>
            <Editor
              height="200px"
              defaultLanguage="sql"
              value={sql}
              onChange={setSql}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                automaticLayout: true
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayArrowIcon />}
              onClick={handleExecute}
              disabled={executing || !sql.trim()}
            >
              {t('sql.runQuery')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={handleClear}
            >
              {t('sql.clear')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<HistoryIcon />}
              onClick={() => setActiveTab(1)}
            >
              History
            </Button>
            {isTeacher && selectedDatabase && (
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => loadSchema(selectedDatabase.id)}
                disabled={loadingSchema}
              >
                {t('sql.refreshSchema')}
              </Button>
            )}
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Box>
            <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
              <Tab label={t('sql.results')} />
              <Tab label="History" />
              <Tab label={t('sql.schema')} />
            </Tabs>

            {activeTab === 0 && renderResults()}
            {activeTab === 1 && renderHistory()}
            {activeTab === 2 && renderSchema()}
          </Box>
        </Paper>

        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="subtitle1">{t('sql.sampleQueries')}</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            <Chip
              label="SELECT"
              onClick={() => handleSampleQuery(sampleQueries.select)}
              color="primary"
              variant="outlined"
            />
            <Chip
              label="INSERT"
              onClick={() => handleSampleQuery(sampleQueries.insert)}
              color="success"
              variant="outlined"
            />
            <Chip
              label="UPDATE"
              onClick={() => handleSampleQuery(sampleQueries.update)}
              color="warning"
              variant="outlined"
            />
            <Chip
              label="DELETE"
              onClick={() => handleSampleQuery(sampleQueries.delete)}
              color="error"
              variant="outlined"
            />
            <Chip
              label="CREATE TABLE"
              onClick={() => handleSampleQuery(sampleQueries.create)}
              color="secondary"
              variant="outlined"
            />
            <Chip
              label="JOIN"
              onClick={() => handleSampleQuery(sampleQueries.join)}
              color="info"
              variant="outlined"
            />
          </Box>
        </Paper>
      </>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        {t('sql.editor')}
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6">{t('sql.welcome')}</Typography>
        <Typography variant="body1" paragraph sx={{ mt: 2 }}>
          {t('sql.introText')}
        </Typography>
        <Typography variant="body1" paragraph>
          {t('sql.featuresText')}
        </Typography>
      </Paper>

      {renderRoleSpecificContent()}
    </Container>
  );
};

export default SQLEditorPage;