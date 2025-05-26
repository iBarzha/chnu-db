import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../api/auth';
import { useTranslation } from 'react-i18next';

export default function TeacherDatabaseListPage() {
  const { t } = useTranslation();
  const [databases, setDatabases] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Завантаження списку баз даних викладача
  const fetchDatabases = async () => {
    try {
      const res = await api.get('/api/teacher-databases/');
      setDatabases(res.data);
    } catch (err) {
      setError('Не вдалося завантажити бази даних');
    }
  };

  // Видалення бази даних
  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/teacher-databases/${id}/`);
      setDatabases(prev => prev.filter(db => db.id !== id));
      setSuccess(t('task.deletedSuccessfully'));
    } catch (err) {
      setError('Не вдалося видалити');
    }
  };

  useEffect(() => {
    fetchDatabases();
  }, []);

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>
        {t('task.myDatabases')}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Paper sx={{ p: 3 }}>
        {databases.length === 0 ? (
          <Typography>{t('task.noDatabases')}</Typography>
        ) : (
          <List>
            {databases.map(db => (
              <ListItem
                key={db.id}
                secondaryAction={
                  <IconButton edge="end" color="error" onClick={() => handleDelete(db.id)}>
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText primary={db.name} secondary={new Date(db.uploaded_at).toLocaleString()} />
              </ListItem>
            ))}
          </List>
        )}

        <Box mt={2}>
          <Button variant="contained" href="/upload-database">
            {t('task.uploadNewDatabase')}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
