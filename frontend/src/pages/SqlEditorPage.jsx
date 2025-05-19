import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress
} from '@mui/material';
import api from '../api/auth';
import { useTranslation } from 'react-i18next';

export default function SqlEditorPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [columns, setColumns] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [tables, setTables] = useState([]);
  const [schema, setSchema] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch available databases
  useEffect(() => {
    const fetchDatabases = async () => {
      try {
        const res = await api.get('/api/teacher-databases/');
        setDatabases(res.data);
      } catch (err) {
        setError('Failed to load databases');
      }
    };

    fetchDatabases();
  }, []);

  // Fetch database schema when a database is selected
  useEffect(() => {
    const fetchSchema = async () => {
      if (!selectedDatabase) {
        setTables([]);
        setSchema({});
        return;
      }

      try {
        setLoading(true);
        const res = await api.get(`/api/database-schema/${selectedDatabase}/`);
        setTables(res.data.tables);
        setSchema(res.data.schema);
        setError(null);
      } catch (err) {
        const errorMessage = err.response?.data?.error || 'Failed to load database schema';
        setError(errorMessage);
        setTables([]);
        setSchema({});
      } finally {
        setLoading(false);
      }
    };

    fetchSchema();
  }, [selectedDatabase]);

  // Execute SQL query
  const executeQuery = async () => {
    if (!query.trim()) {
      setError('Please enter a SQL query');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const res = await api.post('/api/execute-sql/', {
        query: query,
        database_id: selectedDatabase || null
      });

      setResults(res.data.results);
      setColumns(res.data.columns);
      setSuccess('Query executed successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to execute query');
      setResults([]);
      setColumns([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" gutterBottom>
        {t('SQL Editor')}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Grid container spacing={3}>
        {/* Left sidebar - Database and Tables */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              {t('Available Databases')}
            </Typography>
            <FormControl fullWidth margin="normal">
              <InputLabel>{t('Select Database')}</InputLabel>
              <Select
                value={selectedDatabase}
                onChange={(e) => setSelectedDatabase(e.target.value)}
                label={t('Select Database')}
              >
                <MenuItem value="">
                  <em>{t('None')}</em>
                </MenuItem>
                {databases.map((db) => (
                  <MenuItem key={db.id} value={db.id}>
                    {db.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              {t('Available Tables')}
            </Typography>
            {loading && <CircularProgress size={24} sx={{ mt: 2 }} />}
            {tables.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {selectedDatabase ? t('No tables found') : t('Select a database to view tables')}
              </Typography>
            ) : (
              <List dense>
                {tables.map((table) => (
                  <React.Fragment key={table}>
                    <ListItem button onClick={() => setQuery(`SELECT * FROM ${table} LIMIT 10;`)}>
                      <ListItemText primary={table} />
                    </ListItem>
                    <List dense component="div" disablePadding sx={{ pl: 2 }}>
                      {schema[table]?.map((column) => (
                        <ListItem key={column.name} sx={{ py: 0 }}>
                          <ListItemText 
                            primary={`${column.name} (${column.type})`} 
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Main content - SQL Editor and Results */}
        <Grid item xs={12} md={9}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('SQL Query')}
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={6}
              variant="outlined"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your SQL query here..."
              sx={{ mb: 2, fontFamily: 'monospace' }}
            />
            <Button 
              variant="contained" 
              onClick={executeQuery} 
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {t('Execute')}
            </Button>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('Results')}
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : columns.length > 0 ? (
              <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
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
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t('No results to display')}
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
