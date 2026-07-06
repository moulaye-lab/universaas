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
import { Eye, UserPlus, Trash2, Search } from 'lucide-react';
import { ref, get, update, remove } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { getAcademicYears, getCurrentAcademicYear } from '../../utils/academicYearHelper';
import useDynamicFilterOptions from '../../hooks/useDynamicFilterOptions';

export default function ParentsListPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    academicYear: getCurrentAcademicYear(),
    level: '',
    fieldOfStudy: ''
  });

  // Charger les options de filtres dynamiquement
  const { fieldOfStudies } = useDynamicFilterOptions(userProfile?.universityId);

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
                      fieldOfStudy: studentData.fieldOfStudy,
                      academicYear: studentData.academicYear
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
                    fieldOfStudy: studentData.fieldOfStudy,
                    academicYear: studentData.academicYear
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

  // Filtrage et recherche des parents
  const filteredParents = useMemo(() => {
    let result = parents;

    // Recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(parent =>
        parent.displayName.toLowerCase().includes(query) ||
        parent.phone.includes(query) ||
        parent.email.toLowerCase().includes(query)
      );
    }

    // Filtres hiérarchiques (basés sur les enfants)
    if (filters.academicYear) {
      result = result.filter(parent =>
        parent.children.some(child => child.academicYear === filters.academicYear)
      );
    }

    if (filters.level) {
      result = result.filter(parent =>
        parent.children.some(child => child.level === filters.level)
      );
    }

    if (filters.fieldOfStudy) {
      result = result.filter(parent =>
        parent.children.some(child => child.fieldOfStudy === filters.fieldOfStudy)
      );
    }

    return result;
  }, [parents, searchQuery, filters]);

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
                    {filteredParents.length} parent{filteredParents.length > 1 ? 's' : ''} trouvé{filteredParents.length > 1 ? 's' : ''} sur {parents.length}
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

              {/* Filtres et recherche */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Recherche */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher par nom, téléphone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>

                {/* Filtre Année */}
                <select
                  value={filters.academicYear}
                  onChange={(e) => setFilters({ ...filters, academicYear: e.target.value })}
                  className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                >
                  <option value="">Toutes les années</option>
                  {getAcademicYears(5, 2).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>

                {/* Filtre Filière */}
                <select
                  value={filters.fieldOfStudy}
                  onChange={(e) => setFilters({ ...filters, fieldOfStudy: e.target.value })}
                  className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                >
                  <option value="">Toutes les filières</option>
                  {fieldOfStudies.map(field => (
                    <option key={field.value} value={field.value}>{field.label}</option>
                  ))}
                </select>

                {/* Filtre Niveau */}
                <select
                  value={filters.level}
                  onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                  className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                >
                  <option value="">Tous les niveaux</option>
                  {['L1', 'L2', 'L3', 'M1', 'M2', 'D1', 'D2', 'D3'].map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
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
                  {filteredParents.map(parent => (
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
