import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/auth';

export default function TeacherDatabaseUploadPage() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Обробка відправки форми завантаження бази даних
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    if (!name || !file) {
      setError('Потрібно вказати назву та файл.');
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('sql_dump', file);

    try {
      await api.post('/api/teacher-databases/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setSuccess(true);
      setTimeout(() => navigate('/courses'), 1500);
    } catch (err) {
      console.error('Помилка завантаження:', err);
      setError(err.response?.data?.detail || 'Завантаження не вдалося');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Typography variant="h4" gutterBottom>
        {t('task.uploadDatabase')}
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label={t('task.databaseName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            sx={{ mb: 3 }}
          />

          <Button
            variant="outlined"
            component="label"
            sx={{ mb: 3 }}
          >
            {file ? file.name : t('task.chooseFile')}
            <input
              type="file"
              hidden
              accept=".sql"
              onChange={(e) => setFile(e.target.files[0])}
            />
          </Button>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{t('task.uploadSuccess')}</Alert>}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              startIcon={isSubmitting && <CircularProgress size={20} />}
            >
              {isSubmitting ? t('common.uploading') : t('task.upload')}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
