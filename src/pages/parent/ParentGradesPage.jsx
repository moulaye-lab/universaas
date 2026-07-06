/**
 * ParentGradesPage.jsx - Consultation notes des enfants (Parent)
 *
 * Fonctionnalités:
 * - Sélecteur enfant (si plusieurs enfants)
 * - Affichage toutes les notes de l'enfant sélectionné
 * - Moyennes par cours + moyenne générale
 * - Filtrage par cours
 * - Tri par date (récentes en premier)
 * - Export CSV des notes
 * - Statistiques: taux de réussite, meilleure/pire note
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Download } from 'lucide-react';
import { exportToCSV } from '../../utils/gradesCalculator';

export default function ParentGradesPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [selectedChild, setSelectedChild] = useState(null);
  const [grades, setGrades] = useState([]);
  const [courses, setCourses] = useState({});
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Charger les enfants du parent
  useEffect(() => {
    const loadChildren = async () => {
      if (!userProfile?.childrenAccess) {
        setLoading(false);
        setError('Aucun enfant associé à votre compte');
        return;
      }

      try {
        setLoading(true);
        const childrenList = [];

        // Parser childrenAccess: { univId: { studentId: true } }
        for (const [universityId, studentsObj] of Object.entries(userProfile.childrenAccess)) {
          for (const studentId of Object.keys(studentsObj)) {
            const studentRef = ref(database, `universities/${universityId}/students/${studentId}`);
            const studentSnap = await get(studentRef);

            if (studentSnap.exists()) {
              const studentData = studentSnap.val();
              childrenList.push({
                id: studentId,
                universityId: universityId,
                name: `${studentData.firstName} ${studentData.lastName}`,
                level: studentData.level,
                className: studentData.className || 'N/A',
                ...studentData
              });
            }
          }
        }

        setChildren(childrenList);

        // Sélectionner le premier enfant par défaut
        if (childrenList.length > 0) {
          setSelectedChildId(childrenList[0].id);
          setSelectedChild(childrenList[0]);
        }
      } catch (err) {
        console.error('Error loading children:', err);
        setError('Erreur lors du chargement des enfants');
      } finally {
        setLoading(false);
      }
    };

    loadChildren();
  }, [userProfile]);

  // Charger les notes de l'enfant sélectionné
  useEffect(() => {
    const loadGrades = async () => {
      if (!selectedChild) return;

      try {
        setLoading(true);

        const gradesRef = ref(database, `universities/${selectedChild.universityId}/grades`);
        const gradesSnap = await get(gradesRef);

        if (gradesSnap.exists()) {
          const allGrades = Object.entries(gradesSnap.val())
            .map(([id, data]) => ({ id, ...data }))
            .filter(grade => grade.studentId === selectedChildId)
            .sort((a, b) => b.date - a.date); // Trier par date DESC

          setGrades(allGrades);

          // Extraire cours uniques
          const uniqueCourses = {};
          allGrades.forEach(grade => {
            if (!uniqueCourses[grade.courseId]) {
              uniqueCourses[grade.courseId] = grade.courseName;
            }
          });
          setCourses(uniqueCourses);
        } else {
          setGrades([]);
          setCourses({});
        }
      } catch (err) {
        console.error('Error loading grades:', err);
        setError('Erreur lors du chargement des notes');
      } finally {
        setLoading(false);
      }
    };

    if (selectedChild) {
      loadGrades();
    }
  }, [selectedChild, selectedChildId]);

  // Changer d'enfant
  const handleChildChange = (childId) => {
    const child = children.find(c => c.id === childId);
    setSelectedChildId(childId);
    setSelectedChild(child);
    setSelectedCourse('all'); // Reset filtre cours
  };

  // Filtrer notes par cours
  const filteredGrades = selectedCourse === 'all'
    ? grades
    : grades.filter(g => g.courseId === selectedCourse);

  // Calculer moyenne par cours
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

  // Calculer moyenne générale
  const calculateGeneralAverage = () => {
    if (grades.length === 0) return null;

    const totalWeighted = grades.reduce((sum, g) => {
      const normalizedGrade = (g.grade / g.maxGrade) * 20;
      return sum + (normalizedGrade * g.coefficient);
    }, 0);

    const totalCoefficients = grades.reduce((sum, g) => sum + g.coefficient, 0);

    return (totalWeighted / totalCoefficients).toFixed(2);
  };

  // Calculer statistiques
  const calculateStats = () => {
    if (grades.length === 0) return null;

    const normalizedGrades = grades.map(g => (g.grade / g.maxGrade) * 20);
    const passedCount = normalizedGrades.filter(g => g >= 10).length;
    const successRate = (passedCount / grades.length) * 100;
    const bestGrade = Math.max(...normalizedGrades);
    const worstGrade = Math.min(...normalizedGrades);

    return { successRate, bestGrade, worstGrade };
  };

  // Couleur selon note
  const getGradeColor = (grade, maxGrade) => {
    const normalized = (grade / maxGrade) * 20;
    if (normalized >= 16) return 'text-green-600';
    if (normalized >= 14) return 'text-blue-600';
    if (normalized >= 12) return 'text-yellow-600';
    if (normalized >= 10) return 'text-orange-600';
    return 'text-red-600';
  };

  // Badge type
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

  // Export CSV
  const handleExport = () => {
    if (filteredGrades.length === 0) {
      alert('Aucune note à exporter');
      return;
    }

    const filename = `notes_${selectedChild?.name.replace(/\s/g, '_')}_${Date.now()}`;
    exportToCSV(filteredGrades, filename);
  };

  if (loading && children.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error && children.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="glass rounded-3xl p-12 text-center">
            <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{error}</h3>
            <p className="text-gray-600 mb-6">
              Contactez l'administration de l'université pour associer un enfant à votre compte.
            </p>
            <button
              onClick={() => navigate('/dashboard/parent')}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-semibold"
            >
              ← Retour au tableau de bord
            </button>
          </div>
        </div>
      </div>
    );
  }

  const generalAverage = calculateGeneralAverage();
  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2">
              📊 Notes de mes Enfants
            </h1>
            <p className="text-gray-600">
              {filteredGrades.length} note{filteredGrades.length > 1 ? 's' : ''} pour {selectedChild?.name}
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard/parent')}
            className="px-6 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold shadow"
          >
            ← Retour
          </button>
        </div>

        {/* Sélecteur d'enfant */}
        {children.length > 1 && (
          <div className="glass rounded-2xl p-6 mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              👦 Sélectionner un enfant
            </label>
            <select
              value={selectedChildId}
              onChange={(e) => handleChildChange(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {children.map(child => (
                <option key={child.id} value={child.id}>
                  {child.name} - {child.level} ({child.className})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Statistiques */}
        {grades.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Moyenne générale */}
            <div className="glass rounded-2xl p-6">
              <p className="text-sm font-semibold text-gray-600 mb-2">Moyenne Générale</p>
              <p className={`text-4xl font-black ${getGradeColor(parseFloat(generalAverage), 20)}`}>
                {generalAverage}/20
              </p>
            </div>

            {/* Taux de réussite */}
            <div className="glass rounded-2xl p-6">
              <p className="text-sm font-semibold text-gray-600 mb-2">Taux de Réussite</p>
              <p className="text-4xl font-black text-green-600">
                {stats?.successRate.toFixed(0)}%
              </p>
            </div>

            {/* Meilleure note */}
            <div className="glass rounded-2xl p-6">
              <p className="text-sm font-semibold text-gray-600 mb-2">🏆 Meilleure Note</p>
              <p className="text-4xl font-black text-green-600">
                {stats?.bestGrade.toFixed(2)}/20
              </p>
            </div>

            {/* Pire note */}
            <div className="glass rounded-2xl p-6">
              <p className="text-sm font-semibold text-gray-600 mb-2">📉 Note la plus basse</p>
              <p className="text-4xl font-black text-red-600">
                {stats?.worstGrade.toFixed(2)}/20
              </p>
            </div>
          </div>
        )}

        {/* Moyennes par cours (top 4) */}
        {Object.keys(courses).length > 0 && (
          <div className="glass rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📚 Moyennes par Cours</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(courses).slice(0, 4).map(([courseId, courseName]) => {
                const average = calculateCourseAverage(courseId);
                return (
                  <div key={courseId} className="bg-white rounded-xl p-4">
                    <p className="text-sm font-semibold text-gray-600 mb-1 truncate" title={courseName}>
                      {courseName}
                    </p>
                    <p className={`text-2xl font-black ${getGradeColor(parseFloat(average), 20)}`}>
                      {average}/20
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filtres et export */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Filtre par cours */}
          {Object.keys(courses).length > 1 && (
            <div className="flex-1 glass rounded-2xl p-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📚 Filtrer par cours
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

          {/* Bouton export */}
          {grades.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition font-semibold"
              >
                <Download className="w-5 h-5" />
                Exporter CSV
              </button>
            </div>
          )}
        </div>

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
                      {grade.comments && (
                        <p className="mt-2 text-sm text-gray-600 italic">
                          💬 {grade.comments}
                        </p>
                      )}
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
                ? `${selectedChild?.name} n'a pas encore de notes enregistrées`
                : "Aucune note pour ce cours"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
