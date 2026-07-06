/**
 * GradesDashboardPage.jsx - Dashboard graphiques notes (Étudiant)
 *
 * Fonctionnalités:
 * - Graphique évolution notes par cours (LineChart)
 * - Graphique répartition types évaluations (PieChart)
 * - Graphique comparaison moyennes par cours (BarChart)
 * - Stats: moyenne générale, taux réussite, tendance
 * - Filtres: semestre, période (30/60/90 jours)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, Award, Calendar } from 'lucide-react';

export default function GradesDashboardPage() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const [grades, setGrades] = useState([]);
  const [filteredGrades, setFilteredGrades] = useState([]);
  const [courses, setCourses] = useState({});
  const [period, setPeriod] = useState('all'); // all, 30, 60, 90
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Charger les notes
  useEffect(() => {
    const loadGrades = async () => {
      if (!userProfile?.universityId || !currentUser?.uid) return;

      try {
        setLoading(true);

        const gradesRef = ref(database, `universities/${userProfile.universityId}/grades`);
        const gradesSnap = await get(gradesRef);

        if (gradesSnap.exists()) {
          const allGrades = Object.entries(gradesSnap.val())
            .map(([id, data]) => ({ id, ...data }))
            .filter(grade => grade.studentId === currentUser.uid)
            .sort((a, b) => a.date - b.date); // Tri chronologique

          setGrades(allGrades);
          setFilteredGrades(allGrades);

          // Extraire cours uniques
          const uniqueCourses = {};
          allGrades.forEach(grade => {
            if (!uniqueCourses[grade.courseId]) {
              uniqueCourses[grade.courseId] = grade.courseName;
            }
          });
          setCourses(uniqueCourses);
        }
      } catch (err) {
        console.error('Error loading grades:', err);
        setError('Erreur lors du chargement des notes');
      } finally {
        setLoading(false);
      }
    };

    loadGrades();
  }, [userProfile, currentUser]);

  // Filtrer par période
  useEffect(() => {
    if (period === 'all') {
      setFilteredGrades(grades);
      return;
    }

    const now = Date.now();
    const periodMs = parseInt(period) * 24 * 60 * 60 * 1000; // Jours en ms
    const cutoffDate = now - periodMs;

    const filtered = grades.filter(g => g.date >= cutoffDate);
    setFilteredGrades(filtered);
  }, [period, grades]);

  // Calculer moyenne générale
  const calculateGeneralAverage = (gradesList = filteredGrades) => {
    if (gradesList.length === 0) return null;

    const totalWeighted = gradesList.reduce((sum, g) => {
      const normalized = (g.grade / g.maxGrade) * 20;
      return sum + (normalized * g.coefficient);
    }, 0);

    const totalCoefficients = gradesList.reduce((sum, g) => sum + g.coefficient, 0);

    return (totalWeighted / totalCoefficients).toFixed(2);
  };

  // Calculer taux de réussite
  const calculateSuccessRate = () => {
    if (filteredGrades.length === 0) return 0;

    const normalizedGrades = filteredGrades.map(g => (g.grade / g.maxGrade) * 20);
    const passedCount = normalizedGrades.filter(g => g >= 10).length;

    return Math.round((passedCount / filteredGrades.length) * 100);
  };

  // Calculer tendance (évolution moyenne dernières 5 notes)
  const calculateTrend = () => {
    if (grades.length < 5) return null;

    const last5 = grades.slice(-5).map(g => (g.grade / g.maxGrade) * 20);
    const first5 = grades.slice(0, 5).map(g => (g.grade / g.maxGrade) * 20);

    const avgLast5 = last5.reduce((sum, g) => sum + g, 0) / 5;
    const avgFirst5 = first5.reduce((sum, g) => sum + g, 0) / 5;

    const diff = avgLast5 - avgFirst5;

    return diff;
  };

  // Préparer données LineChart (évolution par cours)
  const prepareLineChartData = () => {
    const dataByDate = {};

    filteredGrades.forEach(grade => {
      const dateKey = new Date(grade.date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
      const normalized = (grade.grade / grade.maxGrade) * 20;

      if (!dataByDate[dateKey]) {
        dataByDate[dateKey] = { date: dateKey };
      }

      dataByDate[dateKey][grade.courseName] = parseFloat(normalized.toFixed(2));
    });

    return Object.values(dataByDate);
  };

  // Préparer données BarChart (moyennes par cours)
  const prepareBarChartData = () => {
    const dataByCourse = {};

    filteredGrades.forEach(grade => {
      if (!dataByCourse[grade.courseName]) {
        dataByCourse[grade.courseName] = {
          courseName: grade.courseName,
          grades: []
        };
      }

      const normalized = (grade.grade / grade.maxGrade) * 20;
      dataByCourse[grade.courseName].grades.push({
        value: normalized,
        coefficient: grade.coefficient
      });
    });

    return Object.values(dataByCourse).map(course => {
      const totalWeighted = course.grades.reduce((sum, g) => sum + (g.value * g.coefficient), 0);
      const totalCoef = course.grades.reduce((sum, g) => sum + g.coefficient, 0);
      const average = totalWeighted / totalCoef;

      return {
        name: course.courseName.length > 15 ? course.courseName.substring(0, 15) + '...' : course.courseName,
        moyenne: parseFloat(average.toFixed(2))
      };
    });
  };

  // Préparer données PieChart (répartition types)
  const preparePieChartData = () => {
    const typeCount = {};

    filteredGrades.forEach(grade => {
      const typeLabel = {
        exam: 'Examens',
        homework: 'Devoirs',
        continuous_assessment: 'CC',
        project: 'Projets',
        oral: 'Oraux',
        practical: 'TP'
      }[grade.gradeType] || 'Autre';

      typeCount[typeLabel] = (typeCount[typeLabel] || 0) + 1;
    });

    return Object.entries(typeCount).map(([name, value]) => ({ name, value }));
  };

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

  const generalAverage = calculateGeneralAverage();
  const successRate = calculateSuccessRate();
  const trend = calculateTrend();

  const lineChartData = prepareLineChartData();
  const barChartData = prepareBarChartData();
  const pieChartData = preparePieChartData();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || grades.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="glass rounded-3xl p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {error || 'Aucune note disponible'}
            </h3>
            <p className="text-gray-600 mb-6">
              Vos statistiques apparaîtront dès que des notes seront enregistrées
            </p>
            <button
              onClick={() => navigate('/dashboard/student')}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-semibold"
            >
              ← Retour au tableau de bord
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2">
              📈 Tableau de Bord Notes
            </h1>
            <p className="text-gray-600">
              Analyse de vos {filteredGrades.length} note{filteredGrades.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-4">
            {/* Filtre période */}
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">Toute l'année</option>
              <option value="30">30 derniers jours</option>
              <option value="60">60 derniers jours</option>
              <option value="90">90 derniers jours</option>
            </select>
            <button
              onClick={() => navigate('/dashboard/student')}
              className="px-6 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold shadow"
            >
              ← Retour
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Moyenne générale */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-600">Moyenne Générale</p>
              <Award className="w-5 h-5 text-blue-600" />
            </div>
            <p className={`text-5xl font-black ${parseFloat(generalAverage) >= 10 ? 'text-green-600' : 'text-red-600'}`}>
              {generalAverage}
              <span className="text-2xl">/20</span>
            </p>
          </div>

          {/* Taux de réussite */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-600">Taux de Réussite</p>
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-5xl font-black text-green-600">
              {successRate}
              <span className="text-2xl">%</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">Notes ≥ 10/20</p>
          </div>

          {/* Tendance */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-600">Tendance</p>
              {trend !== null && (
                trend > 0 ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />
              )}
            </div>
            {trend !== null ? (
              <>
                <p className={`text-5xl font-black ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trend > 0 ? '+' : ''}{trend.toFixed(1)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {trend > 0 ? 'En progression' : 'En baisse'}
                </p>
              </>
            ) : (
              <p className="text-gray-500 text-sm">Données insuffisantes</p>
            )}
          </div>
        </div>

        {/* Graphique évolution */}
        {lineChartData.length > 0 && (
          <div className="glass rounded-2xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📈 Évolution des Notes</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 20]} />
                <Tooltip />
                <Legend />
                {Object.keys(courses).map((courseId, index) => (
                  <Line
                    key={courseId}
                    type="monotone"
                    dataKey={courses[courseId]}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Graphiques moyennes + répartition */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Bar Chart moyennes par cours */}
          {barChartData.length > 0 && (
            <div className="glass rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 Moyennes par Cours</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis domain={[0, 20]} />
                  <Tooltip />
                  <Bar dataKey="moyenne" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Pie Chart répartition types */}
          {pieChartData.length > 0 && (
            <div className="glass rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">🎯 Répartition des Évaluations</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Lien vers notes détaillées */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/student/grades')}
            className="px-8 py-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-semibold text-lg shadow-lg"
          >
            📝 Voir toutes mes notes
          </button>
        </div>
      </div>
    </div>
  );
}
