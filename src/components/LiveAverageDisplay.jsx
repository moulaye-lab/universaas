/**
 * LiveAverageDisplay.jsx - Affichage Moyennes en Temps Réel
 *
 * Affiche les moyennes actuelles d'un étudiant:
 * - Moyenne par matière
 * - Moyenne Semestre 1
 * - Moyenne Semestre 2
 * - Moyenne Générale Annuelle (MGA)
 *
 * Utilisé par: étudiants, parents, enseignants
 */

import { useState, useEffect } from 'react';
import { database } from '../config/firebase';
import { ref, get, onValue } from 'firebase/database';
import { calculateYearAverage, calculateDetailedAverages } from '../utils/promotionHelpers';
import { TrendingUp, TrendingDown, Award, BookOpen } from 'lucide-react';

export default function LiveAverageDisplay({ universityId, studentId, showDetails = false }) {
  const [loading, setLoading] = useState(true);
  const [averages, setAverages] = useState(null);
  const [details, setDetails] = useState(null);
  const [student, setStudent] = useState(null);

  useEffect(() => {
    if (!universityId || !studentId) return;

    // Écouter les notes en temps réel
    const gradesRef = ref(database, `universities/${universityId}/grades`);
    const studentRef = ref(database, `universities/${universityId}/students/${studentId}`);

    const unsubscribeGrades = onValue(gradesRef, async (snapshot) => {
      try {
        setLoading(true);

        // Charger étudiant
        const studentSnap = await get(studentRef);
        if (!studentSnap.exists()) {
          setLoading(false);
          return;
        }

        const studentData = { id: studentId, ...studentSnap.val() };
        setStudent(studentData);

        // Charger toutes les notes
        const allGrades = snapshot.exists()
          ? Object.values(snapshot.val())
          : [];

        // Calculer moyennes
        const avg = calculateYearAverage(studentData, allGrades);
        setAverages(avg);

        // Calculer détails si demandé
        if (showDetails) {
          const det = calculateDetailedAverages(studentData, allGrades);
          setDetails(det);
        }

        setLoading(false);
      } catch (error) {
        console.error('Erreur calcul moyennes:', error);
        setLoading(false);
      }
    });

    return () => unsubscribeGrades();
  }, [universityId, studentId, showDetails]);

  if (loading) {
    return (
      <div className="glass rounded-2xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!averages) {
    return (
      <div className="glass rounded-2xl p-6">
        <p className="text-gray-500 text-center">Aucune note disponible</p>
      </div>
    );
  }

  const { semester1Avg, semester2Avg, yearAvg } = averages;

  // Déterminer couleur selon moyenne
  const getColorClass = (avg) => {
    if (avg === null) return 'text-gray-400';
    if (avg >= 16) return 'text-green-600';
    if (avg >= 14) return 'text-blue-600';
    if (avg >= 12) return 'text-yellow-600';
    if (avg >= 10) return 'text-orange-600';
    return 'text-red-600';
  };

  const getProgressColor = (avg) => {
    if (avg === null) return 'bg-gray-200';
    if (avg >= 16) return 'bg-green-500';
    if (avg >= 14) return 'bg-blue-500';
    if (avg >= 12) return 'bg-yellow-500';
    if (avg >= 10) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getMention = (avg) => {
    if (avg === null) return '-';
    if (avg >= 16) return 'Très Bien';
    if (avg >= 14) return 'Bien';
    if (avg >= 12) return 'Assez Bien';
    if (avg >= 10) return 'Passable';
    return 'Insuffisant';
  };

  return (
    <div className="space-y-6">
      {/* Carte principale MGA */}
      <div className="glass rounded-2xl p-6 bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Award className="h-5 w-5 text-indigo-600" />
            Moyenne Générale Annuelle
          </h3>
          {yearAvg !== null && yearAvg >= 10 && (
            <TrendingUp className="h-6 w-6 text-green-600" />
          )}
          {yearAvg !== null && yearAvg < 10 && (
            <TrendingDown className="h-6 w-6 text-red-600" />
          )}
        </div>

        <div className="text-center mb-4">
          <p className={`text-6xl font-black ${getColorClass(yearAvg)}`}>
            {yearAvg !== null ? yearAvg.toFixed(2) : '-'}
            <span className="text-2xl text-gray-400">/20</span>
          </p>
          <p className="text-sm text-gray-600 mt-2 font-semibold">
            {getMention(yearAvg)}
          </p>
        </div>

        {/* Barre de progression */}
        {yearAvg !== null && (
          <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`absolute top-0 left-0 h-full ${getProgressColor(yearAvg)} transition-all duration-500 rounded-full`}
              style={{ width: `${(yearAvg / 20) * 100}%` }}
            ></div>
          </div>
        )}
      </div>

      {/* Semestres */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Semestre 1 */}
        <div className="glass rounded-xl p-5">
          <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-600" />
            Semestre 1
          </h4>
          <p className={`text-4xl font-bold ${getColorClass(semester1Avg)}`}>
            {semester1Avg !== null ? semester1Avg.toFixed(2) : '-'}
            <span className="text-lg text-gray-400">/20</span>
          </p>
          {semester1Avg !== null && (
            <div className="mt-3 relative h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full ${getProgressColor(semester1Avg)} transition-all duration-500 rounded-full`}
                style={{ width: `${(semester1Avg / 20) * 100}%` }}
              ></div>
            </div>
          )}
        </div>

        {/* Semestre 2 */}
        <div className="glass rounded-xl p-5">
          <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-purple-600" />
            Semestre 2
          </h4>
          <p className={`text-4xl font-bold ${getColorClass(semester2Avg)}`}>
            {semester2Avg !== null ? semester2Avg.toFixed(2) : '-'}
            <span className="text-lg text-gray-400">/20</span>
          </p>
          {semester2Avg !== null && (
            <div className="mt-3 relative h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full ${getProgressColor(semester2Avg)} transition-all duration-500 rounded-full`}
                style={{ width: `${(semester2Avg / 20) * 100}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>

      {/* Détails par matière */}
      {showDetails && details && (
        <div className="glass rounded-2xl p-6">
          <h4 className="font-bold text-gray-900 mb-4">📚 Détails par Matière</h4>

          {/* Semestre 1 */}
          {details.semester1.length > 0 && (
            <div className="mb-6">
              <h5 className="text-sm font-semibold text-gray-600 mb-3">Semestre 1</h5>
              <div className="space-y-2">
                {details.semester1.map((course, idx) => (
                  <div key={idx} className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{course.courseName}</p>
                        <p className="text-xs text-gray-600">
                          {course.gradeCount} note{course.gradeCount > 1 ? 's' : ''} • Coef {course.coefficient}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${getColorClass(course.average)}`}>
                          {course.average.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          × {course.coefficient} = {course.weightedScore.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Semestre 2 */}
          {details.semester2.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold text-gray-600 mb-3">Semestre 2</h5>
              <div className="space-y-2">
                {details.semester2.map((course, idx) => (
                  <div key={idx} className="bg-purple-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{course.courseName}</p>
                        <p className="text-xs text-gray-600">
                          {course.gradeCount} note{course.gradeCount > 1 ? 's' : ''} • Coef {course.coefficient}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${getColorClass(course.average)}`}>
                          {course.average.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          × {course.coefficient} = {course.weightedScore.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Message motivationnel */}
      {yearAvg !== null && (
        <div className={`rounded-xl p-4 ${
          yearAvg >= 10
            ? 'bg-green-50 border-2 border-green-200'
            : 'bg-orange-50 border-2 border-orange-200'
        }`}>
          <p className={`text-sm font-semibold ${
            yearAvg >= 10 ? 'text-green-800' : 'text-orange-800'
          }`}>
            {yearAvg >= 16 && '🌟 Excellent travail ! Continue comme ça !'}
            {yearAvg >= 14 && yearAvg < 16 && '👏 Très bon niveau ! Encore un petit effort !'}
            {yearAvg >= 12 && yearAvg < 14 && '💪 Bon travail ! Tu peux viser plus haut !'}
            {yearAvg >= 10 && yearAvg < 12 && '📈 C\'est passable ! Concentre-toi sur les matières faibles !'}
            {yearAvg < 10 && '⚠️ Attention ! Travaille davantage pour remonter ta moyenne !'}
          </p>
        </div>
      )}
    </div>
  );
}
