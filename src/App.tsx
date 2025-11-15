import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { Signup } from './pages/Signup';
import { ResetPassword } from './pages/ResetPassword';
import { Dashboard } from './pages/Dashboard';
import { SocietyList } from './pages/SocietyList';
import { SocietyForm } from './pages/SocietyForm';
import { SocietyDetail } from './pages/SocietyDetail';
import { AdminManagement } from './pages/AdminManagement';
import { Toaster } from './components/ui/sonner';

const AuthLoadingFallback: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50">
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-200 border-t-green-600" />
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isInitialized } = useAuth();

  if (!isInitialized) {
    return <AuthLoadingFallback />;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const LandingRoute: React.FC = () => {
  const { isAuthenticated, isInitialized } = useAuth();

  if (!isInitialized) {
    return <AuthLoadingFallback />;
  }

  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/societies"
        element={
          <ProtectedRoute>
            <Layout>
              <SocietyList />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/societies/new"
        element={
          <ProtectedRoute>
            <Layout>
              <SocietyForm />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/societies/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <SocietyDetail />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/societies/:id/edit"
        element={
          <ProtectedRoute>
            <Layout>
              <SocietyForm />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admins"
        element={
          <ProtectedRoute>
            <Layout>
              <AdminManagement />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<LandingRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <AppRoutes />
          <Toaster position="top-right" />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
