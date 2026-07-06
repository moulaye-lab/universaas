/**
 * TeachersListPage.jsx - Liste des enseignants (Version refonte avec AdvancedListView)
 *
 * Fonctionnalités:
 * - Pagination 50 enseignants/page
 * - Filtres : département, spécialisation, statut
 * - Recherche : nom, prénom, email, spécialisation
 * - Tri par colonnes
 * - Actions : voir détails, modifier, supprimer
 * - Sélection multiple + export CSV
 */

import { useNavigate } from 'react-router-dom';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { ref, remove } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import AdvancedListView from '../../components/listing/AdvancedListView';
import { getCurrentAcademicYear } from '../../utils/academicYearHelper';

export default function TeachersListPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  // Configuration des colonnes
  const columns = [
    {
      key: 'name',
      label: 'Nom complet',
      sortable: true,
      render: (teacher) => `${teacher.firstName} ${teacher.lastName}`
    },
    {
      key: 'email',
      label: 'Email',
      sortable: false
    },
    {
      key: 'phoneNumber',
      label: 'Téléphone',
      sortable: false,
      render: (teacher) => teacher.phoneNumber || 'Non renseigné'
    },
    {
      key: 'department',
      label: 'Département',
      sortable: true
    },
    {
      key: 'specialization',
      label: 'Spécialisation',
      sortable: false,
      render: (teacher) => teacher.specialization || 'Non spécifié'
    },
    {
      key: 'assignedCoursesCount',
      label: 'Cours assignés',
      sortable: false,
      render: (teacher) => {
        const count = teacher.assignedCourses?.length || 0;
        return (
          <span className={`font-semibold ${count > 0 ? 'text-green-600' : 'text-gray-400'}`}>
            {count}
          </span>
        );
      }
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      format: 'status'
    }
  ];

  // Actions individuelles
  const rowActions = [
    {
      label: 'Voir détails',
      icon: Eye,
      onClick: (teacher) => {
        navigate(`/admin/teachers/${teacher.id}`);
      }
    },
    {
      label: 'Modifier',
      icon: Edit,
      onClick: (teacher) => {
        navigate(`/admin/teachers/${teacher.id}`);
      }
    },
    {
      label: 'Supprimer',
      icon: Trash2,
      onClick: async (teacher) => {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer l'enseignant ${teacher.firstName} ${teacher.lastName} ?\n\nCette action est irréversible.`)) {
          return;
        }

        try {
          // Supprimer de la collection teachers
          await remove(ref(database, `universities/${userProfile.universityId}/teachers/${teacher.id}`));

          // Supprimer le compte utilisateur
          await remove(ref(database, `users/${teacher.id}`));

          alert('Enseignant supprimé avec succès');
          window.location.reload();
        } catch (err) {
          console.error('Error deleting teacher:', err);
          alert('Erreur lors de la suppression: ' + err.message);
        }
      }
    }
  ];

  // Actions bulk
  const bulkActions = [
    {
      label: 'Supprimer la sélection',
      icon: Trash2,
      danger: true,
      onClick: () => {
        alert('Fonction de suppression multiple à implémenter');
      }
    }
  ];

  // Options de filtres
  const availableOptions = {
    statuses: [
      { value: 'active', label: 'Actif' },
      { value: 'inactive', label: 'Inactif' },
      { value: 'suspended', label: 'Suspendu' }
    ]
  };

  return (
    <AdvancedListView
      entityType="teachers"
      collectionPath={`universities/${userProfile?.universityId}/teachers`}
      title="👨‍🏫 Gestion des Enseignants"

      columns={columns}

      filters={['status']}
      availableOptions={availableOptions}
      defaultFilters={{ status: 'active' }}

      searchFields={['firstName', 'lastName', 'email', 'specialization', 'department']}
      searchPlaceholder="Rechercher par nom, email, spécialisation..."

      rowActions={rowActions}
      bulkActions={bulkActions}

      onCreateNew={() => navigate('/admin/teachers/create')}
      onRowClick={(teacher) => navigate(`/admin/teachers/${teacher.id}`)}

      pageSize={50}
      orderBy="lastName"

      enableBulkSelection={true}
      enableExport={true}
      showStats={true}
    />
  );
}
