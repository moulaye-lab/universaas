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
import CreateTeacherPage from './pages/admin/CreateTeacherPage';
import TeachersListPage from './pages/admin/TeachersListPage';
import TeacherDetailsPage from './pages/admin/TeacherDetailsPage';
import CreateStudentPage from './pages/admin/CreateStudentPage';
import EditStudentPage from './pages/admin/EditStudentPage';
import StudentsListPage from './pages/admin/StudentsListPage';
import CreateParentPage from './pages/admin/CreateParentPage';
import ParentDetailsPage from './pages/admin/ParentDetailsPage';
import ParentsListPage from './pages/admin/ParentsListPage';
import CreateCoursePage from './pages/admin/CreateCoursePage';
import CoursesListPage from './pages/admin/CoursesListPage';
import CourseDetailsPage from './pages/admin/CourseDetailsPage';
import CreateClassPage from './pages/admin/CreateClassPage';
import ClassesListPage from './pages/admin/ClassesListPage';
import ClassDetailsPage from './pages/admin/ClassDetailsPage';
import RoomsManagementPage from './pages/admin/RoomsManagementPage';
import ManageAcademicDataPage from './pages/admin/ManageAcademicDataPage';
import ManageStudentsPage from './pages/admin/ManageStudentsPage';
import ManageTeachersPage from './pages/admin/ManageTeachersPage';
import ManageCoursesPage from './pages/admin/ManageCoursesPage';
import GradesInputPage from './pages/teacher/GradesInputPage';
import MyGradesPage from './pages/student/MyGradesPage';
import MigrateAcademicYearPage from './pages/admin/MigrateAcademicYearPage';
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
            path="/admin/manage-teachers"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <ManageTeachersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/teachers/create"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <CreateTeacherPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/teachers"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <TeachersListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/teachers/:teacherId"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <TeacherDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/manage-students"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <ManageStudentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/students/create"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <CreateStudentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/students"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <StudentsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/students/:studentId/edit"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <EditStudentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/students/:studentId/create-parent"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <CreateParentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/parents/create"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <CreateParentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/parents/:parentId"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <ParentDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/parents/:parentId/add-child"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <CreateParentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/parents"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <ParentsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/manage-courses"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <ManageCoursesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/courses/create"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <CreateCoursePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/courses"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <CoursesListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/courses/:courseId"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <CourseDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/classes"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <ClassesListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/classes/create"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <CreateClassPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/classes/:classId"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <ClassDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/rooms"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <RoomsManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/academic-data"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <ManageAcademicDataPage />
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
            path="/teacher/grades/input"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <GradesInputPage />
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
            path="/student/grades"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <MyGradesPage />
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

          {/* Migration Tool - Admin Only */}
          <Route
            path="/admin/migrate-academic-year"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <MigrateAcademicYearPage />
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
