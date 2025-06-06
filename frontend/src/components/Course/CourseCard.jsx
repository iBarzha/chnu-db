import { Card, CardMedia, CardContent, Typography, Button, Chip, Box, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
export default function CourseCard({ course, onEdit, onDelete }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <Card sx={{ maxWidth: 345, m: 2 }}>
      {course.cover_image && (
        <CardMedia
          component="img"
          height="140"
          image={course.cover_image}
          alt={course.title}
        />
      )}
      <CardContent>
        <Typography gutterBottom variant="h5">
          {course.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {course.description}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            {/* Відображає кількість завдань у курсі */}
            <Chip
              label={`${t('course.tasks')}: ${course.assignments_count || 0}`}
              size="small"
              sx={{ mr: 1 }}
            />
          </Box>
          <Box>
            {/* Кнопка редагування курсу */}
            <IconButton
              size="small" 
              color="primary" 
              onClick={() => onEdit(course)}
              sx={{ mr: 1 }}
              title={t('course.edit')}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            {/* Кнопка видалення курсу */}
            <IconButton
              size="small" 
              color="error" 
              onClick={() => onDelete(course)}
              sx={{ mr: 1 }}
              title={t('course.delete')}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          {/* Кнопка для переходу до сторінки курсу */}
          <Button
            size="small"
            variant="contained"
            onClick={() => navigate(`/courses/${course.id}`)}
          >
            {t('course.open')}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
