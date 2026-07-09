/**
 * AbsencesManagementPage.jsx - Gestion des absences pour l'administrateur
 *
 * Fonctionnalités:
 * - Voir toutes les absences de l'université
 * - Filtrer par étudiant, classe, cours, statut
 * - Valider les justificatifs uploadés
 * - Marquer comme justifié
 * - Statistiques globales
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import {
  ChevronLeft,
  AlertCircle,
  Clock,
  Calendar,
  BookOpen,
  User,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  FileText,
  Download
} from 'lucide-react';

export default function AbsencesManagementPage() {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();

  const [absences, setAbsences] = useState([]);
  const [filteredAbsences, setFilteredAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Statistiques
  const [stats, setStats] = useState({
    totalAbsences: 0,
    totalLates: 0,
    justified: 0,
    pending: 0,
    averageAttendanceRate: 95
  });

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, absent, late
  const [justifiedFilter, setJustifiedFilter] = useState('all'); // all, justified, not_justified, pending
  const [classFilter, setClassFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [academicYearFilter, setAcademicYearFilter] = useState('all');

  // Listes pour dropdowns
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [levels, setLevels] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  useEffect(() => {
    loadAbsences();
  }, [userProfile]);

  useEffect(() => {
    applyFilters();
  }, [absences, searchTerm, statusFilter, justifiedFilter, classFilter, levelFilter, semesterFilter, teacherFilter, dateFromFilter, dateToFilter, academicYearFilter]);

  const loadAbsences = async () => {
    if (!userProfile?.universityId) {
      setError('Profil administrateur incomplet');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Charger TOUTES les classes de l'université
      const classesRef = ref(database, `universities/${userProfile.universityId}/classes`);
      const classesSnap = await get(classesRef);
      if (classesSnap.exists()) {
        const allClasses = Object.values(classesSnap.val())
          .map(c => ({
            name: c.name,
            level: c.level
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setClasses(allClasses.map(c => c.name));
        setLevels([...new Set(allClasses.map(c => c.level).filter(Boolean))]);
      }

      // Charger TOUS les professeurs de l'université
      const coursesRef = ref(database, `universities/${userProfile.universityId}/courses`);
      const coursesSnap = await get(coursesRef);
      if (coursesSnap.exists()) {
        const allCourses = Object.values(coursesSnap.val());
        const teachersMap = new Map();

        allCourses.forEach(course => {
          if (course.teacherId && course.teacherName) {
            teachersMap.set(course.teacherId, course.teacherName);
          }
        });

        const teachersList = Array.from(teachersMap.entries())
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setTeachers(teachersList);

        // Extraire années académiques des cours
        const years = [...new Set(allCourses.map(c => c.academicYear).filter(Boolean))];
        setAcademicYears(years.sort().reverse());
      }

      // Charger toutes les absences de l'université
      const absencesRef = ref(database, `universities/${userProfile.universityId}/absences`);
      const absencesSnap = await get(absencesRef);

      if (absencesSnap.exists()) {
        const absencesData = Object.values(absencesSnap.val())
          .sort((a, b) => (b.date || 0) - (a.date || 0));

        setAbsences(absencesData);

        // Calculer statistiques
        const totalAbsences = absencesData.filter(a => a.status === 'absent').length;
        const totalLates = absencesData.filter(a => a.status === 'late').length;
        const justified = absencesData.filter(a => a.justified === true).length;
        const pending = absencesData.filter(a => a.justificationUrl && !a.justified).length;

        setStats({
          totalAbsences,
          totalLates,
          justified,
          pending,
          averageAttendanceRate: 95 // Calcul approximatif
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

    // Filtre par recherche (nom étudiant ou cours)
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.studentName?.toLowerCase().includes(term) ||
        a.courseName?.toLowerCase().includes(term) ||
        a.studentNumber?.toLowerCase().includes(term)
      );
    }

    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === statusFilter);
    }

    // Filtre par justification
    if (justifiedFilter === 'justified') {
      filtered = filtered.filter(a => a.justified === true);
    } else if (justifiedFilter === 'not_justified') {
      filtered = filtered.filter(a => !a.justified && !a.justificationUrl);
    } else if (justifiedFilter === 'pending') {
      filtered = filtered.filter(a => a.justificationUrl && !a.justified);
    }

    // Filtre par classe
    if (classFilter !== 'all') {
      filtered = filtered.filter(a => a.className === classFilter);
    }

    // Filtre par niveau
    if (levelFilter !== 'all') {
      filtered = filtered.filter(a => a.level === levelFilter);
    }

    // Filtre par semestre
    if (semesterFilter !== 'all') {
      filtered = filtered.filter(a => a.semester === parseInt(semesterFilter));
    }

    // Filtre par professeur
    if (teacherFilter !== 'all') {
      filtered = filtered.filter(a => a.teacherId === teacherFilter);
    }

    // Filtre par année académique
    if (academicYearFilter !== 'all') {
      filtered = filtered.filter(a => a.academicYear === academicYearFilter);
    }

    // Filtre par plage de dates
    if (dateFromFilter) {
      const fromTimestamp = new Date(dateFromFilter).getTime();
      filtered = filtered.filter(a => a.date >= fromTimestamp);
    }

    if (dateToFilter) {
      const toTimestamp = new Date(dateToFilter).getTime() + (24 * 60 * 60 * 1000); // Fin de journée
      filtered = filtered.filter(a => a.date <= toTimestamp);
    }

    setFilteredAbsences(filtered);
  };

  const handleJustify = async (absence, note = '') => {
    if (!window.confirm('Confirmer la validation de ce justificatif ?')) return;

    try {
      const absenceRef = ref(database, `universities/${userProfile.universityId}/absences/${absence.id}`);
      await update(absenceRef, {
        justified: true,
        justifiedAt: Date.now(),
        justifiedBy: currentUser?.uid || userProfile?.uid || 'admin',
        justificationNote: note || 'Validé par l\'administration',
        updatedAt: Date.now()
      });

      setSuccess('✅ Justificatif validé avec succès');
      setTimeout(() => setSuccess(''), 3000);

      // Recharger
      loadAbsences();
    } catch (err) {
      console.error('Error justifying absence:', err);
      setError('Erreur lors de la validation');
    }
  };

  const handleReject = async (absence) => {
    const reason = prompt('Raison du rejet (optionnel) :');
    if (reason === null) return; // Annulé

    try {
      const absenceRef = ref(database, `universities/${userProfile.universityId}/absences/${absence.id}`);
      await update(absenceRef, {
        justified: false,
        justificationUrl: null,
        justificationFilename: null,
        justificationRejected: true,
        rejectionReason: reason || 'Justificatif non valide',
        rejectedAt: Date.now(),
        rejectedBy: currentUser?.uid || userProfile?.uid || 'admin',
        updatedAt: Date.now()
      });

      setSuccess('Justificatif rejeté');
      setTimeout(() => setSuccess(''), 3000);
      loadAbsences();
    } catch (err) {
      console.error('Error rejecting justification:', err);
      setError('Erreur lors du rejet');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Date inconnue';
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="p-2 hover:bg-white rounded-xl transition"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestion des Absences</h1>
            <p className="text-gray-600 mt-1">Suivi et validation des présences</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-600">
            {success}
          </div>
        )}

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total</p>
                <p className="text-3xl font-bold text-gray-900">{absences.length}</p>
              </div>
              <AlertCircle className="h-10 w-10 text-gray-400 opacity-20" />
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
                <p className="text-3xl font-bold text-green-600">{stats.justified}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="glass rounded-2xl p-6 border-2 border-orange-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">En attente</p>
                <p className="text-3xl font-bold text-orange-600">{stats.pending}</p>
              </div>
              <FileText className="h-10 w-10 text-orange-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filtres</h2>
          </div>

          {/* Ligne 1 : Recherche + Statut + Justification */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Recherche */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nom, matricule, cours..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Statut */}
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

            {/* Justification */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Justification</label>
              <select
                value={justifiedFilter}
                onChange={(e) => setJustifiedFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tous</option>
                <option value="pending">En attente de validation</option>
                <option value="justified">Justifiées</option>
                <option value="not_justified">Non justifiées</option>
              </select>
            </div>
          </div>

          {/* Ligne 2 : Classe + Niveau + Professeur */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Classe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Classe</label>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Toutes les classes</option>
                {classes.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            {/* Niveau */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Niveau/Année</label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tous les niveaux</option>
                {levels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            {/* Professeur */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Professeur</label>
              <select
                value={teacherFilter}
                onChange={(e) => setTeacherFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tous les professeurs</option>
                {teachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Ligne 3 : Dates + Semestre + Année académique */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Date de début */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date de début</label>
              <input
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Date de fin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date de fin</label>
              <input
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Semestre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Semestre</label>
              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tous les semestres</option>
                <option value="1">Semestre 1</option>
                <option value="2">Semestre 2</option>
              </select>
            </div>

            {/* Année académique */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Année académique</label>
              <select
                value={academicYearFilter}
                onChange={(e) => setAcademicYearFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Toutes les années</option>
                {academicYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bouton reset filtres */}
          {(searchTerm || statusFilter !== 'all' || justifiedFilter !== 'all' || classFilter !== 'all' ||
            levelFilter !== 'all' || semesterFilter !== 'all' || teacherFilter !== 'all' ||
            dateFromFilter || dateToFilter || academicYearFilter !== 'all') && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setJustifiedFilter('all');
                  setClassFilter('all');
                  setLevelFilter('all');
                  setSemesterFilter('all');
                  setTeacherFilter('all');
                  setDateFromFilter('');
                  setDateToFilter('');
                  setAcademicYearFilter('all');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition text-sm font-medium"
              >
                🔄 Réinitialiser tous les filtres
              </button>
            </div>
          )}
        </div>

        {/* Liste des absences */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Liste des Absences ({filteredAbsences.length})
          </h2>

          {filteredAbsences.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Aucune absence trouvée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Étudiant</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Cours</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Statut</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Justificatif</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAbsences.map((absence, index) => (
                    <tr key={absence.id || index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-700">{formatDate(absence.date)}</td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{absence.studentName}</p>
                          <p className="text-xs text-gray-500">{absence.studentNumber}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-700">
                          {absence.courseName}
                          {absence.sessionStartTime && absence.sessionEndTime && (
                            <div className="text-xs text-blue-600 font-semibold mt-1">
                              {absence.sessionStartTime} - {absence.sessionEndTime}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {absence.status === 'absent' ? (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                            Absent
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                            Retard
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {absence.justified ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            ✅ Justifié
                          </span>
                        ) : absence.justificationUrl ? (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                            ⏳ En attente
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                            Aucun
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {/* Bouton voir justificatif si existe */}
                          {absence.justificationUrl && (
                            <a
                              href={absence.justificationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Voir le justificatif"
                            >
                              <FileText className="h-4 w-4" />
                            </a>
                          )}

                          {/* Boutons d'action */}
                          {!absence.justified ? (
                            <>
                              <button
                                onClick={() => handleJustify(absence)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                                title="Marquer comme justifié"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              {absence.justificationUrl && (
                                <button
                                  onClick={() => handleReject(absence)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                  title="Rejeter le justificatif"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-green-600 font-semibold">Validé</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
