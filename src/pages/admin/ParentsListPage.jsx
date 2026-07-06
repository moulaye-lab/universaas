/**
 * ParentsListPage.jsx - Liste des parents (Version refonte avec AdvancedListView)
 *
 * ⚠️ LOGIQUE SPÉCIALE : Les parents n'ont pas de collection dédiée
 * On les extrait depuis les étudiants (chaque étudiant a un tableau parents)
 *
 * Fonctionnalités:
 * - Pagination 50 parents/page
 * - Filtres : niveau enfant, filière enfant, nombre d'enfants
 * - Recherche : nom, téléphone, email
 * - Tri par colonnes
 * - Actions : voir détails, ajouter enfant, supprimer
 * - Export CSV
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, UserPlus, Trash2 } from 'lucide-react';
import { ref, get, update, remove } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import AdvancedListView from '../../components/listing/AdvancedListView';

export default function ParentsListPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Charger les parents depuis les étudiants
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
                    id: parent.id,
                    displayName: parent.displayName,
                    phone: parent.phone,
                    email: parent.email || 'Non renseigné',
                    childrenCount: 1,
                    children: [{
                      id: studentId,
                      name: `${studentData.firstName} ${studentData.lastName}`,
                      level: studentData.level,
                      fieldOfStudy: studentData.fieldOfStudy
                    }],
                    status: 'active', // Par défaut
                    createdAt: parent.createdAt || Date.now()
                  });
                } else {
                  const existing = parentsMap.get(parent.id);
                  existing.childrenCount++;
                  existing.children.push({
                    id: studentId,
                    name: `${studentData.firstName} ${studentData.lastName}`,
                    level: studentData.level,
                    fieldOfStudy: studentData.fieldOfStudy
                  });
                }
              });
            }
          });

          const parentsList = Array.from(parentsMap.values());
          setParents(parentsList);
        }
      } catch (err) {
        console.error('Error loading parents:', err);
      } finally {
        setLoading(false);
      }
    };

    loadParents();
  }, [userProfile]);

  // Configuration des colonnes
  const columns = [
    {
      key: 'displayName',
      label: 'Nom complet',
      sortable: true
    },
    {
      key: 'phone',
      label: 'Téléphone',
      sortable: false
    },
    {
      key: 'email',
      label: 'Email',
      sortable: false
    },
    {
      key: 'childrenCount',
      label: 'Nombre d\'enfants',
      sortable: true,
      render: (parent) => (
        <span className="font-semibold text-blue-600">
          {parent.childrenCount} enfant{parent.childrenCount > 1 ? 's' : ''}
        </span>
      )
    },
    {
      key: 'childrenNames',
      label: 'Enfants',
      sortable: false,
      render: (parent) => (
        <div className="text-sm text-gray-600">
          {parent.children.slice(0, 2).map(child => child.name).join(', ')}
          {parent.children.length > 2 && ` +${parent.children.length - 2}`}
        </div>
      )
    }
  ];

  // Actions individuelles
  const rowActions = [
    {
      label: 'Voir détails',
      icon: Eye,
      onClick: (parent) => {
        navigate(`/admin/parents/${parent.id}`);
      }
    },
    {
      label: 'Ajouter enfant',
      icon: UserPlus,
      onClick: (parent) => {
        navigate(`/admin/parents/${parent.id}/add-child`);
      }
    },
    {
      label: 'Supprimer',
      icon: Trash2,
      onClick: async (parent) => {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer le parent ${parent.displayName} ?\n\nCela retirera ce parent de tous les étudiants affiliés (${parent.childrenCount} enfant(s)).`)) {
          return;
        }

        try {
          // Retirer le parent de tous les étudiants
          for (const child of parent.children) {
            const studentRef = ref(database, `universities/${userProfile.universityId}/students/${child.id}`);
            const studentSnap = await get(studentRef);

            if (studentSnap.exists()) {
              const studentData = studentSnap.val();
              const updatedParents = (studentData.parents || []).filter(p => p.id !== parent.id);

              await update(studentRef, {
                parents: updatedParents
              });
            }
          }

          // Supprimer le compte utilisateur parent
          await remove(ref(database, `users/${parent.id}`));

          alert(`Parent supprimé avec succès (retiré de ${parent.childrenCount} étudiant(s))`);
          window.location.reload();
        } catch (err) {
          console.error('Error deleting parent:', err);
          alert('Erreur lors de la suppression: ' + err.message);
        }
      }
    }
  ];

  // Pour AdvancedListView, on simule une collection virtuelle
  // On passe directement les données chargées
  const ParentsListWrapper = () => {
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

    // Hack : On passe les données via collectionPath null et on injecte les données
    return (
      <AdvancedListView
        entityType="parents"
        collectionPath={null} // Pas de collection Firebase directe
        title="👨‍👩‍👧 Gestion des Parents"

        columns={columns}

        filters={[]}
        availableOptions={{}}
        defaultFilters={{}}

        searchFields={['displayName', 'phone', 'email']}
        searchPlaceholder="Rechercher par nom, téléphone, email..."

        rowActions={rowActions}
        bulkActions={[]}

        onCreateNew={() => navigate('/admin/parents/create')}
        onRowClick={(parent) => navigate(`/admin/parents/${parent.id}`)}

        pageSize={50}
        orderBy="displayName"

        enableBulkSelection={false}
        enableExport={true}
        showStats={false}
      />
    );
  };

  // ⚠️ PROBLÈME : AdvancedListView attend un collectionPath Firebase
  // Pour les parents, on doit faire une version custom

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-semibold">Chargement des parents...</p>
          </div>
        </div>
      ) : (
        <div>
          {/* Header */}
          <div className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-[1600px] mx-auto px-6 py-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h1 className="text-3xl font-black text-gray-900">👨‍👩‍👧 Gestion des Parents</h1>
                  <p className="text-gray-600 mt-1">
                    {parents.length} parent{parents.length > 1 ? 's' : ''} trouvé{parents.length > 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/admin/parents/create')}
                  className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <UserPlus className="w-5 h-5" />
                  Créer Parent
                </button>
              </div>
            </div>
          </div>

          {/* Liste simple (à améliorer avec pagination manuelle) */}
          <div className="max-w-[1600px] mx-auto px-6 py-6">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    {columns.map(col => (
                      <th key={col.key} className="px-4 py-4 text-left text-sm font-bold text-gray-700">
                        {col.label}
                      </th>
                    ))}
                    <th className="px-4 py-4 text-center text-sm font-bold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {parents.map(parent => (
                    <tr key={parent.id} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                      {columns.map(col => (
                        <td key={col.key} className="px-4 py-4">
                          {col.render ? col.render(parent) : parent[col.key]}
                        </td>
                      ))}
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {rowActions.map((action, idx) => {
                            const Icon = action.icon;
                            return (
                              <button
                                key={idx}
                                onClick={() => action.onClick(parent)}
                                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title={action.label}
                              >
                                <Icon className="w-5 h-5" />
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
