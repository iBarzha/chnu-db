import React, { useState, useEffect } from 'react';
import { Container, Paper, Typography, Box, TextField, Button, Avatar, CircularProgress, Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/auth';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, refreshToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    bio: '',
    profile_picture: null
  });
  const [previewUrl, setPreviewUrl] = useState('');

  // Load user data when component mounts
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        bio: user.bio || '',
        profile_picture: null
      });

      // Set preview URL if user has a profile picture
      if (user.profile_picture) {
        setPreviewUrl(user.profile_picture);
      }
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        profile_picture: file
      }));

      // Create a preview URL for the selected image
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Create a FormData object to handle file uploads
      const data = new FormData();
      data.append('username', formData.username);
      data.append('email', formData.email);
      data.append('first_name', formData.first_name);
      data.append('last_name', formData.last_name);
      data.append('bio', formData.bio);

      // Only append profile_picture if a new file was selected
      if (formData.profile_picture) {
        data.append('profile_picture', formData.profile_picture);
      }

      // Send the update request
      await api.put('/api/auth/profile/', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess(t('profile.updateSuccess'));
      
      // Refresh the token to update the user data in the context
      await refreshToken();
    } catch (err) {
      console.error('Profile update error:', err);
      setError(t('profile.updateError'));
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="h5">{t('profile.notAuthenticated')}</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('profile.title')}
        </Typography>

        <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 3
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
              <Avatar
                src={previewUrl}
                alt={formData.username}
                sx={{ width: 120, height: 120, mb: 2 }}
              />
              <Button
                variant="outlined"
                component="label"
              >
                {t('profile.uploadPicture')}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </Button>
            </Box>

            <TextField
              label={t('common.username')}
              name="username"
              value={formData.username}
              onChange={handleChange}
              fullWidth
              required
            />

            <TextField
              label={t('common.email')}
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              fullWidth
              required
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label={t('profile.firstName')}
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                fullWidth
              />
              <TextField
                label={t('profile.lastName')}
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                fullWidth
              />
            </Box>

            <TextField
              label={t('profile.bio')}
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              multiline
              rows={4}
              fullWidth
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{ minWidth: 120 }}
              >
                {loading ? <CircularProgress size={24} /> : t('profile.saveChanges')}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}