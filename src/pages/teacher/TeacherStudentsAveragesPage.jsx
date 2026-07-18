/**
 * TeacherStudentsAveragesPage.jsx - Suivi Moyennes Étudiants (Enseignant)
 *
 * Permet à l'enseignant de:
 * - Voir tous SES étudiants (classes où il enseigne)
 * - Consulter les moyennes en temps réel
 * - Identifier les étudiants en difficulté
 * - Filtrer par classe/cours
 * - Vue détaillée par étudiant
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { calculateYearAverage } from '../../utils/promotionHelpers';
import {
  ChevronLeft,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Filter,
  Eye,
  Award
} from 'lucide-react';
import LiveAverageDisplay from '../../components/LiveAverageDisplay';

export default function TeacherStudentsAveragesPage() {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [allGrades, setAllGrades] = useState([]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [teacherStudents, setTeacherStudents] = useState([]);

  useEffect(() => {
    if (!userProfile?.universityId || !currentUser?.uid) return;

    let unsubscribe = null;

    const loadData = async () => {
      try {
        setLoading(true);

        // 1. Charger les cours de l'enseignant
        const coursesRef = ref(database, `universities/${userProfile.universityId}/courses`);
        const coursesSnap = await get(coursesRef);

        let teacherCourses = [];
        if (coursesSnap.exists()) {
          teacherCourses = Object.entries(coursesSnap.val())
            .filter(([id, course]) => course.teacherId === currentUser.uid)
            .map(([id, course]) => ({ id, ...course }));
        }
        setCourses(teacherCourses);

        // 2. Extraire tous les étudiants inscrits aux cours de l'enseignant
        const teacherStudentIds = new Set();
        teacherCourses.forEach(course => {
          const enrolledIds = course.enrolledStudents || [];
          enrolledIds.forEach(id => teacherStudentIds.add(id));
        });

        // 3. Charger les étudiants
        const studentsRef = ref(database, `universities/${userProfile.universityId}/students`);
        const studentsSnap = await get(studentsRef);

        let loadedStudents = [];
        if (studentsSnap.exists()) {
          const allStudents = studentsSnap.val();
          teacherStudentIds.forEach(studentId => {
            if (allStudents[studentId]) {
              const student = allStudents[studentId];
              if (student.status !== 'inactive' && student.status !== 'graduated') {
                loadedStudents.push({ id: studentId, ...student });
              }
            }
          });
        }
        setTeacherStudents(loadedStudents);

        // 4. Extraire les classes uniques des étudiants
        const uniqueClassIds = [...new Set(loadedStudents.map(s => s.classId).filter(Boolean))];

        const classesRef = ref(database, `universities/${userProfile.universityId}/classes`);
        const classesSnap = await get(classesRef);

        let teacherClasses = [];
        if (classesSnap.exists()) {
          teacherClasses = Object.entries(classesSnap.val())
            .filter(([id]) => uniqueClassIds.includes(id))
            .map(([id, cls]) => ({ id, ...cls }));
        }
        setClasses(teacherClasses);

        // 5. Écouter les notes en temps réel
        const gradesRef = ref(database, `universities/${userProfile.universityId}/grades`);
        unsubscribe = onValue(gradesRef, (snapshot) => {
          const grades = snapshot.exists() ? Object.values(snapshot.val()) : [];
          setAllGrades(grades);

          // Calculer moyennes pour chaque étudiant
          const studentsWithAverages = loadedStudents.map(student => {
            const { semester1Avg, semester2Avg, yearAvg } = calculateYearAverage(student, grades);
            return {
              ...student,
              semester1Avg,
              semester2Avg,
              yearAvg
            };
          });

          // Trier par moyenne décroissante
          studentsWithAverages.sort((a, b) => (b.yearAvg || 0) - (a.yearAvg || 0));
          setStudents(studentsWithAverages);
          setLoading(false);
        });

      } catch (error) {
        console.error('Erreur chargement:', error);
        setLoading(false);
      }
    };

    loadData();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userProfile, currentUser]);

  // Filtrage
  const filteredStudents = students.filter(student => {
    const matchClass = selectedClass === 'all' || student.classId === selectedClass;
    const matchSearch = searchTerm === '' ||
      `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.matricule?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchClass && matchSearch;
  });

  // Statistiques
  const stats = {
    total: filteredStudents.length,
    excellent: filteredStudents.filter(s => s.yearAvg >= 16).length,
    good: filteredStudents.filter(s => s.yearAvg >= 12 && s.yearAvg < 16).length,
    passing: filteredStudents.filter(s => s.yearAvg >= 10 && s.yearAvg < 12).length,
    failing: filteredStudents.filter(s => s.yearAvg !== null && s.yearAvg < 10).length,
    noGrades: filteredStudents.filter(s => s.yearAvg === null).length
  };

  const getColorClass = (avg) => {
    if (avg === null) return 'text-gray-400';
    if (avg >= 16) return 'text-green-600';
    if (avg >= 14) return 'text-blue-600';
    if (avg >= 12) return 'text-yellow-600';
    if (avg >= 10) return 'text-orange-600';
    return 'text-red-600';
  };

  const getBadgeClass = (avg) => {
    if (avg === null) return 'bg-gray-100 text-gray-600';
    if (avg >= 16) return 'bg-green-100 text-green-700';
    if (avg >= 14) return 'bg-blue-100 text-blue-700';
    if (avg >= 12) return 'bg-yellow-100 text-yellow-700';
    if (avg >= 10) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  const handleViewDetails = (student) => {
    setSelectedStudent(student);
    setShowDetailModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/dashboard/teacher')}
              className="p-2 hover:bg-white rounded-xl transition shadow-sm"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📊 Moyennes de mes Étudiants</h1>
              <p className="text-gray-600 mt-1">Suivi en temps réel de la performance académique</p>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">🌟 Excellent</p>
            <p className="text-2xl font-bold text-green-600">{stats.excellent}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">👍 Bien</p>
            <p className="text-2xl font-bold text-blue-600">{stats.good}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">✅ Passable</p>
            <p className="text-2xl font-bold text-orange-600">{stats.passing}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">⚠️ Échec</p>
            <p className="text-2xl font-bold text-red-600">{stats.failing}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">❓ Sans notes</p>
            <p className="text-2xl font-bold text-gray-400">{stats.noGrades}</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="glass rounded-xl p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <Filter className="h-5 w-5 text-gray-600" />

            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Toutes les classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Rechercher étudiant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Tableau */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Rang</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Étudiant</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Classe</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">S1</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">S2</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">MGA</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Statut</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                      Aucun étudiant trouvé
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, index) => (
                    <tr key={student.id} className="hover:bg-blue-50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {index === 0 && student.yearAvg !== null && (
                            <Award className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className="font-semibold text-gray-900">#{index + 1}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{student.matricule}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{student.className}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-semibold ${getColorClass(student.semester1Avg)}`}>
                          {student.semester1Avg !== null ? student.semester1Avg.toFixed(2) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-semibold ${getColorClass(student.semester2Avg)}`}>
                          {student.semester2Avg !== null ? student.semester2Avg.toFixed(2) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xl font-bold ${getColorClass(student.yearAvg)}`}>
                          {student.yearAvg !== null ? student.yearAvg.toFixed(2) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getBadgeClass(student.yearAvg)}`}>
                          {student.yearAvg === null && 'Pas de notes'}
                          {student.yearAvg !== null && student.yearAvg >= 16 && '🌟 Excellent'}
                          {student.yearAvg !== null && student.yearAvg >= 14 && student.yearAvg < 16 && '👍 Très bien'}
                          {student.yearAvg !== null && student.yearAvg >= 12 && student.yearAvg < 14 && '😊 Bien'}
                          {student.yearAvg !== null && student.yearAvg >= 10 && student.yearAvg < 12 && '✅ Passable'}
                          {student.yearAvg !== null && student.yearAvg < 10 && '⚠️ Échec'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleViewDetails(student)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Voir détails"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alertes étudiants en difficulté */}
        {stats.failing > 0 && (
          <div className="glass rounded-xl p-6 mt-6 bg-orange-50 border-l-4 border-orange-500">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-900">
                  {stats.failing} étudiant{stats.failing > 1 ? 's' : ''} en difficulté
                </p>
                <p className="text-sm text-orange-700 mt-1">
                  Ces étudiants ont une moyenne inférieure à 10/20 et nécessitent un suivi particulier.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Détails */}
      {showDetailModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedStudent.firstName} {selectedStudent.lastName}
                  </h2>
                  <p className="text-gray-600">
                    {selectedStudent.matricule} • {selectedStudent.className}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <ChevronLeft className="h-6 w-6 text-gray-600" />
                </button>
              </div>

              <LiveAverageDisplay
                universityId={userProfile.universityId}
                studentId={selectedStudent.id}
                showDetails={true}
              />

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-semibold"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
