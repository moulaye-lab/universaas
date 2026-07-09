/**
 * ChildAbsencesPage.jsx - Page de visualisation des absences des enfants pour les parents
 *
 * Fonctionnalités:
 * - Sélectionner un enfant (si plusieurs)
 * - Afficher toutes les absences et retards de l'enfant
 * - Filtrer par statut et date
 * - Statistiques par enfant
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { ChevronLeft, AlertCircle, Clock, Calendar, BookOpen, User, CheckCircle, XCircle, Filter, Users, ChevronDown } from 'lucide-react';

export default function ChildAbsencesPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Charger les enfants
  useEffect(() => {
    loadChildren();
  }, [userProfile]);

  // Charger les absences quand un enfant est sélectionné
  useEffect(() => {
    if (selectedChildId && selectedChild) {
      loadAbsences();
    }
  }, [selectedChildId, selectedChild]);

  useEffect(() => {
    applyFilters();
  }, [absences, statusFilter, searchTerm]);

  const loadChildren = async () => {
    if (!userProfile?.childrenAccess) {
      setError('Aucun enfant associé à ce compte');
      setLoading(false);
      return;
    }

    try {
      const childrenList = [];

      // Parcourir toutes les universités
      for (const [universityId, studentsObj] of Object.entries(userProfile.childrenAccess)) {
        for (const studentId of Object.keys(studentsObj)) {
          const studentRef = ref(database, `universities/${universityId}/students/${studentId}`);
          const studentSnap = await get(studentRef);

          if (studentSnap.exists()) {
            const studentData = studentSnap.val();
            childrenList.push({
              childId: studentId,
              childName: `${studentData.firstName} ${studentData.lastName}`,
              universityId: universityId,
              studentData: studentData
            });
          }
        }
      }

      setChildren(childrenList);

      // Sélectionner le premier enfant par défaut
      if (childrenList.length > 0) {
        setSelectedChildId(childrenList[0].childId);
        setSelectedChild(childrenList[0]);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error loading children:', err);
      setError('Erreur lors du chargement des enfants');
      setLoading(false);
    }
  };

  const loadAbsences = async () => {
    if (!selectedChild) return;

    try {
      setLoading(true);
      const studentId = selectedChildId;
      const uniId = selectedChild.universityId;

      // Query pour récupérer les absences de cet enfant
      const absencesRef = ref(database, `universities/${uniId}/absences`);
      const absencesQuery = query(absencesRef, orderByChild('studentId'), equalTo(studentId));
      const absencesSnap = await get(absencesQuery);

      if (absencesSnap.exists()) {
        const absencesData = Object.values(absencesSnap.val())
          .sort((a, b) => (b.date || 0) - (a.date || 0));

        setAbsences(absencesData);

        // Calculer statistiques
        const totalAbsences = absencesData.filter(a => a.status === 'absent').length;
        const totalLates = absencesData.filter(a => a.status === 'late').length;
        const justified = absencesData.filter(a => a.justified === true).length;

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
        setStats({
          totalAbsences: 0,
          totalLates: 0,
          justified: 0,
          attendanceRate: 100
        });
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

    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === statusFilter);
    }

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.courseName?.toLowerCase().includes(term) ||
        a.teacherName?.toLowerCase().includes(term)
      );
    }

    setFilteredAbsences(filtered);
  };

  const handleChildChange = (childId) => {
    const child = children.find(c => c.childId === childId);
    setSelectedChildId(childId);
    setSelectedChild(child);
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

  if (loading && children.length === 0) {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/dashboard/parent')}
            className="p-2 hover:bg-white rounded-xl transition"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Absences & Retards</h1>
            <p className="text-gray-600 mt-1">Suivi de présence de vos enfants</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
            {error}
          </div>
        )}

        {/* Sélection enfant */}
        {children.length > 1 && (
          <div className="glass rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Sélectionner un enfant</h2>
            </div>
            <select
              value={selectedChildId || ''}
              onChange={(e) => handleChildChange(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {children.map(child => (
                <option key={child.childId} value={child.childId}>
                  {child.childName}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedChild && (
          <>
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
                Historique de {selectedChild.childName} ({filteredAbsences.length})
              </h2>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">Chargement...</p>
                </div>
              ) : filteredAbsences.length === 0 ? (
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
                <li>Les absences et retards sont enregistrés par les professeurs</li>
                <li>Contactez l'administration pour justifier une absence</li>
                <li>Le taux de présence est calculé de manière estimée</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
