import { 
  Container, Typography, Button, Box, Tab, Tabs
} from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AssignmentList from '../components/Assignment/AssignmentList';
import CourseMaterials from '../components/Course/CourseMaterials';
import api from '../api/auth';

export default function CourseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [course, setCourse] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  // Отримати дані курсу та завдання
  const fetchCourse = useCallback(() => {
    if (id) {
      setLoading(true);
      api.get(`/api/courses/${id}/`)
        .then(res => {
          setCourse(res.data);
          // Використовуємо завдання з відповіді, якщо вони є
          if (res.data.assignments) {
            setAssignments(res.data.assignments);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('Помилка отримання курсу:', err);
          setLoading(false);
        });
    }
  }, [id]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  // Перехід до сторінки створення завдання
  const handleOpenTaskDialog = () => {
    navigate(`/courses/${id}/create-task`);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4">{course?.title || 'Course'}</Typography>
        <Button 
          variant="contained" 
          onClick={handleOpenTaskDialog}
        >
          {t('course.addTask')}
        </Button>
      </Box>

      <Tabs value={tab} onChange={(e, newVal) => setTab(newVal)} sx={{ mb: 3 }}>
        <Tab label={t('course.tasks')} />
        <Tab label={t('course.materials')} />
        <Tab label={t('course.members')} />
      </Tabs>

      {/* Відображення вкладок */}
      {tab === 0 && <AssignmentList courseId={id} assignments={assignments} />}
      {tab === 1 && <CourseMaterials courseId={id} />}
      {tab === 2 && (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            {/* Тут буде відображено учасників курсу */}
            Course members will be displayed here.
          </Typography>
        </Box>
      )}
    </Container>
  );
}
