import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CircularProgress, Box } from '@mui/material';
import CoursesPage from "./pages/CoursesPage";
import TaskDetailPage from "./pages/TaskDetailPage";
import CourseDetailPage from "./pages/CourseDetailPage";
import TaskCreatePage from "./pages/TaskCreatePage";
import TeacherDatabaseUploadPage from "./pages/TeacherDatabaseUploadPage";
import TeacherDatabaseListPage from "./pages/TeacherDatabaseListPage";
import SqlEditorPage from "./pages/SqlEditorPage";
import ProfilePage from "./pages/ProfilePage";

// Ліниве завантаження компонентів для кращої продуктивності
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Home = lazy(() => import('./pages/Home'));
const Layout = lazy(() => import('./components/Layout/Layout'));

// Компонент-завантажувач для Suspense fallback
const LoadingFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <CircularProgress />
  </Box>
);

// Захищений маршрут — лише для автентифікованих користувачів
const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  // Показати індикатор завантаження під час перевірки автентифікації
  if (loading) {
    return <LoadingFallback />;
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

// Гостьовий маршрут — лише для неавторизованих користувачів
const GuestRoute = () => {
  const { user, loading } = useAuth();

  // Показати індикатор завантаження під час перевірки автентифікації
  if (loading) {
    return <LoadingFallback />;
  }

  return !user ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Публічні маршрути */}
            <Route path="/" element={<Home />} />

            {/* Гостьові маршрути */}
            <Route element={<GuestRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            {/* Захищені маршрути */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/courses" element={<CoursesPage />} />
                <Route path="/courses/:id" element={<CourseDetailPage />} />
                <Route path="/courses/:courseId/create-task" element={<TaskCreatePage />} />
                <Route path="/assignments/:id" element={<TaskDetailPage />} />
                <Route path="/upload-database" element={<TeacherDatabaseUploadPage />} />
                <Route path="/my-databases" element={<TeacherDatabaseListPage />} />
                <Route path="/sql-editor" element={<SqlEditorPage />} />

              </Route>
            </Route>

            {/* 404 - Не знайдено */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
