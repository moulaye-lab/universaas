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
import SignupPage from './pages/public/SignupPage';
import SignupSuccessPage from './pages/public/SignupSuccessPage';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminUniversityDashboard from './pages/dashboards/AdminUniversityDashboard';
import TeacherDashboard from './pages/dashboards/TeacherDashboard';
import StudentDashboard from './pages/dashboards/StudentDashboard';
import ParentDashboard from './pages/dashboards/ParentDashboard';
import ComptableDashboard from './pages/dashboards/ComptableDashboard';
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
import ClassScheduleManagementPage from './pages/admin/ClassScheduleManagementPage';
import ManageAcademicDataPage from './pages/admin/ManageAcademicDataPage';
import ManageStudentsPage from './pages/admin/ManageStudentsPage';
import ManageTeachersPage from './pages/admin/ManageTeachersPage';
import ManageCoursesPage from './pages/admin/ManageCoursesPage';
import GradesInputPage from './pages/teacher/GradesInputPage';
import GradesHistoryPage from './pages/teacher/GradesHistoryPage';
import TeacherSchedulePage from './pages/teacher/TeacherSchedulePage';
import AttendancePage from './pages/teacher/AttendancePage';
import MyGradesPage from './pages/student/MyGradesPage';
import GradesDashboardPage from './pages/student/GradesDashboardPage';
import MyAbsencesPage from './pages/student/MyAbsencesPage';
import GradesListPage from './pages/admin/GradesListPage';
import EditGradePage from './pages/admin/EditGradePage';
import GradesStatsPage from './pages/admin/GradesStatsPage';
import ParentGradesPage from './pages/parent/ParentGradesPage';
import ChildAbsencesPage from './pages/parent/ChildAbsencesPage';
import AbsencesManagementPage from './pages/admin/AbsencesManagementPage';
import MigrateAcademicYearPage from './pages/admin/MigrateAcademicYearPage';
import PaymentsManagementPage from './pages/admin/PaymentsManagementPage';
import MigratePaymentsPage from './pages/admin/MigratePaymentsPage';
import MigrateCurrencyPage from './pages/admin/MigrateCurrencyPage';
import TuitionFeesManagementPage from './pages/admin/TuitionFeesManagementPage';
import CreateBulkPaymentPlansPage from './pages/admin/CreateBulkPaymentPlansPage';
import MigratePaymentPlansPage from './pages/admin/MigratePaymentPlansPage';
import CreatePaymentPlanPage from './pages/admin/CreatePaymentPlanPage';
import AccountingDashboardPage from './pages/admin/AccountingDashboardPage';
import TransactionJournalPage from './pages/admin/TransactionJournalPage';
import CreateComptablePage from './pages/admin/CreateComptablePage';
import ExpensesManagementPage from './pages/admin/ExpensesManagementPage';
import ExpenseCategoriesPage from './pages/admin/ExpenseCategoriesPage';
import RevenuesManagementPage from './pages/admin/RevenuesManagementPage';
import RevenueCategoriesPage from './pages/admin/RevenueCategoriesPage';
import CashJournalPage from './pages/admin/CashJournalPage';
import FreePaymentPage from './pages/admin/FreePaymentPage';
import UniversitySettingsPage from './pages/admin/UniversitySettingsPage';
import MyPaymentsPage from './pages/student/MyPaymentsPage';
import ImportDataPage from './pages/admin/ImportDataPage';
import NotificationsPage from './pages/NotificationsPage';
import InboxPage from './pages/messages/InboxPage';
import ComposeMessagePage from './pages/messages/ComposeMessagePage';
import MessageDetailPage from './pages/messages/MessageDetailPage';
import MessageBatchDetailPage from './pages/messages/MessageBatchDetailPage';
import StudentSchedulePage from './pages/student/StudentSchedulePage';
import SubscriptionPlansPage from './pages/admin/SubscriptionPlansPage';
import AcademicPeriodsManagementPage from './pages/admin/AcademicPeriodsManagementPage';
import LibraryResourcesPage from './pages/admin/LibraryResourcesPage';
import LibraryBooksPage from './pages/admin/LibraryBooksPage';
import LibraryLoansPage from './pages/admin/LibraryLoansPage';
import LibraryManagementPage from './pages/admin/LibraryManagementPage';
import StudentLibraryPage from './pages/student/StudentLibraryPage';
import StudentCalendarPage from './pages/student/StudentCalendarPage';
import CalendarManagementPage from './pages/admin/CalendarManagementPage';
import AcademicPromotionPage from './pages/admin/AcademicPromotionPage';
import AcademicMenuPage from './pages/admin/AcademicMenuPage';
import FinancesMenuPage from './pages/admin/FinancesMenuPage';
import AcademicYearConfigPage from './pages/admin/AcademicYearConfigPage';
import TeacherStudentsAveragesPage from './pages/teacher/TeacherStudentsAveragesPage';
import AuditLogsPage from './pages/admin/AuditLogsPage';
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
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/signup/success" element={<SignupSuccessPage />} />
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
              <ProtectedRoute allowedRoles={['admin_universite', 'teacher']}>
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
            path="/admin/schedules"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <ClassScheduleManagementPage />
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
            path="/admin/grades"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <GradesListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/grades/:gradeId/edit"
            element={
              <ProtectedRoute allowedRoles={['admin_universite', 'teacher']}>
                <EditGradePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/grades/stats"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <GradesStatsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/payments"
            element={
              <ProtectedRoute allowedRoles={['admin_universite', 'comptable']}>
                <PaymentsManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/migrate-currency"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <MigrateCurrencyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/payments/migrate"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <MigratePaymentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tuition-fees"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <TuitionFeesManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/payments/create-bulk"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <CreateBulkPaymentPlansPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/payments/migrate"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <MigratePaymentPlansPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/payments/create"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <CreatePaymentPlanPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/payments/free"
            element={
              <ProtectedRoute allowedRoles={['admin_universite', 'comptable']}>
                <FreePaymentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/accounting"
            element={
              <ProtectedRoute allowedRoles={['admin_universite', 'comptable']}>
                <AccountingDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/accounting/journal"
            element={
              <ProtectedRoute allowedRoles={['admin_universite', 'comptable']}>
                <TransactionJournalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/accounting/expenses"
            element={
              <ProtectedRoute allowedRoles={['admin_universite', 'comptable']}>
                <ExpensesManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/accounting/expenses/categories"
            element={
              <ProtectedRoute allowedRoles={['admin_universite', 'comptable']}>
                <ExpenseCategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/accounting/revenues"
            element={
              <ProtectedRoute allowedRoles={['admin_universite', 'comptable']}>
                <RevenuesManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/accounting/revenues/categories"
            element={
              <ProtectedRoute allowedRoles={['admin_universite', 'comptable']}>
                <RevenueCategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/accounting/cash-journal"
            element={
              <ProtectedRoute allowedRoles={['admin_universite', 'comptable']}>
                <CashJournalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/comptable/create"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <CreateComptablePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <UniversitySettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Library Routes */}
          <Route
            path="/admin/library/management"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <LibraryManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/library/resources"
            element={
              <ProtectedRoute allowedRoles={['admin_universite', 'teacher']}>
                <LibraryResourcesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/library/books"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <LibraryBooksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/library/loans"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <LibraryLoansPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/library"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentLibraryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/import"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <ImportDataPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/subscription/plans"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <SubscriptionPlansPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/academic-periods"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <AcademicPeriodsManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/calendar"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <CalendarManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/academic-promotion"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <AcademicPromotionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/academic-menu"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <AcademicMenuPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/finances-menu"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <FinancesMenuPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/academic-year-config"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <AcademicYearConfigPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <AuditLogsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/comptable"
            element={
              <ProtectedRoute allowedRoles={['comptable']}>
                <ComptableDashboard />
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
            path="/teacher/grades/history"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <GradesHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/schedule"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherSchedulePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/attendance"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <AttendancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/students-averages"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherStudentsAveragesPage />
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
            path="/student/grades/dashboard"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <GradesDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/absences"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <MyAbsencesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/schedule"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentSchedulePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/calendar"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentCalendarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/payments"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <MyPaymentsPage />
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
          <Route
            path="/parent/grades"
            element={
              <ProtectedRoute allowedRoles={['parent']}>
                <ParentGradesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent/absences"
            element={
              <ProtectedRoute allowedRoles={['parent']}>
                <ChildAbsencesPage />
              </ProtectedRoute>
            }
          />

          {/* Absences Management - Admin Only */}
          <Route
            path="/admin/absences"
            element={
              <ProtectedRoute allowedRoles={['admin_universite']}>
                <AbsencesManagementPage />
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

          {/* Notifications - All authenticated users */}
          <Route
            path="/notifications"
            element={
              <ProtectedRoute allowedRoles={['super_admin_plateforme', 'admin_universite', 'comptable', 'teacher', 'student', 'parent']}>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />

          {/* Messages - All authenticated users */}
          <Route
            path="/messages/inbox"
            element={
              <ProtectedRoute allowedRoles={['super_admin_plateforme', 'admin_universite', 'comptable', 'teacher', 'student', 'parent']}>
                <InboxPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages/compose"
            element={
              <ProtectedRoute allowedRoles={['super_admin_plateforme', 'admin_universite', 'comptable', 'teacher', 'student', 'parent']}>
                <ComposeMessagePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages/batch/:batchId"
            element={
              <ProtectedRoute allowedRoles={['super_admin_plateforme', 'admin_universite', 'comptable', 'teacher', 'student', 'parent']}>
                <MessageBatchDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages/:messageId"
            element={
              <ProtectedRoute allowedRoles={['super_admin_plateforme', 'admin_universite', 'comptable', 'teacher', 'student', 'parent']}>
                <MessageDetailPage />
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
