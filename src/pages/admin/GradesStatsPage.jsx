/**
 * GradesStatsPage.jsx - Statistiques globales des notes (Admin)
 *
 * Fonctionnalités:
 * - Stats par classe: moyenne, taux réussite, meilleure/pire note
 * - Stats par cours: difficulté, distribution notes
 * - Top 10 étudiants / Bottom 10
 * - Graphiques agrégés (BarChart, PieChart)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { ChevronLeft, TrendingUp, TrendingDown, Award, Users, BookOpen, Target, AlertCircle } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { calculateOverallAverage, getMention } from '../../utils/gradesCalculator';

export default function GradesStatsPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [allGrades, setAllGrades] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);

  const [classStats, setClassStats] = useState([]);
  const [courseStats, setCourseStats] = useState([]);
  const [topStudents, setTopStudents] = useState([]);
  const [bottomStudents, setBottomStudents] = useState([]);
  const [distributionData, setDistributionData] = useState([]);

  useEffect(() => {
    loadStats();
  }, [userProfile]);

  const loadStats = async () => {
    if (!userProfile?.universityId) return;

    try {
      setLoading(true);
      const univId = userProfile.universityId;

      // Charger toutes les notes
      const gradesRef = ref(database, `universities/${univId}/grades`);
      const gradesSnap = await get(gradesRef);
      const gradesData = gradesSnap.exists()
        ? Object.entries(gradesSnap.val()).map(([id, data]) => ({ id, ...data }))
        : [];
      setAllGrades(gradesData);

      // Charger étudiants
      const studentsRef = ref(database, `universities/${univId}/students`);
      const studentsSnap = await get(studentsRef);
      const studentsData = studentsSnap.exists()
        ? Object.entries(studentsSnap.val()).map(([id, data]) => ({ id, ...data }))
        : [];
      setStudents(studentsData);

      // Charger classes
      const classesRef = ref(database, `universities/${univId}/classes`);
      const classesSnap = await get(classesRef);
      const classesData = classesSnap.exists()
        ? Object.entries(classesSnap.val()).map(([id, data]) => ({ id, ...data }))
        : [];
      setClasses(classesData);

      // Charger cours
      const coursesRef = ref(database, `universities/${univId}/courses`);
      const coursesSnap = await get(coursesRef);
      const coursesData = coursesSnap.exists()
        ? Object.entries(coursesSnap.val()).map(([id, data]) => ({ id, ...data }))
        : [];
      setCourses(coursesData);

      // Calculer statistiques
      calculateClassStats(gradesData, classesData);
      calculateCourseStats(gradesData, coursesData);
      calculateTopBottomStudents(gradesData, studentsData);
      calculateDistribution(gradesData);

      setLoading(false);
    } catch (err) {
      console.error('Error loading stats:', err);
      setError('Erreur lors du chargement des statistiques');
      setLoading(false);
    }
  };

  const calculateClassStats = (grades, classesData) => {
    const stats = classesData.map(classData => {
      // Récupérer IDs étudiants de cette classe
      const classStudentIds = classData.students || [];

      // Filtrer notes des étudiants de cette classe
      const classGrades = grades.filter(g => classStudentIds.includes(g.studentId));

      if (classGrades.length === 0) {
        return {
          className: classData.name,
          studentsCount: classStudentIds.length,
          gradesCount: 0,
          average: null,
          successRate: 0,
          bestGrade: null,
          worstGrade: null
        };
      }

      // Calculer moyenne classe
      const totalWeighted = classGrades.reduce((sum, g) => {
        const normalized = (g.grade / g.maxGrade) * 20;
        return sum + normalized * g.coefficient;
      }, 0);
      const totalCoeff = classGrades.reduce((sum, g) => sum + g.coefficient, 0);
      const average = totalCoeff > 0 ? (totalWeighted / totalCoeff).toFixed(2) : null;

      // Meilleure et pire note
      const normalizedGrades = classGrades.map(g => (g.grade / g.maxGrade) * 20);
      const bestGrade = Math.max(...normalizedGrades).toFixed(2);
      const worstGrade = Math.min(...normalizedGrades).toFixed(2);

      // Taux de réussite (notes >= 10)
      const passedGrades = normalizedGrades.filter(g => g >= 10).length;
      const successRate = ((passedGrades / normalizedGrades.length) * 100).toFixed(0);

      return {
        className: classData.name,
        studentsCount: classStudentIds.length,
        gradesCount: classGrades.length,
        average: parseFloat(average),
        successRate: parseFloat(successRate),
        bestGrade: parseFloat(bestGrade),
        worstGrade: parseFloat(worstGrade)
      };
    });

    setClassStats(stats.sort((a, b) => (b.average || 0) - (a.average || 0)));
  };

  const calculateCourseStats = (grades, coursesData) => {
    const stats = coursesData.map(course => {
      const courseGrades = grades.filter(g => g.courseId === course.id);

      if (courseGrades.length === 0) {
        return {
          courseName: course.courseName || course.name,
          courseCode: course.courseCode || course.code,
          gradesCount: 0,
          average: null,
          successRate: 0,
          difficulty: 'N/A'
        };
      }

      // Calculer moyenne cours
      const totalWeighted = courseGrades.reduce((sum, g) => {
        const normalized = (g.grade / g.maxGrade) * 20;
        return sum + normalized * g.coefficient;
      }, 0);
      const totalCoeff = courseGrades.reduce((sum, g) => sum + g.coefficient, 0);
      const average = totalCoeff > 0 ? (totalWeighted / totalCoeff).toFixed(2) : null;

      // Taux de réussite
      const normalizedGrades = courseGrades.map(g => (g.grade / g.maxGrade) * 20);
      const passedGrades = normalizedGrades.filter(g => g >= 10).length;
      const successRate = ((passedGrades / normalizedGrades.length) * 100).toFixed(0);

      // Difficulté
      let difficulty = 'Moyen';
      if (average >= 14) difficulty = 'Facile';
      else if (average < 10) difficulty = 'Difficile';

      return {
        courseName: course.courseName || course.name,
        courseCode: course.courseCode || course.code,
        gradesCount: courseGrades.length,
        average: parseFloat(average),
        successRate: parseFloat(successRate),
        difficulty
      };
    });

    setCourseStats(stats.sort((a, b) => (b.average || 0) - (a.average || 0)));
  };

  const calculateTopBottomStudents = (grades, studentsData) => {
    const studentAverages = studentsData.map(student => {
      const studentGrades = grades.filter(g => g.studentId === student.id);

      if (studentGrades.length === 0) {
        return {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          matricule: student.matricule,
          className: student.className || 'N/A',
          average: null,
          gradesCount: 0
        };
      }

      const { overall } = calculateOverallAverage(studentGrades);

      return {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        matricule: student.matricule,
        className: student.className || 'N/A',
        average: overall,
        gradesCount: studentGrades.length,
        mention: getMention(overall)
      };
    });

    // Filtrer étudiants avec notes
    const studentsWithGrades = studentAverages.filter(s => s.average !== null);

    // Top 10
    const top = [...studentsWithGrades]
      .sort((a, b) => b.average - a.average)
      .slice(0, 10);
    setTopStudents(top);

    // Bottom 10
    const bottom = [...studentsWithGrades]
      .sort((a, b) => a.average - b.average)
      .slice(0, 10);
    setBottomStudents(bottom);
  };

  const calculateDistribution = (grades) => {
    const ranges = [
      { range: '0-5', min: 0, max: 5, count: 0, color: '#ef4444' },
      { range: '5-10', min: 5, max: 10, count: 0, color: '#f59e0b' },
      { range: '10-12', min: 10, max: 12, count: 0, color: '#eab308' },
      { range: '12-14', min: 12, max: 14, count: 0, color: '#3b82f6' },
      { range: '14-16', min: 14, max: 16, count: 0, color: '#8b5cf6' },
      { range: '16-20', min: 16, max: 20, count: 0, color: '#10b981' }
    ];

    grades.forEach(grade => {
      const normalized = (grade.grade / grade.maxGrade) * 20;
      ranges.forEach(r => {
        if (normalized >= r.min && normalized < r.max) {
          r.count++;
        }
      });
    });

    setDistributionData(ranges);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/admin/grades')}
            className="p-2 hover:bg-white rounded-xl transition"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Statistiques Globales - Notes</h1>
            <p className="text-gray-600 mt-1">Vue d'ensemble des performances académiques</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Stats globales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <BookOpen className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{allGrades.length}</p>
            <p className="text-sm text-gray-600">Notes enregistrées</p>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{students.length}</p>
            <p className="text-sm text-gray-600">Étudiants</p>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Target className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{classes.length}</p>
            <p className="text-sm text-gray-600">Classes</p>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Award className="h-8 w-8 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{courses.length}</p>
            <p className="text-sm text-gray-600">Cours</p>
          </div>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Distribution des notes */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              📊 Distribution des Notes
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={distributionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Moyennes par classe */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              🏫 Moyennes par Classe
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={classStats.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="className"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis domain={[0, 20]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" fill="#10b981" radius={[8, 8, 0, 0]} name="Moyenne /20" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top/Bottom étudiants */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top 10 */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-green-600" />
              Top 10 Étudiants
            </h2>
            <div className="space-y-3">
              {topStudents.map((student, index) => (
                <div key={student.id} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <span className="text-2xl font-black text-green-600 w-8">#{index + 1}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{student.name}</p>
                    <p className="text-xs text-gray-600">{student.className} • {student.gradesCount} notes</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-600">{student.average.toFixed(2)}/20</p>
                    <p className="text-xs text-gray-600">{student.mention}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom 10 */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingDown className="h-6 w-6 text-red-600" />
              Étudiants en Difficulté
            </h2>
            <div className="space-y-3">
              {bottomStudents.map((student, index) => (
                <div key={student.id} className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <span className="text-2xl font-black text-red-600 w-8">#{index + 1}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{student.name}</p>
                    <p className="text-xs text-gray-600">{student.className} • {student.gradesCount} notes</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-red-600">{student.average.toFixed(2)}/20</p>
                    <p className="text-xs text-gray-600">{student.mention || 'Insuffisant'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats par cours */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📚 Statistiques par Cours</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Cours</th>
                  <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Nb Notes</th>
                  <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Moyenne</th>
                  <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Taux Réussite</th>
                  <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Difficulté</th>
                </tr>
              </thead>
              <tbody>
                {courseStats.map((course, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-blue-50 transition">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-gray-900">{course.courseName}</p>
                      <p className="text-xs text-gray-600">{course.courseCode}</p>
                    </td>
                    <td className="text-center py-3 px-4 text-gray-700">{course.gradesCount}</td>
                    <td className="text-center py-3 px-4">
                      <span className={`font-bold ${course.average >= 10 ? 'text-green-600' : 'text-red-600'}`}>
                        {course.average !== null ? course.average.toFixed(2) : 'N/A'}/20
                      </span>
                    </td>
                    <td className="text-center py-3 px-4 text-gray-700">{course.successRate}%</td>
                    <td className="text-center py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        course.difficulty === 'Facile' ? 'bg-green-100 text-green-700' :
                        course.difficulty === 'Difficile' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {course.difficulty}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
