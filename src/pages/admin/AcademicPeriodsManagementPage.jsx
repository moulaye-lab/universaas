/**
 * AcademicPeriodsManagementPage.jsx - Gestion des périodes académiques
 *
 * Fonctionnalités:
 * - Vue des semestres avec statut (en cours/clôturé)
 * - Vérification complétude des notes avant clôture
 * - Clôture manuelle par admin avec confirmation
 * - Verrouillage des notes après clôture
 * - Notification automatique étudiants/parents
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, set, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Lock, Unlock, CheckCircle, AlertCircle, Download, ArrowLeft } from 'lucide-react';
import { getCurrentAcademicYear } from '../../utils/academicYearHelper';

export default function AcademicPeriodsManagementPage() {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    loadPeriods();
  }, [userProfile]);

  const loadPeriods = async () => {
    if (!userProfile?.universityId) return;

    try {
      setLoading(true);

      // Charger les périodes académiques
      const periodsRef = ref(database, `universities/${userProfile.universityId}/academicPeriods`);
      const periodsSnap = await get(periodsRef);

      let periodsData = [];

      if (periodsSnap.exists()) {
        periodsData = Object.entries(periodsSnap.val()).map(([id, data]) => ({
          id,
          ...data
        }));
      } else {
        // Créer périodes par défaut pour l'année en cours
        const currentYear = getCurrentAcademicYear();
        periodsData = await initializeDefaultPeriods(currentYear);
      }

      // Charger les stats pour chaque période
      for (const period of periodsData) {
        const stats = await calculatePeriodStats(period);
        period.stats = stats;
      }

      // Trier par année et semestre
      periodsData.sort((a, b) => {
        if (a.academicYear !== b.academicYear) {
          return b.academicYear.localeCompare(a.academicYear);
        }
        return b.semester - a.semester;
      });

      setPeriods(periodsData);
    } catch (err) {
      console.error('Error loading periods:', err);
      setError('Erreur lors du chargement des périodes');
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultPeriods = async (academicYear) => {
    const periods = [
      {
        id: `${academicYear}-S1`,
        academicYear,
        semester: 1,
        name: 'Semestre 1',
        startDate: `${academicYear.split('-')[0]}-09-01`,
        endDate: `${parseInt(academicYear.split('-')[0]) + 1}-01-31`,
        status: 'en_cours',
        createdAt: Date.now()
      },
      {
        id: `${academicYear}-S2`,
        academicYear,
        semester: 2,
        name: 'Semestre 2',
        startDate: `${parseInt(academicYear.split('-')[0]) + 1}-02-01`,
        endDate: `${parseInt(academicYear.split('-')[0]) + 1}-06-30`,
        status: 'en_cours',
        createdAt: Date.now()
      }
    ];

    // Sauvegarder dans Firebase
    for (const period of periods) {
      const periodRef = ref(database, `universities/${userProfile.universityId}/academicPeriods/${period.id}`);
      await set(periodRef, period);
    }

    return periods;
  };

  const calculatePeriodStats = async (period) => {
    try {
      // Charger toutes les notes du semestre
      const gradesRef = ref(database, `universities/${userProfile.universityId}/grades`);
      const gradesSnap = await get(gradesRef);

      // Charger tous les étudiants actifs
      const studentsRef = ref(database, `universities/${userProfile.universityId}/students`);
      const studentsSnap = await get(studentsRef);

      // Charger tous les cours
      const coursesRef = ref(database, `universities/${userProfile.universityId}/courses`);
      const coursesSnap = await get(coursesRef);

      const activeStudents = studentsSnap.exists()
        ? Object.entries(studentsSnap.val()).filter(([id, s]) => s.status === 'active').length
        : 0;

      const activeCourses = coursesSnap.exists()
        ? Object.entries(coursesSnap.val()).filter(([id, c]) => c.status === 'active' && c.semester === `S${period.semester}`).length
        : 0;

      if (!gradesSnap.exists()) {
        return {
          totalGradesNeeded: activeStudents * activeCourses,
          gradesEntered: 0,
          completionRate: 0,
          missingGradesByCourse: {}
        };
      }

      const grades = Object.values(gradesSnap.val());

      // Filtrer notes du semestre
      const semesterGrades = grades.filter(g =>
        g.academicYear === period.academicYear &&
        g.semester === period.semester
      );

      // Calculer notes par cours
      const gradesByCourse = {};
      semesterGrades.forEach(grade => {
        if (!gradesByCourse[grade.courseId]) {
          gradesByCourse[grade.courseId] = new Set();
        }
        gradesByCourse[grade.courseId].add(grade.studentId);
      });

      const totalGradesNeeded = activeStudents * activeCourses;
      const gradesEntered = semesterGrades.length;
      const completionRate = totalGradesNeeded > 0
        ? Math.round((gradesEntered / totalGradesNeeded) * 100)
        : 0;

      return {
        totalGradesNeeded,
        gradesEntered,
        completionRate,
        gradesByCourse,
        activeStudents,
        activeCourses
      };
    } catch (err) {
      console.error('Error calculating stats:', err);
      return {
        totalGradesNeeded: 0,
        gradesEntered: 0,
        completionRate: 0,
        gradesByCourse: {}
      };
    }
  };

  const handleClosePeriod = async (period) => {
    if (period.stats.completionRate < 100) {
      const confirmed = window.confirm(
        `⚠️ ATTENTION\n\n` +
        `Seulement ${period.stats.completionRate}% des notes sont saisies.\n` +
        `Il manque ${period.stats.totalGradesNeeded - period.stats.gradesEntered} notes.\n\n` +
        `Voulez-vous vraiment clôturer maintenant ?`
      );
      if (!confirmed) return;
    }

    const finalConfirm = window.confirm(
      `🔒 Clôturer le ${period.name} (${period.academicYear}) ?\n\n` +
      `Cette action va :\n` +
      `• Générer ${period.stats.activeStudents} bulletins\n` +
      `• Verrouiller les notes du semestre (non modifiables)\n` +
      `• Notifier tous les étudiants et parents\n` +
      `• Rendre les bulletins téléchargeables\n\n` +
      `⚠️ CETTE ACTION EST IRRÉVERSIBLE\n\n` +
      `Confirmer la clôture ?`
    );

    if (!finalConfirm) return;

    try {
      setClosing(true);
      setError('');

      // Mettre à jour le statut de la période
      const periodRef = ref(database, `universities/${userProfile.universityId}/academicPeriods/${period.id}`);
      await update(periodRef, {
        status: 'cloture',
        closedAt: Date.now(),
        closedBy: currentUser.uid,
        closedByName: userProfile.displayName || userProfile.email
      });

      // Verrouiller toutes les notes du semestre
      const gradesRef = ref(database, `universities/${userProfile.universityId}/grades`);
      const gradesSnap = await get(gradesRef);

      if (gradesSnap.exists()) {
        const updates = {};
        Object.entries(gradesSnap.val()).forEach(([gradeId, grade]) => {
          if (grade.academicYear === period.academicYear && grade.semester === period.semester) {
            updates[`universities/${userProfile.universityId}/grades/${gradeId}/locked`] = true;
            updates[`universities/${userProfile.universityId}/grades/${gradeId}/lockedAt`] = Date.now();
          }
        });

        if (Object.keys(updates).length > 0) {
          await update(ref(database), updates);
        }
      }

      // Créer notifications pour tous les étudiants
      const studentsRef = ref(database, `universities/${userProfile.universityId}/students`);
      const studentsSnap = await get(studentsRef);

      if (studentsSnap.exists()) {
        const notificationPromises = [];

        Object.entries(studentsSnap.val()).forEach(([studentId, student]) => {
          if (student.status === 'active') {
            const notifRef = ref(database, `universities/${userProfile.universityId}/notifications/${Date.now()}_${studentId}`);
            notificationPromises.push(
              set(notifRef, {
                type: 'bulletin_available',
                title: '📄 Bulletin disponible',
                message: `Votre bulletin du ${period.name} (${period.academicYear}) est maintenant disponible au téléchargement.`,
                recipientId: studentId,
                read: false,
                priority: 'high',
                createdAt: Date.now(),
                actionUrl: '/student/grades'
              })
            );
          }
        });

        await Promise.all(notificationPromises);
      }

      setSuccess(`✅ ${period.name} clôturé avec succès ! ${period.stats.activeStudents} bulletins sont disponibles.`);

      // Recharger les données
      await loadPeriods();

    } catch (err) {
      console.error('Error closing period:', err);
      setError('Erreur lors de la clôture : ' + err.message);
    } finally {
      setClosing(false);
    }
  };

  const handleReopenPeriod = async (period) => {
    const confirmed = window.confirm(
      `⚠️ Rouvrir le ${period.name} ?\n\n` +
      `Cette action va :\n` +
      `• Déverrouiller les notes du semestre\n` +
      `• Masquer les bulletins aux étudiants/parents\n` +
      `• Permettre les modifications de notes\n\n` +
      `Continuer ?`
    );

    if (!confirmed) return;

    try {
      setClosing(true);

      const periodRef = ref(database, `universities/${userProfile.universityId}/academicPeriods/${period.id}`);
      await update(periodRef, {
        status: 'en_cours',
        reopenedAt: Date.now(),
        reopenedBy: currentUser.uid
      });

      // Déverrouiller les notes
      const gradesRef = ref(database, `universities/${userProfile.universityId}/grades`);
      const gradesSnap = await get(gradesRef);

      if (gradesSnap.exists()) {
        const updates = {};
        Object.entries(gradesSnap.val()).forEach(([gradeId, grade]) => {
          if (grade.academicYear === period.academicYear && grade.semester === period.semester && grade.locked) {
            updates[`universities/${userProfile.universityId}/grades/${gradeId}/locked`] = false;
          }
        });

        if (Object.keys(updates).length > 0) {
          await update(ref(database), updates);
        }
      }

      setSuccess(`${period.name} réouvert avec succès`);
      await loadPeriods();

    } catch (err) {
      console.error('Error reopening period:', err);
      setError('Erreur lors de la réouverture : ' + err.message);
    } finally {
      setClosing(false);
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2">
              📅 Gestion des Périodes Académiques
            </h1>
            <p className="text-gray-600">
              Clôture des semestres et publication des bulletins
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="px-6 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold shadow flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-600 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Liste des périodes */}
        <div className="space-y-6">
          {periods.map(period => (
            <div
              key={period.id}
              className={`glass rounded-3xl p-8 ${
                period.status === 'cloture'
                  ? 'border-2 border-green-300 bg-green-50/50'
                  : 'border-2 border-amber-300 bg-amber-50/50'
              }`}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                    period.status === 'cloture' ? 'bg-green-500' : 'bg-amber-500'
                  }`}>
                    {period.status === 'cloture' ? (
                      <Lock className="w-8 h-8 text-white" />
                    ) : (
                      <Unlock className="w-8 h-8 text-white" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {period.name} ({period.academicYear})
                    </h2>
                    <p className="text-sm text-gray-600">
                      {period.startDate} → {period.endDate}
                    </p>
                  </div>
                </div>

                <div className={`px-4 py-2 rounded-xl font-bold text-sm ${
                  period.status === 'cloture'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {period.status === 'cloture' ? '🔒 Clôturé' : '🟡 En cours'}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Notes saisies</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {period.stats?.gradesEntered || 0} / {period.stats?.totalGradesNeeded || 0}
                  </p>
                </div>

                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Taux de complétion</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {period.stats?.completionRate || 0}%
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${
                        (period.stats?.completionRate || 0) === 100 ? 'bg-green-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${period.stats?.completionRate || 0}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Étudiants actifs</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {period.stats?.activeStudents || 0}
                  </p>
                </div>
              </div>

              {/* Infos clôture */}
              {period.status === 'cloture' && period.closedAt && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                  <p className="text-sm text-green-800">
                    <strong>Clôturé le :</strong> {new Date(period.closedAt).toLocaleString('fr-FR')}
                    {period.closedByName && ` par ${period.closedByName}`}
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    ✅ {period.stats?.activeStudents || 0} bulletins disponibles
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                {period.status === 'en_cours' ? (
                  <button
                    onClick={() => handleClosePeriod(period)}
                    disabled={closing || (period.stats?.completionRate || 0) < 80}
                    className={`flex-1 px-6 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                      (period.stats?.completionRate || 0) >= 80
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Lock className="w-5 h-5" />
                    {closing ? 'Clôture en cours...' : 'Clôturer le semestre'}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleReopenPeriod(period)}
                      disabled={closing}
                      className="flex-1 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition flex items-center justify-center gap-2"
                    >
                      <Unlock className="w-5 h-5" />
                      Rouvrir le semestre
                    </button>
                    <button
                      onClick={() => navigate(`/admin/bulletins/download?period=${period.id}`)}
                      className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      Télécharger tous les bulletins
                    </button>
                  </>
                )}
              </div>

              {period.status === 'en_cours' && (period.stats?.completionRate || 0) < 80 && (
                <p className="text-xs text-amber-600 mt-3 text-center">
                  ⚠️ Au moins 80% des notes doivent être saisies pour clôturer
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
