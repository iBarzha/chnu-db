import { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Paper, 
  Grid, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Tabs,
  Tab,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  PlayArrow as RunIcon, 
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Delete as ClearIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import api from '../../api/auth';

// Sample queries for different SQL operations
const SAMPLE_QUERIES = {
  select: 'SELECT * FROM example;',
  where: 'SELECT * FROM example WHERE name LIKE \'%test%\';',
  orderBy: 'SELECT * FROM example ORDER BY created_at DESC;',
  groupBy: 'SELECT COUNT(*) as count FROM example GROUP BY name;',
  join: 'CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(100));\nCREATE TABLE orders (id SERIAL PRIMARY KEY, user_id INTEGER, amount DECIMAL);\nINSERT INTO users (name) VALUES (\'John\'), (\'Jane\');\nINSERT INTO orders (user_id, amount) VALUES (1, 100), (1, 200), (2, 150);\nSELECT u.name, SUM(o.amount) as total FROM users u JOIN orders o ON u.id = o.user_id GROUP BY u.name;',
  insert: 'INSERT INTO example (name) VALUES (\'Test 1\'), (\'Test 2\'), (\'Test 3\');',
  update: 'UPDATE example SET name = \'Updated Name\' WHERE name = \'Test 1\';',
  delete: 'DELETE FROM example WHERE name = \'Test 2\';',
  createTable: 'CREATE TABLE students (id SERIAL PRIMARY KEY, name VARCHAR(100), grade INTEGER, enrollment_date TIMESTAMP DEFAULT NOW());',
  dropTable: 'DROP TABLE IF EXISTS students;'
};

export default function SQLEditor() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const { t } = useTranslation();

  // Fetch schema on component mount
  useEffect(() => {
    fetchSchema();
  }, []);

  const fetchSchema = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/sql/schema/');
      setSchema(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching schema:', err);
      setError(err.response?.data?.error || t('sql.failedToFetchSchema'));
    } finally {
      setLoading(false);
    }
  };

  const executeQuery = async () => {
    if (!query.trim()) {
      setError(t('sql.enterSqlQuery'));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/api/sql/execute/', { query });
      setResults(response.data);

      // Refresh schema if the query might have changed it
      if (!query.toUpperCase().startsWith('SELECT')) {
        fetchSchema();
      }
    } catch (err) {
      console.error('Error executing query:', err);
      setError(err.response?.data?.error || t('sql.failedToExecute'));
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSampleQuery = (queryType) => {
    setQuery(SAMPLE_QUERIES[queryType] || '');
  };

  const renderResultsTable = () => {
    if (!results) return null;

    if (results.rows && results.columns) {
      return (
        <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 400 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {results.columns.map((column, index) => (
                  <TableCell key={index}><strong>{column}</strong></TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {results.rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {results.columns.map((column, colIndex) => (
                    <TableCell key={colIndex}>{row[column] !== null ? String(row[column]) : 'NULL'}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      );
    } else if (results.affectedRows !== undefined) {
      return (
        <Alert severity="success" sx={{ mt: 2 }}>
          {t('sql.queryExecutedSuccessfully', { count: results.affectedRows })}
        </Alert>
      );
    }

    return null;
  };

  const renderSchemaView = () => {
    if (!schema) return null;

    return (
      <Box sx={{ mt: 2 }}>
        {Object.keys(schema).map(tableName => (
          <Paper key={tableName} sx={{ mb: 2, p: 2 }}>
            <Typography variant="h6">{tableName}</Typography>
            <TableContainer sx={{ mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('sql.column')}</TableCell>
                    <TableCell>{t('sql.type')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schema[tableName].map((column, index) => (
                    <TableRow key={index}>
                      <TableCell>{column.name}</TableCell>
                      <TableCell>{column.type}</TableCell>
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

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h5" gutterBottom>{t('sql.editor')}</Typography>

        <TextField
          fullWidth
          multiline
          rows={6}
          variant="outlined"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('sql.enterQuery')}
          sx={{ mb: 2, fontFamily: 'monospace' }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={executeQuery}
              disabled={loading}
              startIcon={<RunIcon />}
              sx={{ mr: 1 }}
            >
              {t('sql.runQuery')}
            </Button>
            <Button 
              variant="outlined"
              onClick={() => setQuery('')}
              startIcon={<ClearIcon />}
              sx={{ mr: 1 }}
            >
              {t('sql.clear')}
            </Button>
          </Box>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={fetchSchema}
            disabled={loading}
            startIcon={<RefreshIcon />}
          >
            {t('sql.refreshSchema')}
          </Button>
        </Box>

        <Typography variant="subtitle2" gutterBottom>{t('sql.sampleQueries')}</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Button size="small" variant="outlined" onClick={() => handleSampleQuery('select')}>SELECT</Button>
          <Button size="small" variant="outlined" onClick={() => handleSampleQuery('where')}>WHERE</Button>
          <Button size="small" variant="outlined" onClick={() => handleSampleQuery('orderBy')}>ORDER BY</Button>
          <Button size="small" variant="outlined" onClick={() => handleSampleQuery('groupBy')}>GROUP BY</Button>
          <Button size="small" variant="outlined" onClick={() => handleSampleQuery('join')}>JOIN</Button>
          <Button size="small" variant="outlined" onClick={() => handleSampleQuery('insert')}>INSERT</Button>
          <Button size="small" variant="outlined" onClick={() => handleSampleQuery('update')}>UPDATE</Button>
          <Button size="small" variant="outlined" onClick={() => handleSampleQuery('delete')}>DELETE</Button>
          <Button size="small" variant="outlined" onClick={() => handleSampleQuery('createTable')}>CREATE TABLE</Button>
          <Button size="small" variant="outlined" onClick={() => handleSampleQuery('dropTable')}>DROP TABLE</Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label={t('sql.results')} />
        <Tab label={t('sql.schema')} />
      </Tabs>

      <Box sx={{ mt: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {tabValue === 0 && (
              <Box>
                {results ? (
                  <>
                    <Typography variant="subtitle2" gutterBottom>
                      {results.rowCount !== undefined 
                        ? t('sql.rowsReturned', { count: results.rowCount }) 
                        : results.affectedRows !== undefined 
                          ? t('sql.rowsAffected', { count: results.affectedRows }) 
                          : ''}
                    </Typography>
                    {renderResultsTable()}
                  </>
                ) : (
                  <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    {t('sql.executeToSeeResults')}
                  </Typography>
                )}
              </Box>
            )}

            {tabValue === 1 && (
              <Box>
                {schema ? (
                  renderSchemaView()
                ) : (
                  <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    {t('sql.noSchemaAvailable')}
                  </Typography>
                )}
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
