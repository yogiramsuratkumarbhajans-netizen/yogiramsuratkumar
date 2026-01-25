import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Pages
import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import InvestNamaPage from './pages/InvestNamaPage';
import AudioPlayerPage from './pages/AudioPlayerPage';
import ReportsPage from './pages/ReportsPage';
import PublicReportsPage from './pages/PublicReportsPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ModeratorLoginPage from './pages/ModeratorLoginPage';
import ModeratorDashboardPage from './pages/ModeratorDashboardPage';
import PrayerPage from './pages/PrayerPage';
import BookshelfPage from './pages/BookshelfPage';
import BookReaderPage from './pages/BookReaderPage';
import PhotoGalleryPage from './pages/PhotoGalleryPage';
import AudioGalleryPage from './pages/AudioGalleryPage';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-loader">
        <span className="loader"></span>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Admin Protected Route
const AdminRoute = ({ children }) => {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-loader">
        <span className="loader"></span>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

// Moderator Protected Route
const ModeratorRoute = ({ children }) => {
  const { moderator, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-loader">
        <span className="loader"></span>
        <p>Loading...</p>
      </div>
    );
  }

  if (!moderator) {
    return <Navigate to="/moderator/login" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/reports/public" element={<PublicReportsPage />} />
      <Route path="/prayers" element={<PrayerPage />} />
      <Route path="/books" element={<BookshelfPage />} />
      <Route path="/books/:id" element={<BookReaderPage />} />
      <Route path="/gallery" element={<PhotoGalleryPage />} />
      <Route path="/audios" element={<AudioGalleryPage />} />

      {/* Protected User Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />
      <Route path="/invest" element={
        <ProtectedRoute>
          <InvestNamaPage />
        </ProtectedRoute>
      } />
      <Route path="/audio" element={
        <ProtectedRoute>
          <AudioPlayerPage />
        </ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute>
          <ReportsPage />
        </ProtectedRoute>
      } />

      {/* Moderator Routes */}
      <Route path="/moderator/login" element={<ModeratorLoginPage />} />
      <Route path="/moderator/dashboard" element={
        <ModeratorRoute>
          <ModeratorDashboardPage />
        </ModeratorRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/dashboard" element={
        <AdminRoute>
          <AdminDashboardPage />
        </AdminRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
