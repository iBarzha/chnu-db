import {Drawer, List, ListItem, ListItemIcon, ListItemText, Toolbar} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  School as StudentIcon,
  Person as TeacherIcon,
  AdminPanelSettings as AdminIcon,
  Assignment as TasksIcon
} from '@mui/icons-material';

export default function Sidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    ...(user?.role === 'STUDENT' ? [
      { text: 'Мои задания', icon: <StudentIcon />, path: '/tasks' }
    ] : []),
    
    ...(user?.role === 'TEACHER' ? [
      { text: 'Создать курс', icon: <TeacherIcon />, path: '/create-course' },
      { text: 'Проверка работ', icon: <TasksIcon />, path: '/grade' }
    ] : []),
    
    ...(user?.role === 'ADMIN' ? [
      { text: 'Управление пользователями', icon: <AdminIcon />, path: '/admin/users' }
    ] : [])
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: 240, boxSizing: 'border-box' },
      }}
    >
        <Toolbar/> {/* Spacing under AppBar */}
        <List>
        {menuItems.map((item) => (
          <ListItem 
            button 
            key={item.text}
            onClick={() => navigate(item.path)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
}