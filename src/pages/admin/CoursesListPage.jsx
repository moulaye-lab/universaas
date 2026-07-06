/**
 * CoursesListPage.jsx - Liste des cours (Version refonte avec AdvancedListView)
 *
 * Fonctionnalités:
 * - Pagination 50 cours/page
 * - Filtres : département, niveau, semestre, statut
 * - Recherche : nom, code, enseignant
 * - Tri par colonnes
 * - Actions : voir détails, modifier, supprimer
 * - Export CSV
 */

import { useNavigate } from 'react-router-dom';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { ref, remove } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import AdvancedListView from '../../components/listing/AdvancedListView';
import useDynamicFilterOptions from '../../hooks/useDynamicFilterOptions';
import { getAcademicYears, getCurrentAcademicYear } from '../../utils/academicYearHelper';

export default function CoursesListPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  // Charger les options de filtres dynamiquement depuis Firebase
  const { departments, fieldOfStudies } = useDynamicFilterOptions(userProfile?.universityId);

  // Configuration des colonnes
  const columns = [
    {
      key: 'code',
      label: 'Code',
      sortable: true
    },
    {
      key: 'name',
      label: 'Nom du cours',
      sortable: true
    },
    {
      key: 'teacherName',
      label: 'Enseignant',
      sortable: false,
      render: (course) => course.teacherName || 'Non assigné'
    },
    {
      key: 'department',
      label: 'Département',
      sortable: true,
      render: (course) => course.department || 'Non spécifié'
    },
    {
      key: 'level',
      label: 'Niveau',
      sortable: true,
      render: (course) => course.level || 'Tous niveaux'
    },
    {
      key: 'credits',
      label: 'Crédits ECTS',
      sortable: true,
      render: (course) => (
        <span className="font-semibold text-blue-600">
          {course.credits || 0} ECTS
        </span>
      )
    },
    {
      key: 'semester',
      label: 'Semestre',
      sortable: true,
      render: (course) => course.semester ? `S${course.semester}` : 'N/A'
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
      onClick: (course) => {
        navigate(`/admin/courses/${course.id}`);
      }
    },
    {
      label: 'Modifier',
      icon: Edit,
      onClick: (course) => {
        navigate(`/admin/courses/${course.id}`);
      }
    },
    {
      label: 'Supprimer',
      icon: Trash2,
      onClick: async (course) => {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer le cours "${course.name}" ?\n\nCette action est irréversible.`)) {
          return;
        }

        try {
          await remove(ref(database, `universities/${userProfile.universityId}/courses/${course.id}`));
          alert('Cours supprimé avec succès');
          window.location.reload();
        } catch (err) {
          console.error('Error deleting course:', err);
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
    academicYears: getAcademicYears(5, 2),
    departments: departments,
    fieldOfStudies: fieldOfStudies,
    levels: ['L1', 'L2', 'L3', 'M1', 'M2', 'D1', 'D2', 'D3'],
    semesters: [
      { value: '1', label: 'Semestre 1' },
      { value: '2', label: 'Semestre 2' }
    ],
    statuses: [
      { value: 'active', label: 'Actif' },
      { value: 'inactive', label: 'Inactif' },
      { value: 'archived', label: 'Archivé' }
    ]
  };

  return (
    <AdvancedListView
      entityType="courses"
      collectionPath={`universities/${userProfile?.universityId}/courses`}
      title="📚 Gestion des Cours"

      columns={columns}

      filters={['academicYear', 'department', 'fieldOfStudy', 'level', 'semester', 'status']}
      availableOptions={availableOptions}
      defaultFilters={{
        status: 'active',
        academicYear: getCurrentAcademicYear()
      }}

      searchFields={['name', 'code', 'teacherName', 'department']}
      searchPlaceholder="Rechercher par nom, code, enseignant..."

      rowActions={rowActions}
      bulkActions={bulkActions}

      onCreateNew={() => navigate('/admin/courses/create')}
      onRowClick={(course) => navigate(`/admin/courses/${course.id}`)}

      pageSize={50}
      orderBy="name"

      enableBulkSelection={true}
      enableExport={true}
      showStats={true}
    />
  );
}
