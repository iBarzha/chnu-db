import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Divider, Typography } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  School as StudentIcon,
  Person as TeacherIcon,
  AdminPanelSettings as AdminIcon,
  Assignment as TasksIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  Book as CoursesIcon,
  AccountCircle as ProfileIcon
} from '@mui/icons-material';

export default function Sidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Function to handle external links
  const handleExternalLink = (url) => {
    window.open(url, '_blank');
  };

  // Define menu items based on user role
  const menuItems = [
    // Common items for all users
    { text: t('common.dashboard'), icon: <DashboardIcon />, path: '/dashboard' },
    { text: t('sidebar.profile'), icon: <ProfileIcon />, path: '/profile' },
    { text: t('sidebar.courses'), icon: <CoursesIcon />, path: '/courses' },

    // Role-specific items
    ...(user?.role === 'STUDENT' ? [
      { text: t('sidebar.myTasks'), icon: <StudentIcon />, path: '/tasks' }
    ] : []),

    ...(user?.role === 'TEACHER' ? [
      { text: t('sidebar.gradeWork'), icon: <TasksIcon />, path: '/grade' },
      { text: t('sidebar.uploadDatabase'), icon: <SettingsIcon />, path: '/upload-database' },
      { text: t('sidebar.myDatabases'), icon: <CoursesIcon />, path: '/my-databases' }


    ] : []),

    ...(user?.role === 'ADMIN' ? [
      { text: t('sidebar.userManagement'), icon: <AdminIcon />, path: '/admin/users' }
    ] : [])
  ];

  // Admin-specific external links
  const adminExternalLinks = user?.role === 'ADMIN' ? [
    { text: t('sidebar.adminPanel'), icon: <SettingsIcon />, url: 'http://localhost:8000/admin/' }
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
      <Toolbar /> {/* {t('layout.appBarSpacing')} */}
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
            {t('sidebar.administration')}
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
