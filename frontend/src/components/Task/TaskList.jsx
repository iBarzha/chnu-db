import React from 'react';
import { List, ListItem, ListItemText, Paper, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function TaskList({ tasks }) {
  const navigate = useNavigate();

  if (!tasks || tasks.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No tasks found for this course.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <List>
        {tasks.map((task) => (
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
  );
}

