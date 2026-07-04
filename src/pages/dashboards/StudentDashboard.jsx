import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import {
  TrendingUp,
  BookOpen,
  Clock,
  AlertCircle,
  Download,
  Play,
  FileText,
  Video,
  LogOut,
  Eye,
  Sparkles
} from 'lucide-react';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { userProfile, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState(null);
  const [stats, setStats] = useState({
    averageGrade: 0,
    coursesCount: 0,
    pendingAssignments: 0,
    absences: 0
  });
  const [grades, setGrades] = useState([]);
  const [videos, setVideos] = useState([]);
  const [library, setLibrary] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, [userProfile]);

  const loadDashboardData = async () => {
    try {
      if (!userProfile?.universityId) {
        console.error('No universityId in profile');
        setLoading(false);
        return;
      }

      const uniId = userProfile.universityId;
      const studentId = userProfile.profileId || userProfile.uid;

      console.log('Loading dashboard for:', { uniId, studentId });

      // Load student profile
      const studentRef = ref(database, `universities/${uniId}/students/${studentId}`);
      const studentSnap = await get(studentRef);

      if (studentSnap.exists()) {
        const studentInfo = { id: studentId, ...studentSnap.val() };
        setStudentData(studentInfo);
        console.log('Student data loaded:', studentInfo);
      } else {
        console.warn('Student profile not found');
      }

      // Load grades
      const gradesRef = ref(database, `universities/${uniId}/grades/${studentId}`);
      const gradesSnap = await get(gradesRef);

      let gradesData = [];
      if (gradesSnap.exists()) {
        const data = gradesSnap.val();

        // Charger les noms de cours depuis Firebase
        const coursesRef = ref(database, `universities/${uniId}/courses`);
        const coursesSnap = await get(coursesRef);
        const coursesData = coursesSnap.exists() ? coursesSnap.val() : {};

        // Structure: { 'course-id': { assignments: [], exams: [], projects: [], average: 15.2 }, ... }
        // Convertir chaque note individuelle en ligne du tableau
        Object.keys(data).forEach(courseId => {
          const courseGrades = data[courseId];
          const courseName = coursesData[courseId]?.name || courseId;
          const courseCoefficient = courseGrades.courseCoefficient || coursesData[courseId]?.coefficient || 1;

          // Ajouter chaque devoir
          if (courseGrades.assignments) {
            courseGrades.assignments.forEach(assignment => {
              gradesData.push({
                courseId,
                courseName,
                grade: assignment.grade,
                coefficient: courseCoefficient,
                type: 'Devoir',
                date: assignment.date,
                maxGrade: assignment.maxGrade || 20,
              });
            });
          }

          // Ajouter chaque examen
          if (courseGrades.exams) {
            courseGrades.exams.forEach(exam => {
              gradesData.push({
                courseId,
                courseName,
                grade: exam.grade,
                coefficient: courseCoefficient,
                type: 'Examen',
                date: exam.date,
                maxGrade: exam.maxGrade || 20,
              });
            });
          }

          // Ajouter chaque projet
          if (courseGrades.projects) {
            courseGrades.projects.forEach(project => {
              gradesData.push({
                courseId,
                courseName,
                grade: project.grade,
                coefficient: courseCoefficient,
                type: 'Projet',
                date: project.date,
                maxGrade: project.maxGrade || 20,
              });
            });
          }
        });

        // Trier par date (plus récent en premier)
        gradesData.sort((a, b) => (b.date || 0) - (a.date || 0));

        setGrades(gradesData);
        console.log('Grades loaded:', gradesData);
      } else {
        console.log('No grades found');
      }

      // Calculate stats
      calculateStats(gradesData, studentSnap.exists() ? studentSnap.val() : null);

      // Load live sessions (videos)
      const sessionsRef = ref(database, `universities/${uniId}/liveSessions`);
      const sessionsSnap = await get(sessionsRef);

      if (sessionsSnap.exists()) {
        const allSessions = sessionsSnap.val();
        const videosData = Object.keys(allSessions)
          .map(key => ({ id: key, ...allSessions[key] }))
          .filter(session => session.isRecorded === true)
          .sort((a, b) => (b.recordedAt || 0) - (a.recordedAt || 0));
        setVideos(videosData);
        console.log('Videos loaded:', videosData.length);
      } else {
        console.log('No videos found');
      }

      // Load library resources
      const libraryRef = ref(database, `universities/${uniId}/library`);
      const librarySnap = await get(libraryRef);

      if (librarySnap.exists()) {
        const allLibrary = librarySnap.val();
        const libraryData = Object.keys(allLibrary).map(key => ({
          id: key,
          ...allLibrary[key]
        }));
        setLibrary(libraryData);
        console.log('Library loaded:', libraryData.length);
      } else {
        console.log('No library resources found');
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      alert('Erreur de chargement: ' + error.message);
      setLoading(false);
    }
  };

  const calculateStats = (gradesData, studentInfo) => {
    if (!gradesData || gradesData.length === 0) {
      setStats({
        averageGrade: 0,
        coursesCount: 0,
        pendingAssignments: 0,
        absences: studentInfo?.absences || 0
      });
      return;
    }

    // Calculer moyenne générale pondérée par coefficient
    let totalWeighted = 0;
    let totalCoeff = 0;
    const uniqueCourses = new Set();

    gradesData.forEach(grade => {
      const gradeValue = parseFloat(grade.grade);
      const coeff = parseFloat(grade.coefficient) || 1;

      if (!isNaN(gradeValue) && gradeValue > 0) {
        totalWeighted += gradeValue * coeff;
        totalCoeff += coeff;
      }

      uniqueCourses.add(grade.courseId);
    });

    const generalAverage = totalCoeff > 0 ? (totalWeighted / totalCoeff).toFixed(2) : 0;

    setStats({
      averageGrade: parseFloat(generalAverage),
      coursesCount: uniqueCourses.size,
      pendingAssignments: 0,
      absences: studentInfo?.absences || 0
    });
  };

  const getGradeBadge = (grade) => {
    if (grade >= 16) return { label: 'A', color: 'bg-gradient-to-r from-green-500 to-emerald-500' };
    if (grade >= 14) return { label: 'B', color: 'bg-gradient-to-r from-blue-500 to-cyan-500' };
    if (grade >= 12) return { label: 'C', color: 'bg-gradient-to-r from-yellow-500 to-orange-500' };
    if (grade >= 10) return { label: 'D', color: 'bg-gradient-to-r from-orange-500 to-red-500' };
    return { label: 'F', color: 'bg-gradient-to-r from-red-500 to-rose-600' };
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleExportData = async () => {
    const exportData = {
      profile: studentData,
      grades: grades,
      stats: stats,
      exportDate: new Date().toISOString()
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `student-data-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR');
  };

  const getResourceIcon = (type) => {
    if (type === 'video') return <Video className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-violet-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-violet-50">
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-purple-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-violet-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                UniSaaS
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {studentData?.firstName} {studentData?.lastName}
                </p>
                <p className="text-xs text-gray-500">Student</p>
              </div>
              {studentData?.photoURL ? (
                <img
                  src={studentData.photoURL}
                  alt="Profile"
                  className="w-10 h-10 rounded-full ring-2 ring-purple-500"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center text-white font-semibold">
                  {studentData?.firstName?.[0]}{studentData?.lastName?.[0]}
                </div>
              )}
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bienvenue, {studentData?.firstName} !
          </h1>
          <p className="text-gray-600">Voici un apercu de votre progression academique</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Average Grade */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-purple-100 shadow-lg hover:shadow-xl transition-all duration-300 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Moyenne Generale</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
              {stats.averageGrade}/20
            </p>
          </div>

          {/* Courses */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-purple-100 shadow-lg hover:shadow-xl transition-all duration-300 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Cours Suivis</p>
            <p className="text-3xl font-bold text-gray-900">{stats.coursesCount}</p>
          </div>

          {/* Pending Assignments */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-purple-100 shadow-lg hover:shadow-xl transition-all duration-300 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Devoirs en Attente</p>
            <p className="text-3xl font-bold text-gray-900">{stats.pendingAssignments}</p>
          </div>

          {/* Absences */}
          <div className={`bg-white/60 backdrop-blur-sm rounded-2xl p-6 border ${stats.absences > 0 ? 'border-red-200' : 'border-purple-100'} shadow-lg hover:shadow-xl transition-all duration-300 animate-slide-up`} style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${stats.absences > 0 ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-gradient-to-br from-green-500 to-emerald-600'} rounded-xl flex items-center justify-center`}>
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Absences</p>
            <p className="text-3xl font-bold text-gray-900">{stats.absences}</p>
          </div>
        </div>

        {/* Grades Section */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-purple-100 shadow-lg mb-8 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <TrendingUp className="w-6 h-6 mr-2 text-purple-600" />
            Mes Notes
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-100">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Cours</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Note</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Coefficient</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Grade</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((gradeItem, index) => {
                  const badge = getGradeBadge(parseFloat(gradeItem.grade || 0));

                  return (
                    <tr key={index} className="border-b border-purple-50 hover:bg-purple-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <p className="font-medium text-gray-900">{gradeItem.courseName}</p>
                        <p className="text-xs text-gray-500">{gradeItem.courseId}</p>
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className="font-bold text-gray-900">{gradeItem.grade || 0}/20</span>
                      </td>
                      <td className="text-center py-4 px-4 text-gray-700">{gradeItem.coefficient || 1}</td>
                      <td className="text-center py-4 px-4">
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                          {gradeItem.type || 'Examen'}
                        </span>
                      </td>
                      <td className="text-center py-4 px-4 text-gray-700 text-sm">
                        {formatDate(gradeItem.date)}
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-white font-semibold text-sm ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {grades.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Aucune note disponible pour le moment
              </div>
            )}
          </div>
        </div>

        {/* Videos Section */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-purple-100 shadow-lg mb-8 animate-slide-up" style={{ animationDelay: '0.5s' }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Video className="w-6 h-6 mr-2 text-purple-600" />
            Cours Video
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <div key={video.id} className="bg-white rounded-xl overflow-hidden border border-purple-100 hover:shadow-lg transition-all duration-300 group">
                <div className="relative h-40 bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                  {video.thumbnailUrl ? (
                    <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                  ) : (
                    <Play className="w-16 h-16 text-white opacity-50" />
                  )}
                  <span className="absolute top-2 right-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center space-x-1">
                    <Eye className="w-3 h-3" />
                    <span>Enregistre</span>
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{video.title}</h3>
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{video.description || 'Pas de description'}</p>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                    <span>{formatDate(video.recordedAt)}</span>
                    <span>{formatDuration(video.duration || 0)}</span>
                  </div>
                  <a
                    href={video.recordingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white py-2 rounded-lg font-medium transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    <Play className="w-4 h-4" />
                    <span>Regarder</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
          {videos.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Aucune video disponible pour le moment
            </div>
          )}
        </div>

        {/* Library Section */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-purple-100 shadow-lg mb-8 animate-slide-up" style={{ animationDelay: '0.6s' }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <BookOpen className="w-6 h-6 mr-2 text-purple-600" />
            Bibliotheque
          </h2>

          <div className="space-y-3">
            {library.map((resource) => (
              <div key={resource.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-purple-100 hover:shadow-md transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-violet-100 rounded-lg flex items-center justify-center text-purple-600">
                    {getResourceIcon(resource.type)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{resource.title}</p>
                    <p className="text-sm text-gray-500">
                      {resource.type === 'video' ? 'Video' : resource.type === 'pdf' ? 'PDF' : 'Document'}
                      {resource.courseId && ` • ${resource.courseId}`}
                    </p>
                  </div>
                </div>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white rounded-lg font-medium transition-all duration-300"
                >
                  <Download className="w-4 h-4" />
                  <span>Telecharger</span>
                </a>
              </div>
            ))}
          </div>
          {library.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Aucune ressource disponible pour le moment
            </div>
          )}
        </div>

        {/* RGPD Export Button */}
        <div className="flex justify-center animate-slide-up" style={{ animationDelay: '0.7s' }}>
          <button
            onClick={handleExportData}
            className="flex items-center space-x-2 px-6 py-3 bg-white/60 backdrop-blur-sm border border-purple-200 hover:bg-white hover:shadow-lg text-gray-700 rounded-xl font-medium transition-all duration-300"
          >
            <Download className="w-5 h-5" />
            <span>Exporter mes donnees RGPD</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.6s ease-out backwards;
        }
      `}</style>
    </div>
  );
};

export default StudentDashboard;
