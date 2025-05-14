import { useState, useEffect, useCallback } from 'react';
import { List, ListItem, ListItemText, Typography, Paper, Divider, Button, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../../api/auth';

export default function AssignmentList({ courseId, assignments: propAssignments }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const fetchAssignments = useCallback(() => {
    if (courseId) {
      // If assignments are provided as props, use them
      if (propAssignments && propAssignments.length > 0) {
        setAssignments(propAssignments);
        setLoading(false);
        return;
      }

      // Otherwise, fetch assignments from the API
      setLoading(true);
      api.get(`/api/courses/${courseId}/get_assignments/`)
        .then(res => {
          setAssignments(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching assignments:', err);
          setLoading(false);
        });
    }
  }, [courseId, propAssignments]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  if (assignments.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          {t('course.noTasks')}
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ width: '100%' }}>
      <List>
        {assignments.map((assignment, index) => (
          <Box key={assignment.id}>
            {index > 0 && <Divider />}
            <ListItem
              secondaryAction={
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={() => navigate(`/assignments/${assignment.id}`)}
                >
                  {t('task.view')}
                </Button>
              }
            >
              <ListItemText
                primary={assignment.title}
                secondary={
                  <>
                    <Typography component="span" variant="body2" color="text.primary">
                      {new Date(assignment.due_date).toLocaleDateString()}
                    </Typography>
                    {" — " + assignment.description}
                  </>
                }
              />
            </ListItem>
          </Box>
        ))}
      </List>
    </Paper>
  );
}
