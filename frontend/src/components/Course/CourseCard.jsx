import { Card, CardMedia, CardContent, Typography, Button, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function CourseCard({ course }) {
  const navigate = useNavigate();

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
        <Chip
          label={`Task: ${course.assignments_count || 0}`}
          size="small"
          sx={{ mr: 1 }}
        />
        <Button
          size="small"
          onClick={() => navigate(`/courses/${course.id}`)}
        >
          Open
        </Button>
      </CardContent>
    </Card>
  );
}