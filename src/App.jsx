/**
 * App.jsx - Point d'entrée principal de l'application
 *
 * Architecture de sécurité:
 * - AuthProvider: gestion centralisée de l'auth
 * - PublicRoute: pages accessibles uniquement si NON connecté (login, etc)
 * - ProtectedRoute: pages accessibles uniquement si connecté + rôle autorisé
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminUniversityDashboard from './pages/dashboards/AdminUniversityDashboard';
import TeacherDashboard from './pages/dashboards/TeacherDashboard';
import StudentDashboard from './pages/dashboards/StudentDashboard';
import ParentDashboard from './pages/dashboards/ParentDashboard';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Pages publiques (accessible par tous) */}
          <Route path="/" element={<LandingPage />} />

          {/* Pages publiques (accessible UNIQUEMENT si NON connecté) */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/onboarding" element={<PublicRoute><div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"><div className="text-center glass p-12 rounded-3xl"><h1 className="text-3xl font-black text-gray-900 mb-4">Onboarding Université</h1><p className="text-gray-600 text-lg">En cours de développement...</p></div></div></PublicRoute>} />

          {/* Route démo (accessible par tous pour l'instant) */}
          <Route path="/demo" element={<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"><div className="text-center glass p-12 rounded-3xl"><h1 className="text-3xl font-black text-gray-900 mb-4">Démo Vidéo</h1><p className="text-gray-600 text-lg">En cours de développement...</p></div></div>} />

          {/* Dashboards protégés par authentification + rôle */}
          <Route
            path="/dashboard/super-admin"
            element={
              <ProtectedRoute allowedRoles={['super_admin_plateforme']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <AdminUniversityDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/teacher"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/student"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/parent"
            element={
              <ProtectedRoute allowedRoles={['parent']}>
                <ParentDashboard />
              </ProtectedRoute>
            }
          />

          {/* Redirection */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
