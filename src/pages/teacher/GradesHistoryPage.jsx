/**
 * GradesHistoryPage.jsx - Historique et modification des notes par l'enseignant
 *
 * Fonctionnalités:
 * - Voir toutes les notes saisies par l'enseignant
 * - Filtrer par cours, type de note, date
 * - Modifier une note existante
 * - Supprimer une note
 * - Statistiques des notes par cours
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, update, remove, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Edit2, Trash2, Search, Filter, BarChart2, Calendar, Award } from 'lucide-react';

export default function GradesHistoryPage() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const [grades, setGrades] = useState([]);
  const [filteredGrades, setFilteredGrades] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtres
  const [filters, setFilters] = useState({
    courseId: '',
    gradeType: '',
    studentName: '',
    dateFrom: '',
    dateTo: ''
  });

  // Modal de modification
  const [editingGrade, setEditingGrade] = useState(null);
  const [editForm, setEditForm] = useState({
    grade: '',
    observation: '',
    coefficient: '',
    maxGrade: ''
  });

  // Statistiques
  const [stats, setStats] = useState({
    totalGrades: 0,
    averageGrade: 0,
    byType: {},
    byCourse: {}
  });

  // Charger les données
  useEffect(() => {
    loadData();
  }, [userProfile, currentUser]);

  // Appliquer les filtres
  useEffect(() => {
    applyFilters();
  }, [filters, grades]);

  const loadData = async () => {
    if (!userProfile?.universityId || !currentUser?.uid) {
      return;
    }

    try {
      setLoading(true);

      // Charger les cours de l'enseignant
      const coursesRef = ref(database, `universities/${userProfile.universityId}/courses`);
      const coursesSnap = await get(coursesRef);

      let coursesData = [];
      if (coursesSnap.exists()) {
        coursesData = Object.entries(coursesSnap.val())
          .map(([id, data]) => ({ id, ...data }))
          .filter(course => course.teacherId === currentUser.uid);
      }
      setCourses(coursesData);

      // Charger toutes les notes de l'enseignant
      const gradesRef = ref(database, `universities/${userProfile.universityId}/grades`);
      const gradesSnap = await get(gradesRef);

      let gradesData = [];
      if (gradesSnap.exists()) {
        gradesData = Object.entries(gradesSnap.val())
          .map(([id, data]) => ({ id, ...data }))
          .filter(grade => grade.teacherId === currentUser.uid)
          .sort((a, b) => (b.date || b.createdAt) - (a.date || a.createdAt));
      }

      setGrades(gradesData);
      setFilteredGrades(gradesData);
      calculateStats(gradesData);
    } catch (err) {
      console.error('❌ Error loading data:', err);
      setError('Erreur lors du chargement des données: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (gradesData) => {
    if (gradesData.length === 0) {
      setStats({
        totalGrades: 0,
        averageGrade: 0,
        byType: {},
        byCourse: {}
      });
      return;
    }

    const totalGrades = gradesData.length;
    const sum = gradesData.reduce((acc, g) => acc + (g.grade || 0), 0);
    const averageGrade = (sum / totalGrades).toFixed(2);

    // Par type
    const byType = {};
    gradesData.forEach(g => {
      const type = g.gradeType || 'other';
      byType[type] = (byType[type] || 0) + 1;
    });

    // Par cours
    const byCourse = {};
    gradesData.forEach(g => {
      const courseName = g.courseName || 'Inconnu';
      if (!byCourse[courseName]) {
        byCourse[courseName] = { count: 0, sum: 0 };
      }
      byCourse[courseName].count++;
      byCourse[courseName].sum += g.grade || 0;
    });

    setStats({
      totalGrades,
      averageGrade,
      byType,
      byCourse
    });
  };

  const applyFilters = () => {
    let filtered = [...grades];

    if (filters.courseId) {
      filtered = filtered.filter(g => g.courseId === filters.courseId);
    }

    if (filters.gradeType) {
      filtered = filtered.filter(g => g.gradeType === filters.gradeType);
    }

    if (filters.studentName) {
      const search = filters.studentName.toLowerCase();
      filtered = filtered.filter(g =>
        g.studentName?.toLowerCase().includes(search)
      );
    }

    if (filters.dateFrom) {
      const fromTimestamp = new Date(filters.dateFrom).getTime();
      filtered = filtered.filter(g => (g.date || g.createdAt) >= fromTimestamp);
    }

    if (filters.dateTo) {
      const toTimestamp = new Date(filters.dateTo).setHours(23, 59, 59, 999);
      filtered = filtered.filter(g => (g.date || g.createdAt) <= toTimestamp);
    }

    setFilteredGrades(filtered);
    calculateStats(filtered);
  };

  const handleEditClick = (grade) => {
    setEditingGrade(grade);
    setEditForm({
      grade: grade.grade || '',
      observation: grade.observation || '',
      coefficient: grade.coefficient || 1,
      maxGrade: grade.maxGrade || 20
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingGrade) return;

    try {
      const gradeValue = parseFloat(editForm.grade);
      const maxGradeValue = parseFloat(editForm.maxGrade);

      if (isNaN(gradeValue) || gradeValue < 0 || gradeValue > maxGradeValue) {
        setError(`Note invalide (0-${maxGradeValue})`);
        return;
      }

      const gradeRef = ref(
        database,
        `universities/${userProfile.universityId}/grades/${editingGrade.id}`
      );

      await update(gradeRef, {
        grade: gradeValue,
        observation: editForm.observation.trim() || null,
        coefficient: parseFloat(editForm.coefficient),
        maxGrade: maxGradeValue,
        updatedAt: Date.now()
      });

      setSuccess('✅ Note modifiée avec succès');
      setEditingGrade(null);
      loadData();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating grade:', err);
      setError('Erreur lors de la modification: ' + err.message);
    }
  };

  const handleDelete = async (gradeId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
      return;
    }

    try {
      const gradeRef = ref(
        database,
        `universities/${userProfile.universityId}/grades/${gradeId}`
      );
      await remove(gradeRef);

      setSuccess('✅ Note supprimée avec succès');
      loadData();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting grade:', err);
      setError('Erreur lors de la suppression: ' + err.message);
    }
  };

  const resetFilters = () => {
    setFilters({
      courseId: '',
      gradeType: '',
      studentName: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getGradeTypeLabel = (type) => {
    const labels = {
      exam: 'Examen',
      homework: 'Devoir',
      continuous_assessment: 'Contrôle continu',
      project: 'Projet',
      oral: 'Oral',
      practical: 'TP'
    };
    return labels[type] || type;
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2">
            📊 Historique des Notes
          </h1>
          <p className="text-gray-600">
            Consultez et modifiez vos notes saisies
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
            ❌ {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-600">
            {success}
          </div>
        )}

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Award className="text-blue-500" size={24} />
              <p className="text-gray-600 font-semibold">Notes saisies</p>
            </div>
            <p className="text-3xl font-black text-gray-900">{stats.totalGrades}</p>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <BarChart2 className="text-green-500" size={24} />
              <p className="text-gray-600 font-semibold">Moyenne générale</p>
            </div>
            <p className="text-3xl font-black text-gray-900">{stats.averageGrade}/20</p>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="text-purple-500" size={24} />
              <p className="text-gray-600 font-semibold">Cours notés</p>
            </div>
            <p className="text-3xl font-black text-gray-900">{Object.keys(stats.byCourse).length}</p>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Filter className="text-orange-500" size={24} />
              <p className="text-gray-600 font-semibold">Types de notes</p>
            </div>
            <p className="text-3xl font-black text-gray-900">{Object.keys(stats.byType).length}</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="glass rounded-3xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="text-blue-500" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">Filtres</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Cours
              </label>
              <select
                value={filters.courseId}
                onChange={(e) => setFilters(prev => ({ ...prev, courseId: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tous les cours</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.courseName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Type
              </label>
              <select
                value={filters.gradeType}
                onChange={(e) => setFilters(prev => ({ ...prev, gradeType: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tous les types</option>
                <option value="exam">Examen</option>
                <option value="homework">Devoir</option>
                <option value="continuous_assessment">Contrôle continu</option>
                <option value="project">Projet</option>
                <option value="oral">Oral</option>
                <option value="practical">TP</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Étudiant
              </label>
              <input
                type="text"
                value={filters.studentName}
                onChange={(e) => setFilters(prev => ({ ...prev, studentName: e.target.value }))}
                placeholder="Nom de l'étudiant"
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Date début
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Date fin
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-semibold"
            >
              Réinitialiser les filtres
            </button>
          </div>
        </div>

        {/* Liste des notes */}
        <div className="glass rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Notes ({filteredGrades.length})
            </h2>
          </div>

          {filteredGrades.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Aucune note trouvée</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredGrades.map(grade => (
                <div key={grade.id} className="bg-white rounded-xl p-4 hover:shadow-md transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold">
                          {getGradeTypeLabel(grade.gradeType)}
                        </span>
                        <span className="text-gray-500 text-sm">
                          {formatDate(grade.date || grade.createdAt)}
                        </span>
                      </div>

                      <h3 className="font-bold text-gray-900 text-lg mb-1">
                        {grade.title || 'Sans titre'}
                      </h3>

                      <p className="text-gray-600 mb-1">
                        <strong>Cours:</strong> {grade.courseName}
                      </p>

                      <p className="text-gray-600 mb-1">
                        <strong>Étudiant:</strong> {grade.studentName}
                      </p>

                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                        <span>Coefficient: {grade.coefficient || 1}</span>
                        <span>Note max: {grade.maxGrade || 20}</span>
                      </div>

                      {grade.observation && (
                        <p className="text-sm text-gray-600 mt-2 italic">
                          "{grade.observation}"
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="text-right">
                        <p className="text-3xl font-black text-blue-600">
                          {grade.grade}/{grade.maxGrade || 20}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditClick(grade)}
                          className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                          title="Modifier"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(grade.id)}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                          title="Supprimer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de modification */}
      {editingGrade && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              ✏️ Modifier la note
            </h2>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Étudiant
                </label>
                <input
                  type="text"
                  value={editingGrade.studentName}
                  disabled
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cours
                </label>
                <input
                  type="text"
                  value={editingGrade.courseName}
                  disabled
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Note *
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max={editForm.maxGrade}
                    value={editForm.grade}
                    onChange={(e) => setEditForm(prev => ({ ...prev, grade: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Note maximale *
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={editForm.maxGrade}
                    onChange={(e) => setEditForm(prev => ({ ...prev, maxGrade: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Coefficient *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="10"
                  value={editForm.coefficient}
                  onChange={(e) => setEditForm(prev => ({ ...prev, coefficient: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Observation (facultatif)
                </label>
                <textarea
                  value={editForm.observation}
                  onChange={(e) => setEditForm(prev => ({ ...prev, observation: e.target.value }))}
                  rows="3"
                  maxLength="200"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {editForm.observation.length}/200 caractères
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingGrade(null)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-semibold"
                >
                  💾 Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
