/**
 * StudentsListPage.jsx - Liste des étudiants avec filtres
 *
 * Fonctionnalités:
 * - Affichage de tous les étudiants de l'université
 * - Filtres : département, niveau, recherche par nom/matricule
 * - Actions : voir détails, modifier, supprimer
 * - Création de compte parent affilié
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, remove } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function StudentsListPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const levels = ['L1', 'L2', 'L3', 'M1', 'M2', 'D1', 'D2', 'D3'];

  // Charger étudiants et départements
  useEffect(() => {
    const loadData = async () => {
      if (!userProfile?.universityId) return;

      try {
        setLoading(true);

        // Charger étudiants (les infos parents sont déjà stockées sur l'étudiant)
        const studentsRef = ref(database, `universities/${userProfile.universityId}/students`);
        const studentsSnap = await get(studentsRef);

        if (studentsSnap.exists()) {
          const studentsData = Object.entries(studentsSnap.val()).map(([id, data]) => ({
            id,
            ...data,
            parents: data.parents || [] // Infos parents stockées directement
          }));

          setStudents(studentsData);
          setFilteredStudents(studentsData);
        }

        // Charger départements globaux
        const deptsRef = ref(database, 'departments');
        const deptsSnap = await get(deptsRef);

        if (deptsSnap.exists()) {
          const deptsData = Object.values(deptsSnap.val());
          setDepartments(deptsData);
        }
      } catch (err) {
        console.error('Error loading students:', err);
        setError('Erreur lors du chargement des étudiants');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userProfile]);

  // Filtrer étudiants
  useEffect(() => {
    let filtered = [...students];

    // Recherche par nom/matricule
    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.matricule?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtre département
    if (filterDepartment) {
      filtered = filtered.filter(s => s.department === filterDepartment);
    }

    // Filtre niveau
    if (filterLevel) {
      filtered = filtered.filter(s => s.level === filterLevel);
    }

    setFilteredStudents(filtered);
  }, [searchTerm, filterDepartment, filterLevel, students]);

  // Supprimer un étudiant
  const handleDelete = async (studentId, studentName) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'étudiant ${studentName} ?`)) {
      return;
    }

    try {
      await remove(ref(database, `universities/${userProfile.universityId}/students/${studentId}`));

      // Retirer de la liste locale
      setStudents(prev => prev.filter(s => s.id !== studentId));
      alert('Étudiant supprimé avec succès');
    } catch (err) {
      console.error('Error deleting student:', err);
      alert('Erreur lors de la suppression: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Chargement des étudiants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2">
              🎓 Liste des Étudiants
            </h1>
            <p className="text-gray-600">
              {filteredStudents.length} étudiant{filteredStudents.length > 1 ? 's' : ''} trouvé{filteredStudents.length > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/students/create')}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-semibold shadow-lg"
          >
            ➕ Nouvel Étudiant
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
            {error}
          </div>
        )}

        {/* Filtres */}
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Recherche */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🔍 Rechercher
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nom, prénom, matricule..."
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Département */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📚 Département
              </label>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tous les départements</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
            </div>

            {/* Niveau */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🎯 Niveau
              </label>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tous les niveaux</option>
                {levels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            {/* Reset */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterDepartment('');
                  setFilterLevel('');
                }}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-semibold"
              >
                🔄 Réinitialiser
              </button>
            </div>
          </div>
        </div>

        {/* Liste des étudiants */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map(student => (
            <div key={student.id} className="glass rounded-2xl p-6 hover:shadow-xl transition">
              {/* En-tête */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {student.firstName?.[0]}{student.lastName?.[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">
                      {student.firstName} {student.lastName}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {student.matricule}
                    </p>
                  </div>
                </div>
              </div>

              {/* Informations */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">📚</span>
                  <span className="text-gray-700">{student.department}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">🎯</span>
                  <span className="text-gray-700">{student.level}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">📧</span>
                  <span className="text-gray-700 text-xs">{student.email}</span>
                </div>
              </div>

              {/* Parents affiliés */}
              <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                {student.parents && student.parents.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-purple-700 mb-2">
                      👨‍👩‍👧 Parents affiliés ({student.parents.length}/2)
                    </p>
                    {student.parents.map((parent, index) => (
                      <div key={parent.id} className="text-xs bg-white p-2 rounded-lg">
                        <p className="font-semibold text-gray-900">{parent.displayName}</p>
                        <p className="text-gray-600">📱 {parent.phone}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">
                    Pas encore de parent affilié
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {student.parents && student.parents.length >= 2 ? (
                  // 2 parents déjà : pas de bouton
                  <div className="flex-1 px-3 py-2 bg-gray-200 text-gray-500 rounded-lg text-sm font-semibold text-center cursor-not-allowed">
                    ✓ Limite atteinte (2/2)
                  </div>
                ) : student.parents && student.parents.length === 1 ? (
                  // 1 parent : bouton ajouter parent supplémentaire
                  <button
                    onClick={() => navigate(`/admin/students/${student.id}/create-parent`)}
                    className="flex-1 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition text-sm font-semibold"
                  >
                    ➕ Ajouter parent supplémentaire
                  </button>
                ) : (
                  // 0 parent : bouton ajouter nouveau parent
                  <button
                    onClick={() => navigate(`/admin/students/${student.id}/create-parent`)}
                    className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm font-semibold"
                  >
                    ➕ Ajouter un nouveau parent
                  </button>
                )}
                <button
                  onClick={() => handleDelete(student.id, `${student.firstName} ${student.lastName}`)}
                  className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm font-semibold"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Aucun résultat */}
        {filteredStudents.length === 0 && (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Aucun étudiant trouvé
            </h3>
            <p className="text-gray-600 mb-6">
              Essayez de modifier vos critères de recherche
            </p>
            <button
              onClick={() => navigate('/admin/students/create')}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-semibold"
            >
              ➕ Créer le premier étudiant
            </button>
          </div>
        )}

        {/* Bouton retour */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="px-6 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold shadow"
          >
            ← Retour au Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
