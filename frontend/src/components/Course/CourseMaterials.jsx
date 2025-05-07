import { useState, useEffect } from 'react';
import { List, ListItem, ListItemText, Typography, Paper, Divider, Button, Box, Link } from '@mui/material';
import { useTranslation } from 'react-i18next';
import api from '../../api/auth';

export default function CourseMaterials({ courseId }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    if (courseId) {
      setLoading(true);
      api.get(`/api/courses/${courseId}/materials/`)
        .then(res => {
          setMaterials(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching materials:', err);
          setLoading(false);
        });
    }
  }, [courseId]);

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  if (materials.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          {t('course.noMaterials')}
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ width: '100%' }}>
      <List>
        {materials.map((material, index) => (
          <Box key={material.id}>
            {index > 0 && <Divider />}
            <ListItem
              secondaryAction={
                <Button 
                  variant="outlined" 
                  size="small"
                  component={Link}
                  href={material.file_url}
                  target="_blank"
                >
                  Download
                </Button>
              }
            >
              <ListItemText
                primary={material.title}
                secondary={material.description}
              />
            </ListItem>
          </Box>
        ))}
      </List>
    </Paper>
  );
}