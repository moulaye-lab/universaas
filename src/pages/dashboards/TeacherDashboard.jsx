/**
 * Dashboard Enseignant
 * Interface complète pour les professeurs avec gestion des cours, notes et sessions live
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, set, push } from 'firebase/database';
import { useAuth } from '../../contexts/AuthContext';
import { database } from '../../config/firebase';
import {
  BookOpen,
  Users,
  FileText,
  Video,
  GraduationCap,
  LogOut,
  Plus,
  Calendar,
  Clock,
  TrendingUp,
  Award,
  Bell,
  Settings,
  Search,
  ChevronRight,
  Play,
  UserCheck,
  ClipboardCheck,
  Sparkles,
  AlertCircle,
  CheckCircle,
  BarChart2
} from 'lucide-react';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { userProfile, signOut, currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    pendingGrades: 0,
    nextLiveSession: null,
  });
  const [courses, setCourses] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [showGradeForm, setShowGradeForm] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);

  // États pour le formulaire de notes
  const [gradeForm, setGradeForm] = useState({
    courseId: '',
    studentId: '',
    grade: '',
    gradeType: 'Devoir',
  });
  const [students, setStudents] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, [userProfile]);

  const loadDashboardData = async () => {
    try {
      if (!userProfile?.universityId || !currentUser?.uid) {
        return;
      }

      // Charger TOUS les cours et filtrer ceux assignés au professeur
      const coursesRef = ref(database, `universities/${userProfile.universityId}/courses`);
      const coursesSnap = await get(coursesRef);

      let coursesData = [];
      if (coursesSnap.exists()) {
        const allCourses = coursesSnap.val();
        coursesData = Object.entries(allCourses)
          .map(([id, data]) => ({ id, ...data }))
          .filter(course => course.teacherId === currentUser.uid);
      }

      setCourses(coursesData);

      // Calculer les statistiques
      const totalStudents = coursesData.reduce((sum, course) => sum + (course.enrolledStudents?.length || 0), 0);

      // Charger les sessions live à venir
      const sessionsRef = ref(database, `universities/${userProfile.universityId}/liveSessions`);
      const sessionsSnap = await get(sessionsRef);

      let sessionsData = [];
      if (sessionsSnap.exists()) {
        const allSessions = sessionsSnap.val();
        sessionsData = Object.keys(allSessions)
          .map(id => ({ id, ...allSessions[id] }))
          .filter(session => session.teacherId === currentUser.uid && new Date(session.scheduledDate) > new Date())
          .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
      }

      setLiveSessions(sessionsData);

      // Calculer le nombre de devoirs en attente (notes à corriger)
      // Note: Pour l'instant on met 0 car il n'y a pas de système de "devoirs à rendre"
      // Si vous voulez implémenter un système de devoirs rendus par les étudiants,
      // il faudra créer une collection "assignments" dans Firebase
      const pendingGrades = 0; // TODO: Implémenter système de devoirs rendus

      setStats({
        totalCourses: coursesData.length,
        totalStudents,
        pendingGrades: pendingGrades,
        nextLiveSession: sessionsData[0] || null,
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      alert('Erreur de chargement: ' + error.message);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleCourseClick = (courseId) => {
    // Navigation vers la page de détails du cours
    navigate(`/admin/courses/${courseId}`);
  };

  const handleCourseChange = async (courseId) => {
    setGradeForm({ ...gradeForm, courseId, studentId: '' });
    setStudents([]); // Reset students
    setError('');

    if (courseId) {
      try {
        setLoadingStudents(true);
        // console.log('🔄 Loading students for course:', courseId);

        // Charger les infos du cours (avec coefficient)
        const course = courses.find(c => c.id === courseId);
        setSelectedCourse(course);
        // console.log('📚 Course found:', course);

        // Charger les étudiants inscrits au cours
        const courseRef = ref(database, `universities/${userProfile.universityId}/courses/${courseId}`);
        const courseSnap = await get(courseRef);

        if (courseSnap.exists()) {
          const courseData = courseSnap.val();
          const enrolledIds = courseData.enrolledStudents || [];
          // console.log('📝 Enrolled IDs:', enrolledIds.length, enrolledIds);

          if (enrolledIds.length > 0) {
            const studentsRef = ref(database, `universities/${userProfile.universityId}/students`);
            const studentsSnap = await get(studentsRef);

            if (studentsSnap.exists()) {
              const studentsData = [];
              const allStudents = studentsSnap.val();

              enrolledIds.forEach(studentId => {
                if (allStudents[studentId]) {
                  const student = allStudents[studentId];
                  studentsData.push({
                    id: studentId,
                    firstName: student.firstName,
                    lastName: student.lastName,
                    email: student.email,
                    level: student.level,
                  });
                }
              });

              // console.log('✅ Students loaded:', studentsData.length, studentsData);
              setStudents(studentsData);
            }
          } else {
            // console.log('⚠️ No students enrolled');
            setStudents([]);
          }
        }
      } catch (error) {
        console.error('❌ Error loading course data:', error);
        setError('Erreur lors du chargement des étudiants: ' + error.message);
      } finally {
        setLoadingStudents(false);
      }
    } else {
      setSelectedCourse(null);
    }
  };

  const handleSubmitGrade = async (e) => {
    e.preventDefault();
    setSuccessMessage('');

    try {
      const { courseId, studentId, grade, gradeType } = gradeForm;

      // Validation
      if (!courseId || !studentId || !grade) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
      }

      const gradeValue = parseFloat(grade);
      if (isNaN(gradeValue) || gradeValue < 0 || gradeValue > 20) {
        alert('La note doit être entre 0 et 20');
        return;
      }

      // Récupérer le coefficient du cours
      const courseCoefficient = selectedCourse?.coefficient || 1;

      // Charger les notes existantes de l'étudiant pour ce cours
      const gradesRef = ref(database, `universities/${userProfile.universityId}/grades/${studentId}`);
      const gradesSnap = await get(gradesRef);

      let existingGrades = {};
      if (gradesSnap.exists()) {
        existingGrades = gradesSnap.val();
      }

      // Créer ou mettre à jour les notes du cours
      if (!existingGrades[courseId]) {
        existingGrades[courseId] = {
          assignments: [],
          exams: [],
          projects: [],
          average: 0,
          letterGrade: 'N/A',
          status: 'published',
          publishedAt: Date.now(),
          courseCoefficient: courseCoefficient
        };
      }

      // Ajouter la nouvelle note selon le type
      const newGrade = {
        name: `${gradeType} ${Date.now()}`,
        grade: gradeValue,
        maxGrade: 20,
        coefficient: courseCoefficient,
        date: Date.now(),
        teacherId: currentUser.uid
      };

      if (gradeType === 'Devoir') {
        existingGrades[courseId].assignments.push(newGrade);
      } else if (gradeType === 'Examen') {
        existingGrades[courseId].exams.push(newGrade);
      } else if (gradeType === 'Projet') {
        existingGrades[courseId].projects.push(newGrade);
      }

      // Calculer la moyenne du cours
      const allGrades = [
        ...existingGrades[courseId].assignments,
        ...existingGrades[courseId].exams,
        ...existingGrades[courseId].projects
      ];

      let totalWeighted = 0;
      let totalCoeff = 0;

      allGrades.forEach(g => {
        totalWeighted += g.grade * g.coefficient;
        totalCoeff += g.coefficient;
      });

      const average = totalCoeff > 0 ? (totalWeighted / totalCoeff).toFixed(1) : 0;
      const letterGrade = average >= 16 ? 'A' : average >= 14 ? 'B' : average >= 12 ? 'C' : average >= 10 ? 'D' : 'F';

      existingGrades[courseId].average = parseFloat(average);
      existingGrades[courseId].letterGrade = letterGrade;
      existingGrades[courseId].courseCoefficient = courseCoefficient;

      // Sauvegarder dans Firebase
      await set(gradesRef, existingGrades);

      setSuccessMessage(`✅ Note enregistrée : ${gradeValue}/20 pour ${gradeType} (Coefficient cours: ${courseCoefficient}, Moyenne: ${average}/20)`);

      setGradeForm({
        courseId: gradeForm.courseId,
        studentId: gradeForm.studentId,
        grade: '',
        gradeType: 'Devoir',
      });

      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error submitting grade:', error);
      alert('Erreur lors de l\'enregistrement de la note : ' + error.message);
    }
  };

  const handleStartLiveSession = (sessionId) => {
    // Navigation vers la session live
    navigate(`/live-session/${sessionId}`);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-green-50">
      {/* Navbar Sticky */}
      <nav className="glass border-b border-white/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-green-600 to-emerald-600 p-2 rounded-xl shadow-lg">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-black text-gray-900">UniverSaaS</h1>
                <p className="text-xs text-gray-600 font-medium">Espace Enseignant</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-white/50 rounded-xl transition-colors relative">
                <Bell className="h-5 w-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="hidden sm:flex items-center gap-3 glass px-4 py-2 rounded-xl">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  {userProfile?.displayName?.charAt(0) || 'P'}
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">{userProfile?.displayName || 'Professeur'}</p>
                  <p className="text-xs text-gray-600">{userProfile?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="bg-white hover:bg-red-50 text-red-600 p-2 rounded-xl border-2 border-red-200 transition-all hover:scale-105"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in">
          <h2 className="text-4xl font-black text-gray-900 mb-2">
            Bonjour, {userProfile?.displayName?.split(' ')[0] || 'Professeur'} !
          </h2>
          <p className="text-gray-600 text-lg">
            Voici un aperçu de vos cours et activités du jour
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Mes Cours */}
          <div className="glass p-6 rounded-3xl hover-lift group cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors" />
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Mes Cours</p>
            <p className="text-3xl font-black text-gray-900">{stats.totalCourses}</p>
            <p className="text-xs text-gray-500 mt-2">Cours actifs</p>
          </div>

          {/* Mes Étudiants */}
          <div className="glass p-6 rounded-3xl hover-lift group cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow">
                <Users className="h-6 w-6 text-white" />
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Mes Étudiants</p>
            <p className="text-3xl font-black text-gray-900">{stats.totalStudents}</p>
            <p className="text-xs text-gray-500 mt-2">Tous cours confondus</p>
          </div>

          {/* Devoirs à corriger */}
          <div className="glass p-6 rounded-3xl hover-lift group cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow">
                <FileText className="h-6 w-6 text-white" />
              </div>
              {stats.pendingGrades > 0 && (
                <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">
                  {stats.pendingGrades}
                </span>
              )}
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">À Corriger</p>
            <p className="text-3xl font-black text-gray-900">{stats.pendingGrades}</p>
            <p className="text-xs text-gray-500 mt-2">Devoirs en attente</p>
          </div>

          {/* Prochaine Session Live */}
          <div className="glass p-6 rounded-3xl hover-lift group cursor-pointer bg-gradient-to-br from-purple-50 to-pink-50">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow">
                <Video className="h-6 w-6 text-white" />
              </div>
              {stats.nextLiveSession && (
                <Clock className="h-5 w-5 text-purple-600" />
              )}
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Session Live</p>
            {stats.nextLiveSession ? (
              <>
                <p className="text-lg font-black text-gray-900 line-clamp-1">
                  {stats.nextLiveSession.title}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {formatDate(stats.nextLiveSession.scheduledDate)}
                </p>
              </>
            ) : (
              <p className="text-gray-500 text-sm mt-2">Aucune session prévue</p>
            )}
          </div>
        </div>

        {/* Actions Rapides */}
        <div className="mb-8">
          <h3 className="text-xl font-black text-gray-900 mb-4">Actions Rapides</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/teacher/grades/input')}
              className="glass p-5 rounded-2xl hover-lift group text-left"
              data-tour="grades-input"
            >
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl flex-shrink-0">
                  <ClipboardCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Saisir des Notes</p>
                  <p className="text-xs text-gray-600">Enregistrer une évaluation</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate('/teacher/students-averages')}
              className="glass p-5 rounded-2xl hover-lift group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-3 rounded-xl flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Moyennes Étudiants</p>
                  <p className="text-xs text-gray-600">Suivi en temps réel</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate('/teacher/attendance')}
              className="glass p-5 rounded-2xl hover-lift group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-xl flex-shrink-0">
                  <UserCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Prendre les Présences</p>
                  <p className="text-xs text-gray-600">Enregistrer les absences</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate('/teacher/grades/history')}
              className="glass p-5 rounded-2xl hover-lift group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-orange-500 to-red-600 p-3 rounded-xl flex-shrink-0">
                  <BarChart2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Historique des Notes</p>
                  <p className="text-xs text-gray-600">Consulter et modifier</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate('/admin/library/resources')}
              className="glass p-5 rounded-2xl hover-lift group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl flex-shrink-0">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Mes Ressources</p>
                  <p className="text-xs text-gray-600">Gérer mes supports</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate('/teacher/schedule')}
              className="glass p-5 rounded-2xl hover-lift group text-left"
              data-tour="schedule"
            >
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-3 rounded-xl flex-shrink-0">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Mon Emploi du Temps</p>
                  <p className="text-xs text-gray-600">Voir mes séances</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate('/teacher/live-sessions')}
              className="glass p-5 rounded-2xl hover-lift group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-red-500 to-pink-600 p-3 rounded-xl flex-shrink-0">
                  <Video className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Cours en Direct</p>
                  <p className="text-xs text-gray-600">Sessions live 🔴</p>
                </div>
              </div>
            </button>

          </div>
        </div>

        {/* Mes Cours Section */}
        <div className="glass p-8 rounded-3xl mb-8" data-tour="students-list">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-black text-gray-900 mb-1">Mes Cours</h3>
              <p className="text-gray-600">Gérez vos cours et étudiants</p>
            </div>
          </div>

          {courses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Aucun cours assigné</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div
                  key={course.id}
                  onClick={() => handleCourseClick(course.id)}
                  className="glass p-6 rounded-2xl hover-lift cursor-pointer group border border-white/50"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                      {course.courseName?.charAt(0) || 'C'}
                    </div>
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                      {course.level || 'L1'}
                    </span>
                  </div>

                  <h4 className="font-black text-gray-900 text-lg mb-2 line-clamp-1">
                    {course.courseName || 'Cours'}
                  </h4>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{course.enrolledStudents?.length || 0} étudiants</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{course.credits || 0} ECTS</span>
                    </div>
                  </div>

                  <button className="w-full bg-white hover:bg-green-50 text-green-600 border-2 border-green-200 py-2 rounded-xl font-semibold transition-all group-hover:border-green-400 flex items-center justify-center gap-2">
                    Voir détails
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Saisie Notes Rapide */}
          <div className="glass p-8 rounded-3xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl">
                  <ClipboardCheck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900">Saisie Notes</h3>
                  <p className="text-gray-600 text-sm">Enregistrement rapide (1 note à la fois)</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/teacher/grades/input')}
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
              >
                Saisie complète
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-800">
                <p className="font-semibold mb-1">💡 Astuce</p>
                <p>Pour saisir plusieurs notes d'un coup (évaluation complète), utilisez la <button onClick={() => navigate('/teacher/grades/input')} className="underline font-semibold hover:text-blue-900">page de saisie complète</button></p>
              </div>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="mb-6 bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-center gap-3 animate-slide-up">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-700 font-medium">{successMessage}</p>
              </div>
            )}

            <form onSubmit={handleSubmitGrade} className="space-y-4">
              {/* Select Cours */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cours
                </label>
                <select
                  value={gradeForm.courseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none font-medium"
                  required
                >
                  <option value="">Sélectionner un cours</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.courseName} - {course.courseCode}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Étudiant */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Étudiant {students.length > 0 && <span className="text-gray-500 font-normal">({students.length} inscrit{students.length > 1 ? 's' : ''})</span>}
                </label>

                {loadingStudents ? (
                  <div className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    <span className="text-gray-600 text-sm">Chargement des étudiants...</span>
                  </div>
                ) : (
                  <>
                    <select
                      value={gradeForm.studentId}
                      onChange={(e) => setGradeForm({ ...gradeForm, studentId: e.target.value })}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none font-medium"
                      required
                      disabled={!gradeForm.courseId}
                    >
                      <option value="">
                        {!gradeForm.courseId
                          ? 'Sélectionner d\'abord un cours'
                          : students.length === 0
                            ? 'Aucun étudiant inscrit'
                            : 'Sélectionner un étudiant'}
                      </option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.firstName} {student.lastName}
                        </option>
                      ))}
                    </select>

                    {gradeForm.courseId && students.length === 0 && !loadingStudents && (
                      <p className="text-xs text-orange-600 mt-1">
                        ⚠️ Aucun étudiant inscrit à ce cours. Vérifiez la console (F12) pour les détails.
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Input Note */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Note /20
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  value={gradeForm.grade}
                  onChange={(e) => setGradeForm({ ...gradeForm, grade: e.target.value })}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none font-medium"
                  placeholder="15.5"
                  required
                />
              </div>

              {/* Affichage coefficient du cours */}
              {selectedCourse && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-700">
                    <span className="font-semibold">Coefficient du cours :</span> {selectedCourse.coefficient || 1}
                  </p>
                </div>
              )}

              {/* Select Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Type d'évaluation
                </label>
                <select
                  value={gradeForm.gradeType}
                  onChange={(e) => setGradeForm({ ...gradeForm, gradeType: e.target.value })}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none font-medium"
                  required
                >
                  <option value="Devoir">Devoir</option>
                  <option value="Examen">Examen</option>
                  <option value="Projet">Projet</option>
                  <option value="Participation">Participation</option>
                  <option value="TP">Travaux Pratiques</option>
                </select>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle className="h-5 w-5" />
                Enregistrer la note
              </button>
            </form>
          </div>

          {/* Sessions Live */}
          <div className="glass p-8 rounded-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-3 rounded-xl">
                <Video className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900">Sessions Live</h3>
                <p className="text-gray-600 text-sm">Prochaines sessions</p>
              </div>
            </div>

            {liveSessions.length === 0 ? (
              <div className="text-center py-12">
                <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium mb-4">Aucune session programmée</p>
                <button className="text-purple-600 font-semibold hover:text-purple-700 transition-colors">
                  Créer une session
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {liveSessions.slice(0, 4).map((session) => (
                  <div
                    key={session.id}
                    className="bg-white border-2 border-gray-200 p-4 rounded-xl hover:border-purple-300 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-gray-900 mb-1">{session.title}</h4>
                        <p className="text-sm text-gray-600">{session.courseName}</p>
                      </div>
                      <span className="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full">
                        {session.duration || '60'} min
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(session.scheduledDate)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{session.enrolledCount || 0} inscrits</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartLiveSession(session.id)}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 rounded-lg font-semibold hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                    >
                      <Play className="h-4 w-4" />
                      {new Date(session.scheduledDate) <= new Date() ? 'Démarrer' : 'Rejoindre'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Floating Action Button - Créer session live */}
      <button
        onClick={() => alert('⚠️ Fonctionnalité "Sessions Live" en cours de développement.\n\nBientôt vous pourrez créer des sessions de cours en direct avec vos étudiants.')}
        className="fixed bottom-8 right-8 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-5 rounded-full shadow-2xl hover:shadow-green-400/50 hover:scale-110 transition-all duration-300 group z-40 opacity-75"
      >
        <div className="flex items-center gap-3">
          <Plus className="h-7 w-7" />
          <span className="hidden group-hover:block font-bold text-sm whitespace-nowrap pr-2">
            🔜 Session live
          </span>
        </div>
      </button>
    </div>
  );
}
