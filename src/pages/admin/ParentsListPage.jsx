/**
 * ParentsListPage.jsx - Liste et gestion des parents
 *
 * Fonctionnalités:
 * - Affichage de tous les parents
 * - Recherche par nom ou téléphone
 * - Voir détails / Modifier / Supprimer
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, remove, update, push, set } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function ParentsListPage() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const [parents, setParents] = useState([]);
  const [filteredParents, setFilteredParents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Charger tous les parents depuis les étudiants
  useEffect(() => {
    const loadParents = async () => {
      if (!userProfile?.universityId) return;

      try {
        setLoading(true);

        // Charger tous les étudiants
        const studentsRef = ref(database, `universities/${userProfile.universityId}/students`);
        const studentsSnap = await get(studentsRef);

        if (studentsSnap.exists()) {
          const studentsData = studentsSnap.val();
          const parentsMap = new Map(); // Map<parentId, parentData>

          // Extraire tous les parents uniques
          Object.entries(studentsData).forEach(([studentId, studentData]) => {
            if (studentData.parents && Array.isArray(studentData.parents)) {
              studentData.parents.forEach(parent => {
                if (!parentsMap.has(parent.id)) {
                  parentsMap.set(parent.id, {
                    ...parent,
                    childrenCount: 1,
                    children: [{ id: studentId, name: `${studentData.firstName} ${studentData.lastName}` }]
                  });
                } else {
                  const existing = parentsMap.get(parent.id);
                  existing.childrenCount++;
                  existing.children.push({ id: studentId, name: `${studentData.firstName} ${studentData.lastName}` });
                }
              });
            }
          });

          const parentsList = Array.from(parentsMap.values());
          setParents(parentsList);
          setFilteredParents(parentsList);
        }
      } catch (err) {
        console.error('Error loading parents:', err);
        setError('Erreur lors du chargement des parents');
      } finally {
        setLoading(false);
      }
    };

    loadParents();
  }, [userProfile]);

  // Recherche
  useEffect(() => {
    if (!searchTerm) {
      setFilteredParents(parents);
      return;
    }

    const filtered = parents.filter(parent =>
      parent.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parent.phone?.includes(searchTerm)
    );

    setFilteredParents(filtered);
  }, [searchTerm, parents]);

  // Supprimer un parent
  const handleDelete = async (parentId, parentName) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le parent ${parentName} ?\n\nCela retirera ce parent de tous les étudiants affiliés.`)) {
      return;
    }

    try {
      let affectedStudentsCount = 0;
      const affectedStudentsNames = [];

      // Retirer le parent de tous les étudiants
      const studentsRef = ref(database, `universities/${userProfile.universityId}/students`);
      const studentsSnap = await get(studentsRef);

      if (studentsSnap.exists()) {
        const studentsData = studentsSnap.val();

        for (const [studentId, studentData] of Object.entries(studentsData)) {
          if (studentData.parents && Array.isArray(studentData.parents)) {
            const updatedParents = studentData.parents.filter(p => p.id !== parentId);

            if (updatedParents.length !== studentData.parents.length) {
              // Ce parent était affilié à cet étudiant
              await update(ref(database, `universities/${userProfile.universityId}/students/${studentId}`), {
                parents: updatedParents
              });
              affectedStudentsCount++;
              affectedStudentsNames.push(`${studentData.firstName} ${studentData.lastName}`);
            }
          }
        }
      }

      // Supprimer le compte parent
      await remove(ref(database, `users/${parentId}`));

      // 🔒 AUDIT: Logger la suppression
      const auditRef = push(ref(database, `universities/${userProfile.universityId}/audit`));
      await set(auditRef, {
        action: 'DELETE_PARENT',
        performedBy: currentUser.uid,
        performedByName: userProfile.displayName,
        targetUid: parentId,
        targetName: parentName,
        affectedStudentsCount,
        affectedStudents: affectedStudentsNames,
        timestamp: Date.now(),
        date: new Date().toISOString()
      });

      // Retirer de la liste locale
      setParents(prev => prev.filter(p => p.id !== parentId));

      alert('Parent supprimé avec succès');
    } catch (err) {
      console.error('Error deleting parent:', err);
      alert('Erreur lors de la suppression: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Chargement des parents...</p>
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
              👨‍👩‍👧 Liste des Parents
            </h1>
            <p className="text-gray-600">
              {filteredParents.length} parent{filteredParents.length > 1 ? 's' : ''} trouvé{filteredParents.length > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="px-6 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold shadow"
          >
            ← Retour
          </button>
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
            placeholder="Nom ou téléphone..."
            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Liste des parents */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredParents.map(parent => (
            <div key={parent.id} className="glass rounded-2xl p-6 hover:shadow-xl transition">
              {/* En-tête */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {parent.displayName?.[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">
                      {parent.displayName}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {parent.childrenCount} enfant{parent.childrenCount > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Informations */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">📱</span>
                  <span className="text-gray-700">{parent.phone}</span>
                </div>
              </div>

              {/* Enfants affiliés */}
              <div className="mb-4 p-3 bg-blue-50 rounded-xl">
                <p className="text-xs font-semibold text-blue-700 mb-2">
                  Enfants affiliés:
                </p>
                <div className="space-y-1">
                  {parent.children.map((child, idx) => (
                    <p key={idx} className="text-xs text-gray-700">• {child.name}</p>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/admin/parents/${parent.id}`)}
                  className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-semibold"
                >
                  👁️ Voir
                </button>
                <button
                  onClick={() => handleDelete(parent.id, parent.displayName)}
                  className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm font-semibold"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Aucun résultat */}
        {filteredParents.length === 0 && (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Aucun parent trouvé
            </h3>
            <p className="text-gray-600">
              {parents.length === 0
                ? "Aucun parent n'a encore été créé"
                : "Essayez de modifier vos critères de recherche"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
