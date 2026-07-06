/**
 * MyGradesPage.jsx - Consultation des notes par l'étudiant
 *
 * Fonctionnalités:
 * - Afficher toutes les notes de l'étudiant
 * - Filtrer par cours
 * - Calculer la moyenne par cours
 * - Calculer la moyenne générale
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function MyGradesPage() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const [grades, setGrades] = useState([]);
  const [courses, setCourses] = useState({});
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadGrades = async () => {
      if (!userProfile?.universityId || !currentUser?.uid) return;

      try {
        setLoading(true);

        // Charger toutes les notes de l'étudiant
        const gradesRef = ref(database, `universities/${userProfile.universityId}/grades`);
        const gradesSnap = await get(gradesRef);

        if (gradesSnap.exists()) {
          const allGrades = Object.entries(gradesSnap.val())
            .map(([id, data]) => ({ id, ...data }))
            .filter(grade => grade.studentId === currentUser.uid)
            .sort((a, b) => b.date - a.date);

          setGrades(allGrades);

          // Extraire les cours uniques
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

  // Filtrer les notes par cours
  const filteredGrades = selectedCourse === 'all'
    ? grades
    : grades.filter(g => g.courseId === selectedCourse);

  // Calculer les moyennes par cours
  const calculateCourseAverage = (courseId) => {
    const courseGrades = grades.filter(g => g.courseId === courseId);
    if (courseGrades.length === 0) return null;

    const totalWeighted = courseGrades.reduce((sum, g) => {
      const normalizedGrade = (g.grade / g.maxGrade) * 20;
      return sum + (normalizedGrade * g.coefficient);
    }, 0);

    const totalCoefficients = courseGrades.reduce((sum, g) => sum + g.coefficient, 0);

    return (totalWeighted / totalCoefficients).toFixed(2);
  };

  // Calculer la moyenne générale
  const calculateGeneralAverage = () => {
    if (grades.length === 0) return null;

    const totalWeighted = grades.reduce((sum, g) => {
      const normalizedGrade = (g.grade / g.maxGrade) * 20;
      return sum + (normalizedGrade * g.coefficient);
    }, 0);

    const totalCoefficients = grades.reduce((sum, g) => sum + g.coefficient, 0);

    return (totalWeighted / totalCoefficients).toFixed(2);
  };

  // Obtenir la couleur selon la note
  const getGradeColor = (grade, maxGrade) => {
    const normalized = (grade / maxGrade) * 20;
    if (normalized >= 16) return 'text-green-600';
    if (normalized >= 14) return 'text-blue-600';
    if (normalized >= 12) return 'text-yellow-600';
    if (normalized >= 10) return 'text-orange-600';
    return 'text-red-600';
  };

  // Obtenir le badge selon le type
  const getGradeTypeBadge = (type) => {
    const types = {
      exam: { label: 'Examen', color: 'bg-purple-100 text-purple-700' },
      homework: { label: 'Devoir', color: 'bg-blue-100 text-blue-700' },
      continuous_assessment: { label: 'CC', color: 'bg-green-100 text-green-700' },
      project: { label: 'Projet', color: 'bg-orange-100 text-orange-700' },
      oral: { label: 'Oral', color: 'bg-pink-100 text-pink-700' },
      practical: { label: 'TP', color: 'bg-teal-100 text-teal-700' }
    };
    return types[type] || types.exam;
  };

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

  const generalAverage = calculateGeneralAverage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2">
              📊 Mes Notes
            </h1>
            <p className="text-gray-600">
              {filteredGrades.length} note{filteredGrades.length > 1 ? 's' : ''} enregistrée{filteredGrades.length > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard/student')}
            className="px-6 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold shadow"
          >
            ← Retour
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
            ❌ {error}
          </div>
        )}

        {/* Moyennes */}
        {grades.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Moyenne générale */}
            <div className="glass rounded-2xl p-6">
              <p className="text-sm font-semibold text-gray-600 mb-2">Moyenne Générale</p>
              <p className={`text-4xl font-black ${getGradeColor(parseFloat(generalAverage), 20)}`}>
                {generalAverage}/20
              </p>
            </div>

            {/* Moyennes par cours */}
            {Object.entries(courses).slice(0, 3).map(([courseId, courseName]) => {
              const average = calculateCourseAverage(courseId);
              return (
                <div key={courseId} className="glass rounded-2xl p-6">
                  <p className="text-sm font-semibold text-gray-600 mb-2 truncate">
                    {courseName}
                  </p>
                  <p className={`text-4xl font-black ${getGradeColor(parseFloat(average), 20)}`}>
                    {average}/20
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Filtre par cours */}
        {Object.keys(courses).length > 1 && (
          <div className="glass rounded-2xl p-6 mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📚 Filtrer par cours
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tous les cours ({grades.length})</option>
              {Object.entries(courses).map(([courseId, courseName]) => {
                const count = grades.filter(g => g.courseId === courseId).length;
                return (
                  <option key={courseId} value={courseId}>
                    {courseName} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Liste des notes */}
        {filteredGrades.length > 0 ? (
          <div className="space-y-4">
            {filteredGrades.map(grade => {
              const typeBadge = getGradeTypeBadge(grade.gradeType);
              return (
                <div key={grade.id} className="glass rounded-2xl p-6 hover:shadow-xl transition">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Informations */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          {grade.title}
                        </h3>
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${typeBadge.color}`}>
                          {typeBadge.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span>📚 {grade.courseName}</span>
                        <span>👨‍🏫 {grade.teacherName}</span>
                        <span>📅 {new Date(grade.date).toLocaleDateString('fr-FR')}</span>
                        <span>⚖️ Coef. {grade.coefficient}</span>
                      </div>
                    </div>

                    {/* Note */}
                    <div className="text-center bg-white rounded-xl p-4 min-w-[120px]">
                      <p className={`text-4xl font-black ${getGradeColor(grade.grade, grade.maxGrade)}`}>
                        {grade.grade}/{grade.maxGrade}
                      </p>
                      {grade.maxGrade !== 20 && (
                        <p className="text-sm text-gray-500 mt-1">
                          = {((grade.grade / grade.maxGrade) * 20).toFixed(2)}/20
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass rounded-3xl p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Aucune note disponible
            </h3>
            <p className="text-gray-600">
              {grades.length === 0
                ? "Aucune note n'a encore été enregistrée"
                : "Aucune note pour ce cours"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
