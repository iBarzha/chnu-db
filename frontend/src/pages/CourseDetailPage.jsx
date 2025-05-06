import { Container, Typography, Button, Box, Tab, Tabs } from '@mui/material';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import AssignmentList from '../components/Assignment/AssignmentList';
import CourseMaterials from '../components/Course/CourseMaterials';

export default function CourseDetailPage() {
  const { id } = useParams();
  const [tab, setTab] = useState(0);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4">The name of the course</Typography>
        <Button variant="contained">Add the task</Button>
      </Box>

      <Tabs value={tab} onChange={(e, newVal) => setTab(newVal)} sx={{ mb: 3 }}>
        <Tab label="Task" />
        <Tab label="Materials" />
        <Tab label="Member's" />
      </Tabs>

      {tab === 0 && <AssignmentList courseId={id} />}
      {tab === 1 && <CourseMaterials courseId={id} />}
    </Container>
  );
}