/**
 * GradesListPage.jsx - Liste des notes (Admin)
 *
 * Fonctionnalités:
 * - Pagination 50 notes/page
 * - Filtres : année académique, classe, cours, étudiant, type
 * - Recherche : nom étudiant, cours, titre évaluation
 * - Tri par colonnes
 * - Actions : modifier, supprimer
 * - Stats : moyenne générale, taux de réussite
 * - Export CSV
 */

import { useNavigate } from 'react-router-dom';
import { Edit, Trash2, TrendingUp, Award } from 'lucide-react';
import { ref, remove, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import AdvancedListView from '../../components/listing/AdvancedListView';
import { getAcademicYears, getCurrentAcademicYear } from '../../utils/academicYearHelper';
import { useState, useEffect } from 'react';

export default function GradesListPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Charger les options de filtres depuis Firebase
  useEffect(() => {
    const loadOptions = async () => {
      if (!userProfile?.universityId) return;

      try {
        setLoadingOptions(true);
        const univId = userProfile.universityId;

        // Charger classes
        const classesRef = ref(database, `universities/${univId}/classes`);
        const classesSnap = await get(classesRef);
        if (classesSnap.exists()) {
          const classesData = Object.entries(classesSnap.val())
            .map(([id, data]) => ({ value: id, label: data.name }))
            .sort((a, b) => a.label.localeCompare(b.label));
          setClasses(classesData);
        }

        // Charger cours
        const coursesRef = ref(database, `universities/${univId}/courses`);
        const coursesSnap = await get(coursesRef);
        if (coursesSnap.exists()) {
          const coursesData = Object.entries(coursesSnap.val())
            .map(([id, data]) => ({ value: id, label: `${data.code} - ${data.name}` }))
            .sort((a, b) => a.label.localeCompare(b.label));
          setCourses(coursesData);
        }

        // Charger étudiants (pour filtre)
        const studentsRef = ref(database, `universities/${univId}/students`);
        const studentsSnap = await get(studentsRef);
        if (studentsSnap.exists()) {
          const studentsData = Object.entries(studentsSnap.val())
            .map(([id, data]) => ({
              value: id,
              label: `${data.firstName} ${data.lastName} (${data.matricule})`
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
          setStudents(studentsData);
        }
      } catch (err) {
        console.error('Error loading filter options:', err);
      } finally {
        setLoadingOptions(false);
      }
    };

    loadOptions();
  }, [userProfile?.universityId]);

  // Configuration des colonnes
  const columns = [
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (grade) => new Date(grade.date).toLocaleDateString('fr-FR')
    },
    {
      key: 'studentName',
      label: 'Étudiant',
      sortable: true
    },
    {
      key: 'className',
      label: 'Classe',
      sortable: true,
      render: (grade) => grade.className || 'N/A'
    },
    {
      key: 'courseName',
      label: 'Cours',
      sortable: true
    },
    {
      key: 'title',
      label: 'Évaluation',
      sortable: false
    },
    {
      key: 'gradeType',
      label: 'Type',
      sortable: true,
      render: (grade) => {
        const types = {
          exam: { label: 'Examen', color: 'bg-purple-100 text-purple-700' },
          homework: { label: 'Devoir', color: 'bg-blue-100 text-blue-700' },
          continuous_assessment: { label: 'CC', color: 'bg-green-100 text-green-700' },
          project: { label: 'Projet', color: 'bg-orange-100 text-orange-700' },
          oral: { label: 'Oral', color: 'bg-pink-100 text-pink-700' },
          practical: { label: 'TP', color: 'bg-teal-100 text-teal-700' }
        };
        const type = types[grade.gradeType] || types.exam;
        return (
          <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${type.color}`}>
            {type.label}
          </span>
        );
      }
    },
    {
      key: 'grade',
      label: 'Note',
      sortable: true,
      render: (grade) => {
        const normalized = (grade.grade / grade.maxGrade) * 20;
        const color = normalized >= 10 ? 'text-green-600' : 'text-red-600';
        return (
          <div>
            <span className={`font-bold ${color}`}>
              {grade.grade}/{grade.maxGrade}
            </span>
            {grade.maxGrade !== 20 && (
              <span className="text-xs text-gray-500 ml-1">
                ({normalized.toFixed(1)}/20)
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'coefficient',
      label: 'Coef.',
      sortable: true,
      render: (grade) => (
        <span className="font-semibold text-gray-700">
          {grade.coefficient}
        </span>
      )
    },
    {
      key: 'teacherName',
      label: 'Enseignant',
      sortable: false,
      render: (grade) => grade.teacherName || 'N/A'
    }
  ];

  // Actions individuelles
  const rowActions = [
    {
      label: 'Modifier',
      icon: Edit,
      onClick: (grade) => {
        navigate(`/admin/grades/${grade.id}/edit`);
      }
    },
    {
      label: 'Supprimer',
      icon: Trash2,
      onClick: async (grade) => {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer cette note ?\n\nÉtudiant: ${grade.studentName}\nCours: ${grade.courseName}\nNote: ${grade.grade}/${grade.maxGrade}\n\nCette action est irréversible.`)) {
          return;
        }

        try {
          await remove(ref(database, `universities/${userProfile.universityId}/grades/${grade.id}`));
          alert('Note supprimée avec succès');
          window.location.reload();
        } catch (err) {
          console.error('Error deleting grade:', err);
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
      onClick: async (selectedIds) => {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedIds.length} note(s) ?\n\nCette action est irréversible.`)) {
          return;
        }

        try {
          const promises = selectedIds.map(id =>
            remove(ref(database, `universities/${userProfile.universityId}/grades/${id}`))
          );
          await Promise.all(promises);
          alert(`${selectedIds.length} note(s) supprimée(s) avec succès`);
          window.location.reload();
        } catch (err) {
          console.error('Error deleting grades:', err);
          alert('Erreur lors de la suppression: ' + err.message);
        }
      }
    }
  ];

  // Options de filtres
  const availableOptions = {
    academicYears: getAcademicYears(5, 2),
    classes: classes,
    courses: courses,
    students: students,
    gradeTypes: [
      { value: 'exam', label: 'Examen' },
      { value: 'homework', label: 'Devoir' },
      { value: 'continuous_assessment', label: 'Contrôle continu' },
      { value: 'project', label: 'Projet' },
      { value: 'oral', label: 'Oral' },
      { value: 'practical', label: 'TP' }
    ]
  };

  // Statistiques personnalisées
  const customStats = (data) => {
    if (!data || data.length === 0) return null;

    // Calculer moyenne générale (normalisée sur 20)
    const normalizedGrades = data.map(g => (g.grade / g.maxGrade) * 20);
    const average = normalizedGrades.reduce((sum, g) => sum + g, 0) / normalizedGrades.length;

    // Taux de réussite (>= 10/20)
    const passedCount = normalizedGrades.filter(g => g >= 10).length;
    const successRate = (passedCount / data.length) * 100;

    // Meilleure et pire note
    const sortedGrades = [...normalizedGrades].sort((a, b) => b - a);
    const bestGrade = sortedGrades[0];
    const worstGrade = sortedGrades[sortedGrades.length - 1];

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <p className="text-sm font-semibold text-gray-600">Moyenne générale</p>
          </div>
          <p className={`text-3xl font-black ${average >= 10 ? 'text-green-600' : 'text-red-600'}`}>
            {average.toFixed(2)}/20
          </p>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5 text-green-600" />
            <p className="text-sm font-semibold text-gray-600">Taux de réussite</p>
          </div>
          <p className="text-3xl font-black text-green-600">
            {successRate.toFixed(0)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {passedCount}/{data.length} notes ≥ 10
          </p>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🏆</span>
            <p className="text-sm font-semibold text-gray-600">Meilleure note</p>
          </div>
          <p className="text-3xl font-black text-green-600">
            {bestGrade.toFixed(2)}/20
          </p>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">📉</span>
            <p className="text-sm font-semibold text-gray-600">Note la plus basse</p>
          </div>
          <p className="text-3xl font-black text-red-600">
            {worstGrade.toFixed(2)}/20
          </p>
        </div>
      </div>
    );
  };

  if (loadingOptions) {
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
    <AdvancedListView
      entityType="grades"
      collectionPath={`universities/${userProfile?.universityId}/grades`}
      title="📊 Gestion des Notes"

      columns={columns}

      filters={['academicYear', 'classId', 'courseId', 'studentId', 'gradeType']}
      availableOptions={availableOptions}
      defaultFilters={{
        academicYear: getCurrentAcademicYear()
      }}

      searchFields={['studentName', 'courseName', 'title', 'teacherName']}
      searchPlaceholder="Rechercher par étudiant, cours, évaluation..."

      rowActions={rowActions}
      bulkActions={bulkActions}

      onCreateNew={() => navigate('/teacher/grades/input')}
      onRowClick={(grade) => navigate(`/admin/grades/${grade.id}/edit`)}

      pageSize={50}
      orderBy="date"
      sortDirection="desc"

      enableBulkSelection={true}
      enableExport={true}
      showStats={true}
      customStats={customStats}
    />
  );
}
