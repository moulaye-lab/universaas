/**
 * AcademicYearConfigPage.jsx - Configuration Année Académique
 *
 * Permet à l'admin de:
 * - Définir les dates S1 et S2
 * - Clôturer les semestres
 * - Voir le statut actuel
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getAcademicStatus,
  closeSemester,
  reopenSemester,
  configureAcademicYear
} from '../../services/academicYearService';
import {
  ChevronLeft,
  Calendar,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

export default function AcademicYearConfigPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({
    year: '',
    s1Start: '',
    s1End: '',
    s2Start: '',
    s2End: ''
  });

  useEffect(() => {
    loadStatus();
  }, [userProfile]);

  const loadStatus = async () => {
    if (!userProfile?.universityId) return;

    try {
      setLoading(true);
      const academicStatus = await getAcademicStatus(userProfile.universityId);
      setStatus(academicStatus);

      // Pré-remplir le formulaire avec les données actuelles
      if (academicStatus) {
        setConfigForm({
          year: academicStatus.year,
          s1Start: formatDateForInput(academicStatus.semester1.startDate),
          s1End: formatDateForInput(academicStatus.semester1.endDate),
          s2Start: formatDateForInput(academicStatus.semester2.startDate),
          s2End: formatDateForInput(academicStatus.semester2.endDate)
        });
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDateForInput = (dateString) => {
    // Convertir "01/09/2025" -> "2025-09-01"
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return '';
  };

  const handleCloseSemester = async (semesterNumber) => {
    console.log('🔵 handleCloseSemester appelé avec semestre:', semesterNumber);
    console.log('🔵 Status actuel:', status);
    console.log('🔵 UserProfile:', userProfile);

    const semester = semesterNumber === 1 ? status.semester1 : status.semester2;
    console.log('🔵 Semester data:', semester);

    // Vérifier que la date de fin est passée
    const endDate = new Date(semester.endDate.split('/').reverse().join('-')); // "31/01/2026" -> "2026-01-31"
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Ignorer l'heure
    endDate.setHours(0, 0, 0, 0);

    console.log('🔵 Date fin semestre:', endDate);
    console.log('🔵 Date actuelle:', now);
    console.log('🔵 Date passée?', endDate <= now);

    if (endDate > now) {
      alert(`❌ Impossible de clôturer le Semestre ${semesterNumber}\n\nLa date de fin (${semester.endDate}) n'est pas encore atteinte.\n\nDate actuelle: ${now.toLocaleDateString('fr-FR')}`);
      return;
    }

    if (!confirm(`Clôturer le Semestre ${semesterNumber} ?\n\nLes notes ne pourront plus être modifiées après cette action.`)) {
      console.log('🔵 Utilisateur a annulé la confirmation');
      return;
    }

    console.log('🔵 Appel closeSemester...');
    try {
      await closeSemester(userProfile.universityId, semesterNumber, userProfile.uid);
      console.log('🔵 closeSemester réussi');
      alert(`✅ Semestre ${semesterNumber} clôturé avec succès !`);
      loadStatus();
    } catch (error) {
      console.error('❌ Erreur closeSemester:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const handleReopenSemester = async (semesterNumber) => {
    const reason = prompt('Raison de la réouverture (obligatoire):');
    if (!reason) return;

    try {
      await reopenSemester(userProfile.universityId, semesterNumber, userProfile.uid, reason);
      alert(`🔓 Semestre ${semesterNumber} réouvert`);
      loadStatus();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const handleConfigureYear = async (e) => {
    e.preventDefault();
    console.log('🟢 handleConfigureYear appelé');
    console.log('🟢 Form data:', configForm);

    if (!confirm('Modifier les dates de l\'année académique ?\n\nAttention: Cette action affecte toute l\'université.')) {
      console.log('🟢 Utilisateur a annulé');
      return;
    }

    try {
      const config = {
        year: configForm.year,
        startDate: new Date(configForm.s1Start).getTime(),
        endDate: new Date(configForm.s2End).getTime(),
        semester1StartDate: new Date(configForm.s1Start).getTime(),
        semester1EndDate: new Date(configForm.s1End).getTime(),
        semester2StartDate: new Date(configForm.s2Start).getTime(),
        semester2EndDate: new Date(configForm.s2End).getTime()
      };

      console.log('🟢 Config envoyée:', config);
      await configureAcademicYear(userProfile.universityId, config, userProfile.uid);
      console.log('🟢 Configuration réussie');
      alert('✅ Dates configurées avec succès');
      setShowConfigModal(false);
      loadStatus();
    } catch (error) {
      console.error('❌ Erreur configuration:', error);
      alert('Erreur: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/dashboard/admin')}
              className="p-2 hover:bg-white rounded-xl transition shadow-sm"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📅 Année Académique</h1>
              <p className="text-gray-600 mt-1">Gestion des semestres et calendrier</p>
            </div>
          </div>
        </div>

        {/* Statut actuel */}
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">📊 Statut Actuel</h2>
            <button
              onClick={() => setShowConfigModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
            >
              📅 Configurer les Dates
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Année Académique</p>
              <p className="text-2xl font-bold text-blue-600">{status?.year}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Période Actuelle</p>
              <p className="text-lg font-bold text-purple-600">{status?.currentPeriod}</p>
            </div>
            <div className={`bg-gradient-to-br rounded-xl p-4 ${
              status?.canPromote ? 'from-green-50 to-emerald-50' : 'from-orange-50 to-red-50'
            }`}>
              <p className="text-sm text-gray-600 mb-1">Promotion Possible</p>
              <p className={`text-2xl font-bold ${status?.canPromote ? 'text-green-600' : 'text-orange-600'}`}>
                {status?.canPromote ? '✅ OUI' : '❌ NON'}
              </p>
            </div>
          </div>

          {!status?.canPromote && (
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-orange-900">Promotion bloquée</p>
                  <p className="text-sm text-orange-700 mt-1">
                    Les deux semestres doivent être clôturés avant de lancer la promotion académique.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Semestres */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Semestre 1 */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">📚 Semestre 1</h3>
              {status?.semester1.isClosed ? (
                <span className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                  <Lock className="h-4 w-4" />
                  Clôturé
                </span>
              ) : (
                <span className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                  <Unlock className="h-4 w-4" />
                  En cours
                </span>
              )}
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Date début:</span>
                <span className="font-semibold">{status?.semester1.startDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date fin:</span>
                <span className="font-semibold">{status?.semester1.endDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Statut:</span>
                <span className={`font-semibold ${
                  status?.semester1.isClosed ? 'text-green-600' : 'text-blue-600'
                }`}>
                  {status?.semester1.status === 'closed' ? 'Clôturé' : 'En cours'}
                </span>
              </div>
            </div>

            {status?.semester1.isClosed ? (
              <button
                onClick={() => handleReopenSemester(1)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition font-semibold"
              >
                <Unlock className="h-5 w-5" />
                Rouvrir (exceptionnel)
              </button>
            ) : (
              <button
                onClick={() => handleCloseSemester(1)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold"
              >
                <Lock className="h-5 w-5" />
                Clôturer le Semestre 1
              </button>
            )}
          </div>

          {/* Semestre 2 */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">📚 Semestre 2</h3>
              {status?.semester2.isClosed ? (
                <span className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                  <Lock className="h-4 w-4" />
                  Clôturé
                </span>
              ) : (
                <span className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                  <Unlock className="h-4 w-4" />
                  En cours
                </span>
              )}
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Date début:</span>
                <span className="font-semibold">{status?.semester2.startDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date fin:</span>
                <span className="font-semibold">{status?.semester2.endDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Statut:</span>
                <span className={`font-semibold ${
                  status?.semester2.isClosed ? 'text-green-600' : 'text-blue-600'
                }`}>
                  {status?.semester2.status === 'closed' ? 'Clôturé' : 'En cours'}
                </span>
              </div>
            </div>

            {status?.semester2.isClosed ? (
              <button
                onClick={() => handleReopenSemester(2)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition font-semibold"
              >
                <Unlock className="h-5 w-5" />
                Rouvrir (exceptionnel)
              </button>
            ) : (
              <button
                onClick={() => handleCloseSemester(2)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold"
              >
                <Lock className="h-5 w-5" />
                Clôturer le Semestre 2
              </button>
            )}
          </div>
        </div>

        {/* Action Promotion */}
        {status?.canPromote && (
          <div className="glass rounded-2xl p-6 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">🎓 Promotion Académique</h3>
                <p className="text-gray-600">Les deux semestres sont clôturés. Vous pouvez maintenant lancer la promotion.</p>
              </div>
              <button
                onClick={() => navigate('/admin/academic-promotion')}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition font-semibold"
              >
                Lancer la Promotion →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Configuration */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">📅 Configuration Année Académique</h2>

              <form onSubmit={handleConfigureYear} className="space-y-6">
                {/* Année */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Année Académique
                  </label>
                  <input
                    type="text"
                    value={configForm.year}
                    onChange={(e) => setConfigForm({ ...configForm, year: e.target.value })}
                    placeholder="2025-2026"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                {/* Semestre 1 */}
                <div className="bg-blue-50 rounded-xl p-4">
                  <h3 className="font-bold text-gray-900 mb-3">📚 Semestre 1</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Date Début
                      </label>
                      <input
                        type="date"
                        value={configForm.s1Start}
                        onChange={(e) => setConfigForm({ ...configForm, s1Start: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Date Fin
                      </label>
                      <input
                        type="date"
                        value={configForm.s1End}
                        onChange={(e) => setConfigForm({ ...configForm, s1End: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Semestre 2 */}
                <div className="bg-purple-50 rounded-xl p-4">
                  <h3 className="font-bold text-gray-900 mb-3">📚 Semestre 2</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Date Début
                      </label>
                      <input
                        type="date"
                        value={configForm.s2Start}
                        onChange={(e) => setConfigForm({ ...configForm, s2Start: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Date Fin
                      </label>
                      <input
                        type="date"
                        value={configForm.s2End}
                        onChange={(e) => setConfigForm({ ...configForm, s2End: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold"
                  >
                    💾 Enregistrer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
