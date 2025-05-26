import React, { useEffect, useState } from 'react';
import { Container, Typography, Paper, List, ListItem, ListItemText, CircularProgress, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../api/auth';

export default function TaskListPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    api.get('/api/tasks/')
      .then(res => {
        setTasks(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load tasks');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="error">{error}</Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Tasks</Typography>
      <Paper sx={{ p: 2 }}>
        <List>
          {tasks.length === 0 && (
            <ListItem>
              <ListItemText primary="No tasks found." />
            </ListItem>
          )}
          {tasks.map(task => (
            <ListItem
              key={task.id}
              button
              onClick={() => navigate(`/tasks/${task.id}`)}
              divider
            >
              <ListItemText
                primary={task.title}
                secondary={task.description}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
      <Button sx={{ mt: 2 }} variant="outlined" onClick={() => navigate('/courses')}>Back to Courses</Button>
    </Container>
  );
}

