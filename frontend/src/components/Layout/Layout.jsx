import { Outlet } from 'react-router-dom';
import { Box, CssBaseline, Toolbar } from '@mui/material';
import { useTranslation } from 'react-i18next';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function Layout() {
  const { t } = useTranslation();

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <Navbar />
      <Sidebar />

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar /> {/* {t('layout.appBarSpacing')} */}
        <Outlet />  {/* {t('layout.pageContent')} */}
      </Box>
    </Box>
  );
}
