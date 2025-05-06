import { Container, Grid, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import CourseCard from '../components/Course/CourseCard';
import api from '../api/auth';

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    api.get('/api/courses/')
      .then(res => setCourses(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        My courses
      </Typography>

      <Grid container spacing={3}>
        {courses.map(course => (
          <Grid item key={course.id} xs={12} sm={6} md={4}>
            <CourseCard course={course} />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}