import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Divider, Typography } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  School as StudentIcon,
  Person as TeacherIcon,
  AdminPanelSettings as AdminIcon,
  Assignment as TasksIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

export default function Sidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Function to handle external links
  const handleExternalLink = (url) => {
    window.open(url, '_blank');
  };

  // Define menu items based on user role
  const menuItems = [
    // Common items for all users
    { text: 'Дашборд', icon: <DashboardIcon />, path: '/dashboard' },

    // Role-specific items
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

  // Admin-specific external links
  const adminExternalLinks = user?.role === 'ADMIN' ? [
    { text: 'Панель администратора', icon: <SettingsIcon />, url: 'http://localhost:8000/admin/' }
  ] : [];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: 240, boxSizing: 'border-box' },
      }}
    >
      <Toolbar /> {/* Spacing under AppBar */}
      <List>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.text}
            onClick={() => navigate(item.path)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItemButton>
        ))}
      </List>

      {adminExternalLinks.length > 0 && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ px: 2, py: 1 }}
          >
            Администрирование
          </Typography>
          <List>
            {adminExternalLinks.map((item) => (
              <ListItemButton
                key={item.text}
                onClick={() => handleExternalLink(item.url)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            ))}
          </List>
        </>
      )}
    </Drawer>
  );
}
