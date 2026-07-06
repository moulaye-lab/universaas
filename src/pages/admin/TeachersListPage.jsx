/**
 * TeachersListPage.jsx - Liste et gestion des enseignants
 *
 * Fonctionnalités:
 * - Affichage de tous les enseignants
 * - Recherche par nom ou email
 * - Voir détails / Modifier / Supprimer
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, remove } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';

export default function TeachersListPage() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const [teachers, setTeachers] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Charger tous les enseignants
  useEffect(() => {
    const loadTeachers = async () => {
      if (!userProfile?.universityId) return;

      try {
        setLoading(true);

        const teachersRef = ref(database, `universities/${userProfile.universityId}/teachers`);
        const teachersSnap = await get(teachersRef);

        if (teachersSnap.exists()) {
          const teachersData = Object.entries(teachersSnap.val()).map(([id, data]) => ({
            id,
            ...data
          }));

          setTeachers(teachersData);
          setFilteredTeachers(teachersData);
        }
      } catch (err) {
        console.error('Error loading teachers:', err);
        setError('Erreur lors du chargement des enseignants');
      } finally {
        setLoading(false);
      }
    };

    loadTeachers();
  }, [userProfile]);

  // Recherche
  useEffect(() => {
    if (!searchTerm) {
      setFilteredTeachers(teachers);
      return;
    }

    const filtered = teachers.filter(teacher =>
      teacher.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredTeachers(filtered);
  }, [searchTerm, teachers]);

  // Supprimer un enseignant
  const handleDelete = async (teacherId, teacherName) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'enseignant ${teacherName} ?\n\nCette action est irréversible.`)) {
      return;
    }

    try {
      // Supprimer de la collection teachers
      await remove(ref(database, `universities/${userProfile.universityId}/teachers/${teacherId}`));

      // Supprimer le compte utilisateur
      await remove(ref(database, `users/${teacherId}`));

      // Retirer de la liste locale
      setTeachers(prev => prev.filter(t => t.id !== teacherId));

      alert('Enseignant supprimé avec succès');
    } catch (err) {
      console.error('Error deleting teacher:', err);
      alert('Erreur lors de la suppression: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Chargement des enseignants...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2">
              👨‍🏫 Liste des Enseignants
            </h1>
            <p className="text-gray-600">
              {filteredTeachers.length} enseignant{filteredTeachers.length > 1 ? 's' : ''} trouvé{filteredTeachers.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/admin/teachers/create')}
              className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition font-semibold shadow-lg"
            >
              ➕ Nouvel Enseignant
            </button>
            <button
              onClick={() => navigate('/dashboard/admin')}
              className="px-6 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold shadow"
            >
              ← Retour
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
            {error}
          </div>
        )}

        {/* Barre de recherche */}
        <div className="glass rounded-2xl p-6 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            🔍 Rechercher
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Nom, email, spécialisation..."
            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Liste des enseignants */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeachers.map(teacher => (
            <div key={teacher.id} className="glass rounded-2xl p-6 hover:shadow-xl transition">
              {/* En-tête */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {teacher.firstName?.[0]}{teacher.lastName?.[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">
                      {teacher.firstName} {teacher.lastName}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Enseignant
                    </p>
                  </div>
                </div>
              </div>

              {/* Informations */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">📧</span>
                  <span className="text-gray-700 text-xs">{teacher.email}</span>
                </div>
                {teacher.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">📱</span>
                    <span className="text-gray-700">{teacher.phone}</span>
                  </div>
                )}
                {teacher.specialization && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">🎓</span>
                    <span className="text-gray-700">{teacher.specialization}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/admin/teachers/${teacher.id}`)}
                  className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-semibold"
                >
                  👁️ Voir
                </button>
                <button
                  onClick={() => handleDelete(teacher.id, `${teacher.firstName} ${teacher.lastName}`)}
                  className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm font-semibold"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Aucun résultat */}
        {filteredTeachers.length === 0 && (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Aucun enseignant trouvé
            </h3>
            <p className="text-gray-600 mb-6">
              {teachers.length === 0
                ? "Aucun enseignant n'a encore été créé"
                : "Essayez de modifier vos critères de recherche"}
            </p>
            {teachers.length === 0 && (
              <button
                onClick={() => navigate('/admin/teachers/create')}
                className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition font-semibold"
              >
                ➕ Créer le premier enseignant
              </button>
            )}
          </div>
        )}
        </div>
      </div>
    </AdminLayout>
  );
}
