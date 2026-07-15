/**
 * AcademicPromotionPage.jsx - Gestion Promotion Académique
 *
 * Fonctionnalités:
 * - Tableau tous étudiants actifs avec moyennes S1+S2
 * - Suggestions décisions automatiques
 * - Validation soutenances L3/M2
 * - Décisions individuelles et en masse
 * - Export rapport PDF
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  loadPromotionData,
  preparePromotionSuggestions,
  executePromotion,
  validateDefense
} from '../../services/promotionService';
import {
  formatDecision,
  calculatePromotionStats,
  getNextLevel,
  getClassesForLevel
} from '../../utils/promotionHelpers';
import { canPromoteStudents } from '../../services/academicYearService';
import {
  ChevronLeft,
  GraduationCap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  Download,
  Play
} from 'lucide-react';

export default function AcademicPromotionPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [students, setStudents] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [blockingMessage, setBlockingMessage] = useState(null);
  const [canPromote, setCanPromote] = useState(false);

  // Filtres
  const [filters, setFilters] = useState({
    level: 'all',
    decision: 'all',
    search: ''
  });

  // Modal states
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [showDefenseModal, setShowDefenseModal] = useState(false);
  const [showJustificationModal, setShowJustificationModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [defenseForm, setDefenseForm] = useState({
    validated: false,
    date: '',
    grade: ''
  });

  useEffect(() => {
    loadData();
  }, [userProfile]);

  useEffect(() => {
    applyFilters();
  }, [students, filters]);

  const loadData = async () => {
    if (!userProfile?.universityId) return;

    try {
      setLoading(true);

      // Vérifier si les semestres sont clôturés
      const promotionStatus = await canPromoteStudents(userProfile.universityId);
      setCanPromote(promotionStatus.canPromote);

      if (!promotionStatus.canPromote) {
        setBlockingMessage(promotionStatus.message);
      }

      const { students: studentsData, grades, classes } = await loadPromotionData(userProfile.universityId);

      const suggestions = preparePromotionSuggestions(studentsData, grades);
      setStudents(suggestions);
      setAllClasses(classes);
    } catch (error) {
      console.error('Erreur chargement:', error);
      alert('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...students];

    // Filtre niveau
    if (filters.level !== 'all') {
      filtered = filtered.filter(s => s.level?.toUpperCase() === filters.level);
    }

    // Filtre décision
    if (filters.decision !== 'all') {
      filtered = filtered.filter(s => s.decision === filters.decision);
    }

    // Recherche
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(s =>
        s.firstName?.toLowerCase().includes(searchLower) ||
        s.lastName?.toLowerCase().includes(searchLower) ||
        s.matricule?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredStudents(filtered);
  };

  const updateStudentDecision = (studentId, updates) => {
    setStudents(prev =>
      prev.map(s => s.id === studentId ? { ...s, ...updates } : s)
    );
  };

  const handleDefenseValidation = (student) => {
    setSelectedStudent(student);
    setDefenseForm({
      validated: student.defenseValidated || false,
      date: student.defenseDate ? new Date(student.defenseDate).toISOString().split('T')[0] : '',
      grade: student.defenseGrade || ''
    });
    setShowDefenseModal(true);
  };

  const handleSaveDefense = async () => {
    try {
      await validateDefense(userProfile.universityId, selectedStudent.id, {
        validated: defenseForm.validated,
        date: defenseForm.date ? new Date(defenseForm.date).getTime() : Date.now(),
        grade: parseFloat(defenseForm.grade) || null
      });

      // Mettre à jour localement
      updateStudentDecision(selectedStudent.id, {
        defenseValidated: defenseForm.validated,
        defenseDate: defenseForm.date ? new Date(defenseForm.date).getTime() : Date.now(),
        defenseGrade: parseFloat(defenseForm.grade) || null
      });

      // Recalculer la décision
      const newDecision = defenseForm.validated && selectedStudent.yearAvg >= 10 ? 'diplome' : 'redoublant';
      updateStudentDecision(selectedStudent.id, {
        decision: newDecision,
        newLevel: newDecision === 'diplome' ? null : selectedStudent.level
      });

      alert('✅ Soutenance mise à jour');
      setShowDefenseModal(false);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const handleDecisionChange = (student) => {
    setSelectedStudent(student);
    setShowDecisionModal(true);
  };

  const handleExecutePromotion = async () => {
    // Vérifier à nouveau au moment de l'exécution
    if (!canPromote) {
      alert('❌ Les deux semestres doivent être clôturés avant de lancer la promotion.\n\nAllez dans Année Académique pour clôturer les semestres.');
      return;
    }

    if (!confirm(`Confirmer la promotion pour ${students.length} étudiants ?\n\nCette action est irréversible.`)) {
      return;
    }

    try {
      setExecuting(true);

      const decisions = students.map(s => ({
        studentId: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        decision: s.decision,
        oldLevel: s.level,
        oldClassName: s.className,
        oldClassId: s.classId,
        newLevel: s.newLevel,
        newClassName: s.newClassName,
        newClassId: s.newClassId,
        semester1Avg: s.semester1Avg,
        semester2Avg: s.semester2Avg,
        yearAvg: s.yearAvg,
        defenseValidated: s.defenseValidated,
        justification: s.justification
      }));

      const result = await executePromotion(
        userProfile.universityId,
        decisions,
        userProfile.uid
      );

      alert(`✅ Promotion exécutée avec succès!\n\n${result.stats.promoted} promus\n${result.stats.redoublant} redoublants\n${result.stats.diplome} diplômés`);
      navigate('/dashboard/admin');
    } catch (error) {
      console.error('Erreur exécution:', error);
      alert('Erreur: ' + error.message);
    } finally {
      setExecuting(false);
    }
  };

  const stats = calculatePromotionStats(students.map(s => ({ decision: s.decision })));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/dashboard/admin')}
              className="p-2 hover:bg-white rounded-xl transition shadow-sm"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">🎓 Promotion Académique</h1>
              <p className="text-gray-600 mt-1">Passage en classe supérieure - Année 2025-2026</p>
            </div>
            <button
              onClick={handleExecutePromotion}
              disabled={executing || students.length === 0 || !canPromote}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition font-semibold disabled:opacity-50"
            >
              <Play className="h-5 w-5" />
              {executing ? 'Exécution...' : 'Valider Promotion'}
            </button>
          </div>

          {/* Blocking Message */}
          {blockingMessage && !canPromote && (
            <div className="glass rounded-xl p-4 mb-6 bg-orange-50 border-l-4 border-orange-500">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-orange-900">Promotion bloquée</p>
                  <p className="text-sm text-orange-700 mt-1">{blockingMessage}</p>
                  <button
                    onClick={() => navigate('/admin/academic-year-config')}
                    className="mt-3 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm font-semibold"
                  >
                    Gérer l'Année Académique →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">✅ Promus</p>
              <p className="text-2xl font-bold text-green-600">{stats.promoted}</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">🔄 Redoublants</p>
              <p className="text-2xl font-bold text-orange-600">{stats.redoublant}</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">🎓 Diplômés</p>
              <p className="text-2xl font-bold text-blue-600">{stats.diplome}</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">⏸️ Inactifs</p>
              <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
            </div>
          </div>

          {/* Filtres */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Filter className="h-5 w-5 text-gray-600" />

              <select
                value={filters.level}
                onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                className="px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Tous les niveaux</option>
                <option value="L1">L1</option>
                <option value="L2">L2</option>
                <option value="L3">L3</option>
                <option value="M1">M1</option>
                <option value="M2">M2</option>
              </select>

              <select
                value={filters.decision}
                onChange={(e) => setFilters({ ...filters, decision: e.target.value })}
                className="px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Toutes les décisions</option>
                <option value="promoted">Promus</option>
                <option value="redoublant">Redoublants</option>
                <option value="diplome">Diplômés</option>
                <option value="inactive">Inactifs</option>
              </select>

              <input
                type="text"
                placeholder="Rechercher étudiant..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Étudiant</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Niveau</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">S1</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">S2</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Année</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Soutenance</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Décision</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                      Aucun étudiant trouvé
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(student => {
                    const decisionFormat = formatDecision(student.decision);
                    const isL3orM2 = student.level === 'L3' || student.level === 'M2';

                    return (
                      <tr key={student.id} className="hover:bg-indigo-50 transition">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-xs text-gray-500">{student.matricule}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-sm font-medium">
                            {student.level}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold">
                            {student.semester1Avg?.toFixed(2) || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold">
                            {student.semester2Avg?.toFixed(2) || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold ${
                            student.yearAvg >= 10 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {student.yearAvg?.toFixed(2) || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isL3orM2 ? (
                            <button
                              onClick={() => handleDefenseValidation(student)}
                              className={`p-1 rounded ${
                                student.defenseValidated
                                  ? 'text-green-600 hover:bg-green-50'
                                  : 'text-gray-400 hover:bg-gray-50'
                              }`}
                            >
                              {student.defenseValidated ? (
                                <CheckCircle className="h-5 w-5" />
                              ) : (
                                <XCircle className="h-5 w-5" />
                              )}
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${decisionFormat.color}`}>
                            {decisionFormat.icon} {decisionFormat.label}
                          </span>
                          {student.newLevel && (
                            <p className="text-xs text-gray-600 mt-1">→ {student.newLevel}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDecisionChange(student)}
                            className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
                          >
                            Modifier
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Soutenance */}
        {showDefenseModal && selectedStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">🎓 Validation Soutenance</h2>
                <p className="text-gray-600 mb-6">
                  {selectedStudent.firstName} {selectedStudent.lastName} - {selectedStudent.level}
                </p>

                <div className="space-y-4">
                  {/* Toggle Validation */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <p className="font-semibold text-gray-900">Soutenance Validée</p>
                        <p className="text-sm text-gray-600">L'étudiant a-t-il réussi sa soutenance ?</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDefenseForm({ ...defenseForm, validated: !defenseForm.validated })}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                          defenseForm.validated ? 'bg-green-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            defenseForm.validated ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </label>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Date de Soutenance
                    </label>
                    <input
                      type="date"
                      value={defenseForm.date}
                      onChange={(e) => setDefenseForm({ ...defenseForm, date: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Note */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Note de Soutenance (optionnel)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      value={defenseForm.grade}
                      onChange={(e) => setDefenseForm({ ...defenseForm, grade: e.target.value })}
                      placeholder="Ex: 15.5"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Aperçu décision */}
                  <div className={`rounded-xl p-4 ${
                    defenseForm.validated && selectedStudent.yearAvg >= 10
                      ? 'bg-blue-50 border-2 border-blue-300'
                      : 'bg-orange-50 border-2 border-orange-300'
                  }`}>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Décision automatique:</p>
                    <p className={`text-lg font-bold ${
                      defenseForm.validated && selectedStudent.yearAvg >= 10
                        ? 'text-blue-700'
                        : 'text-orange-700'
                    }`}>
                      {defenseForm.validated && selectedStudent.yearAvg >= 10
                        ? '🎓 Diplômé'
                        : '🔄 Redoublant'}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Moyenne annuelle: {selectedStudent.yearAvg?.toFixed(2)}/20
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowDefenseModal(false)}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveDefense}
                    className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold"
                  >
                    💾 Enregistrer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
