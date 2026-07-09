/**
 * MyAbsencesPage.jsx - Page de visualisation des absences pour l'étudiant
 *
 * Fonctionnalités:
 * - Afficher toutes les absences et retards de l'étudiant
 * - Filtrer par statut (absent/retard) et date
 * - Statistiques : total absences, retards, taux de présence
 * - Indication si justifié ou non
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, query, orderByChild, equalTo, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { uploadJustificatif, formatFileSize } from '../../utils/storageHelpers';
import { ChevronLeft, AlertCircle, Clock, Calendar, BookOpen, User, CheckCircle, XCircle, Filter, Upload, FileText, X } from 'lucide-react';

export default function MyAbsencesPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [absences, setAbsences] = useState([]);
  const [filteredAbsences, setFilteredAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalAbsences: 0,
    totalLates: 0,
    justified: 0,
    attendanceRate: 100
  });

  // Filtres
  const [statusFilter, setStatusFilter] = useState('all'); // all, absent, late
  const [searchTerm, setSearchTerm] = useState('');

  // Upload justificatif
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');

  useEffect(() => {
    loadAbsences();
  }, [userProfile]);

  useEffect(() => {
    applyFilters();
  }, [absences, statusFilter, searchTerm]);

  const loadAbsences = async () => {
    if (!userProfile?.universityId || !userProfile?.profileId) {
      setError('Profil utilisateur incomplet');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const studentId = userProfile.profileId;

      // Query pour récupérer les absences de cet étudiant uniquement
      const absencesRef = ref(database, `universities/${userProfile.universityId}/absences`);
      const absencesQuery = query(absencesRef, orderByChild('studentId'), equalTo(studentId));
      const absencesSnap = await get(absencesQuery);

      if (absencesSnap.exists()) {
        const absencesData = Object.values(absencesSnap.val())
          .sort((a, b) => (b.date || 0) - (a.date || 0)); // Plus récentes en premier

        setAbsences(absencesData);

        // Calculer les statistiques
        const totalAbsences = absencesData.filter(a => a.status === 'absent').length;
        const totalLates = absencesData.filter(a => a.status === 'late').length;
        const justified = absencesData.filter(a => a.justified === true).length;

        // Estimer le taux de présence (approximatif)
        // Hypothèse : si l'étudiant a 10 absences/retards sur ~100 séances = 90% présence
        const totalEvents = absencesData.length;
        const estimatedTotalSessions = totalEvents > 0 ? Math.max(totalEvents * 10, 100) : 100;
        const attendanceRate = totalEvents > 0
          ? Math.max(0, ((estimatedTotalSessions - totalAbsences - totalLates) / estimatedTotalSessions * 100).toFixed(1))
          : 100;

        setStats({
          totalAbsences,
          totalLates,
          justified,
          attendanceRate
        });
      } else {
        setAbsences([]);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading absences:', err);
      setError('Erreur lors du chargement des absences');
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...absences];

    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === statusFilter);
    }

    // Filtre par recherche (cours ou prof)
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.courseName?.toLowerCase().includes(term) ||
        a.teacherName?.toLowerCase().includes(term)
      );
    }

    setFilteredAbsences(filtered);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Date inconnue';
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleOpenUploadModal = (absence) => {
    setSelectedAbsence(absence);
    setUploadModalOpen(true);
    setSelectedFile(null);
    setError('');
    setUploadSuccess('');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validation taille
    if (file.size > 5 * 1024 * 1024) {
      setError('Le fichier est trop volumineux (max 5MB)');
      return;
    }

    // Validation type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setError('Type de fichier non autorisé (PDF, JPG, PNG uniquement)');
      return;
    }

    setSelectedFile(file);
    setError('');
  };

  const handleUploadJustificatif = async () => {
    if (!selectedFile || !selectedAbsence) return;

    try {
      setUploading(true);
      setError('');

      // Upload vers Storage
      const { url, filename, uploadedAt } = await uploadJustificatif(
        selectedFile,
        userProfile.universityId,
        selectedAbsence.id
      );

      // Mettre à jour l'absence dans Realtime Database
      const absenceRef = ref(database, `universities/${userProfile.universityId}/absences/${selectedAbsence.id}`);
      await update(absenceRef, {
        justificationUrl: url,
        justificationFilename: filename,
        justificationUploadedAt: uploadedAt,
        updatedAt: Date.now()
      });

      setUploadSuccess('✅ Justificatif envoyé avec succès ! L\'administration le vérifiera.');

      // Recharger les absences
      setTimeout(() => {
        setUploadModalOpen(false);
        loadAbsences();
      }, 2000);
    } catch (err) {
      console.error('Error uploading justification:', err);
      setError(err.message || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des absences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/dashboard/student')}
            className="p-2 hover:bg-white rounded-xl transition"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mes Absences & Retards</h1>
            <p className="text-gray-600 mt-1">Historique de présence</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
            {error}
          </div>
        )}

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Taux de Présence</p>
                <p className="text-3xl font-bold text-green-600">{stats.attendanceRate}%</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Absences</p>
                <p className="text-3xl font-bold text-red-600">{stats.totalAbsences}</p>
              </div>
              <XCircle className="h-10 w-10 text-red-500 opacity-20" />
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Retards</p>
                <p className="text-3xl font-bold text-orange-600">{stats.totalLates}</p>
              </div>
              <Clock className="h-10 w-10 text-orange-500 opacity-20" />
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Justifiées</p>
                <p className="text-3xl font-bold text-blue-600">{stats.justified}</p>
              </div>
              <AlertCircle className="h-10 w-10 text-blue-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filtres</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Filtre par statut */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tous</option>
                <option value="absent">Absences seulement</option>
                <option value="late">Retards seulement</option>
              </select>
            </div>

            {/* Recherche */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
              <input
                type="text"
                placeholder="Cours ou professeur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Liste des absences */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Historique ({filteredAbsences.length})
          </h2>

          {filteredAbsences.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">
                {absences.length === 0
                  ? 'Aucune absence enregistrée ! 🎉'
                  : 'Aucun résultat pour ces filtres'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAbsences.map((absence, index) => (
                <div
                  key={absence.id || index}
                  className={`border-l-4 p-4 rounded-xl transition ${
                    absence.status === 'absent'
                      ? 'bg-red-50 border-red-500'
                      : 'bg-orange-50 border-orange-500'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Infos principales */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {absence.status === 'absent' ? (
                          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                            🔴 ABSENT
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                            🟡 RETARD
                          </span>
                        )}

                        {absence.justified && (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            ✅ Justifié
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">{formatDate(absence.date)}</span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-700">
                          <BookOpen className="h-4 w-4" />
                          <span>
                            {absence.courseName || 'Cours inconnu'}
                            {absence.sessionStartTime && absence.sessionEndTime && (
                              <span className="ml-2 text-xs font-semibold text-blue-600">
                                ({absence.sessionStartTime} - {absence.sessionEndTime})
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-700">
                          <User className="h-4 w-4" />
                          <span>{absence.teacherName || 'Professeur inconnu'}</span>
                        </div>
                      </div>

                      {absence.reason && (
                        <div className="mt-2 text-sm text-gray-600 italic">
                          Motif : {absence.reason}
                        </div>
                      )}

                      {/* Justificatif */}
                      {absence.justificationUrl ? (
                        <div className="mt-3 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <a
                            href={absence.justificationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            📎 {absence.justificationFilename || 'Voir le justificatif'}
                          </a>
                          {!absence.justified && (
                            <span className="text-xs text-orange-600">(En attente de validation)</span>
                          )}
                        </div>
                      ) : !absence.justified && (
                        <button
                          onClick={() => handleOpenUploadModal(absence)}
                          className="mt-3 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-medium flex items-center gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          Ajouter un justificatif
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="glass rounded-2xl p-6 mt-6">
          <h3 className="font-bold text-gray-900 mb-2">💡 Information</h3>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>Les absences et retards sont enregistrés par vos professeurs</li>
            <li>Vous pouvez uploader un justificatif (certificat médical, etc.)</li>
            <li>L'administration validera votre justificatif après vérification</li>
            <li>Le taux de présence est calculé de manière estimée</li>
          </ul>
        </div>

        {/* Modal Upload Justificatif */}
        {uploadModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Ajouter un Justificatif</h3>
                <button
                  onClick={() => setUploadModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              {uploadSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
                  {uploadSuccess}
                </div>
              )}

              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  Absence du <strong>{formatDate(selectedAbsence?.date)}</strong> - {selectedAbsence?.courseName}
                </p>

                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sélectionner un fichier (PDF, JPG, PNG - Max 5MB)
                </label>

                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={uploading}
                />

                {selectedFile && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-xs text-gray-600">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setUploadModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  disabled={uploading}
                >
                  Annuler
                </button>
                <button
                  onClick={handleUploadJustificatif}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={!selectedFile || uploading}
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Envoyer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
