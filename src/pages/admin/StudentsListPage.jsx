/**
 * StudentsListPage.jsx - Liste des étudiants (Version refonte avec AdvancedListView)
 *
 * Fonctionnalités:
 * - Pagination 50 étudiants/page
 * - Filtres hiérarchiques : année, filière, niveau, classe, statut
 * - Recherche : nom, prénom, matricule, email
 * - Tri par colonnes
 * - Actions : voir détails, modifier, supprimer
 * - Sélection multiple + export CSV
 */

import { useNavigate } from 'react-router-dom';
import { Eye, Edit, Trash2, UserPlus } from 'lucide-react';
import { ref, remove } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import AdvancedListView from '../../components/listing/AdvancedListView';
import { getAcademicYears, getCurrentAcademicYear } from '../../utils/academicYearHelper';
import useDynamicFilterOptions from '../../hooks/useDynamicFilterOptions';

export default function StudentsListPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  // Charger les options de filtres dynamiquement depuis Firebase
  const { departments, fieldOfStudies, loading: optionsLoading } = useDynamicFilterOptions(userProfile?.universityId);

  // Configuration des colonnes
  const columns = [
    {
      key: 'matricule',
      label: 'Matricule',
      sortable: true
    },
    {
      key: 'name',
      label: 'Nom complet',
      sortable: true,
      render: (student) => `${student.firstName} ${student.lastName}`
    },
    {
      key: 'academicYear',
      label: 'Année',
      sortable: true,
      render: (student) => student.academicYear || 'N/A'
    },
    {
      key: 'level',
      label: 'Niveau',
      sortable: true
    },
    {
      key: 'fieldOfStudy',
      label: 'Filière',
      sortable: true
    },
    {
      key: 'className',
      label: 'Classe',
      sortable: false,
      render: (student) => student.className || 'Non assigné'
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      format: 'status'
    }
  ];

  // Actions individuelles par étudiant
  const rowActions = [
    {
      label: 'Voir détails',
      icon: Eye,
      onClick: (student) => {
        navigate(`/admin/students/${student.id}/edit`);
      }
    },
    {
      label: 'Modifier',
      icon: Edit,
      onClick: (student) => {
        navigate(`/admin/students/${student.id}/edit`);
      }
    },
    {
      label: 'Créer parent',
      icon: UserPlus,
      onClick: (student) => {
        navigate(`/admin/students/${student.id}/create-parent`);
      }
    },
    {
      label: 'Supprimer',
      icon: Trash2,
      onClick: async (student) => {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer l'étudiant ${student.firstName} ${student.lastName} ?\n\nCette action est irréversible.`)) {
          return;
        }

        try {
          await remove(ref(database, `universities/${userProfile.universityId}/students/${student.id}`));
          alert('Étudiant supprimé avec succès');
          window.location.reload(); // Recharger pour mettre à jour la liste
        } catch (err) {
          console.error('Error deleting student:', err);
          alert('Erreur lors de la suppression: ' + err.message);
        }
      }
    }
  ];

  // Actions bulk (sélection multiple)
  const bulkActions = [
    {
      label: 'Supprimer la sélection',
      icon: Trash2,
      danger: true,
      onClick: async () => {
        alert('Fonction de suppression multiple à implémenter');
      }
    }
  ];

  // Options de filtres disponibles
  const availableOptions = {
    academicYears: getAcademicYears(5, 2), // 5 ans passés, 2 ans futurs
    departments: departments, // Depuis Firebase
    fieldOfStudies: fieldOfStudies, // Depuis Firebase (domaines uniques des classes)
    levels: ['L1', 'L2', 'L3', 'M1', 'M2', 'D1', 'D2', 'D3'],
    statuses: [
      { value: 'active', label: 'Actif' },
      { value: 'inactive', label: 'Inactif' },
      { value: 'suspended', label: 'Suspendu' }
    ]
  };

  return (
    <AdvancedListView
      entityType="students"
      collectionPath={`universities/${userProfile?.universityId}/students`}
      title="🎓 Gestion des Étudiants"

      columns={columns}

      filters={['academicYear', 'department', 'fieldOfStudy', 'level', 'status']}
      availableOptions={availableOptions}
      defaultFilters={{
        status: 'active'
        // academicYear par défaut désactivé pour voir tous les étudiants (anciens + nouveaux)
        // Tu peux le réactiver plus tard: academicYear: getCurrentAcademicYear()
      }}

      searchFields={['firstName', 'lastName', 'matricule', 'email']}
      searchPlaceholder="Rechercher par nom, matricule, email..."

      rowActions={rowActions}
      bulkActions={bulkActions}

      onCreateNew={() => navigate('/admin/students/create')}
      onRowClick={(student) => navigate(`/admin/students/${student.id}/edit`)}

      pageSize={50}
      orderBy="lastName"

      enableBulkSelection={true}
      enableExport={true}
      showStats={true}
    />
  );
}
