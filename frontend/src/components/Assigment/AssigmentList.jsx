import { List, ListItem, ListItemText, Divider } from '@mui/material';
import { Link } from 'react-router-dom';

export default function AssignmentList({ courseId }) {
  const assignments = [
    { id: 1, title: "Basics SELECT", due_date: "2025-05-01" },
    { id: 2, title: "Hard JOIN", due_date: "2025-05-15" }
  ];

  return (
    <List>
      {assignments.map((assignment) => (
        <div key={assignment.id}>
          <ListItem
            component={Link}
            to={`/courses/${courseId}/assignments/${assignment.id}`}
            sx={{ textDecoration: 'none', color: 'inherit' }}
          >
            <ListItemText
              primary={assignment.title}
              secondary={`The deadline for: ${assignment.due_date}`}
            />
          </ListItem>
          <Divider />
        </div>
      ))}
    </List>
  );
}