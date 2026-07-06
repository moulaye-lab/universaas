/**
 * csvExporter.js - Utilitaire pour export CSV avancé
 *
 * Fonctionnalités:
 * - Export avec colonnes personnalisables
 * - Support caractères spéciaux français
 * - Format Excel-compatible (BOM UTF-8)
 * - Export filtré ou complet
 * - Nom fichier automatique avec date
 */

/**
 * Échappe les valeurs CSV (guillemets, virgules, retours ligne)
 */
function escapeCSVValue(value) {
  if (value == null) return '';

  const stringValue = String(value);

  // Si contient guillemets, virgules ou retours ligne → entourer de guillemets
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Génère le contenu CSV
 */
function generateCSVContent(headers, rows) {
  const headerRow = headers.map(escapeCSVValue).join(',');
  const dataRows = rows.map(row =>
    row.map(escapeCSVValue).join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Télécharge un fichier CSV
 */
function downloadCSV(content, filename) {
  // Ajouter BOM UTF-8 pour Excel
  const BOM = '\uFEFF';
  const csvContent = BOM + content;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Exporte des données en CSV
 *
 * @param {Array} data - Données à exporter
 * @param {Array} columns - Configuration colonnes [{key, label, format}]
 * @param {Object} options - Options d'export
 */
export function exportToCSV(data, columns, options = {}) {
  const {
    filename = 'export',
    entityType = 'data',
    includeTimestamp = true
  } = options;

  if (!data || data.length === 0) {
    alert('Aucune donnée à exporter');
    return;
  }

  // Générer en-têtes
  const headers = columns.map(col => col.label);

  // Générer lignes
  const rows = data.map(item => {
    return columns.map(col => {
      let value = item[col.key];

      // Formatage selon le type
      if (col.format === 'date' && value) {
        value = new Date(value).toLocaleDateString('fr-FR');
      } else if (col.format === 'datetime' && value) {
        value = new Date(value).toLocaleString('fr-FR');
      } else if (col.format === 'name' && item.firstName && item.lastName) {
        value = `${item.firstName} ${item.lastName}`;
      } else if (col.format === 'status' && value) {
        const statusMap = {
          active: 'Actif',
          inactive: 'Inactif',
          suspended: 'Suspendu',
          pending: 'En attente',
          archived: 'Archivé'
        };
        value = statusMap[value] || value;
      } else if (Array.isArray(value)) {
        value = value.join(', ');
      } else if (typeof value === 'boolean') {
        value = value ? 'Oui' : 'Non';
      }

      return value != null ? value : '';
    });
  });

  // Générer contenu CSV
  const csvContent = generateCSVContent(headers, rows);

  // Générer nom fichier
  const timestamp = includeTimestamp
    ? `_${new Date().toISOString().slice(0, 10)}_${Date.now()}`
    : '';
  const finalFilename = `${filename}${timestamp}.csv`;

  // Télécharger
  downloadCSV(csvContent, finalFilename);

  console.log(`✅ Export CSV réussi: ${data.length} lignes, ${columns.length} colonnes`);
}

/**
 * Exporte des étudiants en CSV
 */
export function exportStudentsToCSV(students, options = {}) {
  const columns = [
    { key: 'matricule', label: 'Matricule' },
    { key: 'firstName', label: 'Prénom' },
    { key: 'lastName', label: 'Nom' },
    { key: 'email', label: 'Email' },
    { key: 'phoneNumber', label: 'Téléphone' },
    { key: 'level', label: 'Niveau' },
    { key: 'fieldOfStudy', label: 'Filière' },
    { key: 'className', label: 'Classe' },
    { key: 'status', label: 'Statut', format: 'status' },
    { key: 'dateOfBirth', label: 'Date de naissance', format: 'date' },
    { key: 'enrollmentDate', label: 'Date d\'inscription', format: 'date' }
  ];

  exportToCSV(students, columns, {
    filename: 'etudiants',
    entityType: 'students',
    ...options
  });
}

/**
 * Exporte des enseignants en CSV
 */
export function exportTeachersToCSV(teachers, options = {}) {
  const columns = [
    { key: 'firstName', label: 'Prénom' },
    { key: 'lastName', label: 'Nom' },
    { key: 'email', label: 'Email' },
    { key: 'phoneNumber', label: 'Téléphone' },
    { key: 'department', label: 'Département' },
    { key: 'specialization', label: 'Spécialisation' },
    { key: 'status', label: 'Statut', format: 'status' },
    { key: 'createdAt', label: 'Date de création', format: 'date' }
  ];

  exportToCSV(teachers, columns, {
    filename: 'enseignants',
    entityType: 'teachers',
    ...options
  });
}

/**
 * Exporte des parents en CSV
 */
export function exportParentsToCSV(parents, options = {}) {
  const columns = [
    { key: 'displayName', label: 'Nom complet' },
    { key: 'phone', label: 'Téléphone' },
    { key: 'email', label: 'Email' },
    { key: 'childrenCount', label: 'Nombre d\'enfants' },
    { key: 'createdAt', label: 'Date de création', format: 'date' }
  ];

  exportToCSV(parents, columns, {
    filename: 'parents',
    entityType: 'parents',
    ...options
  });
}

/**
 * Exporte des cours en CSV
 */
export function exportCoursesToCSV(courses, options = {}) {
  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Nom du cours' },
    { key: 'teacherName', label: 'Enseignant' },
    { key: 'department', label: 'Département' },
    { key: 'level', label: 'Niveau' },
    { key: 'credits', label: 'Crédits' },
    { key: 'semester', label: 'Semestre' },
    { key: 'status', label: 'Statut', format: 'status' }
  ];

  exportToCSV(courses, columns, {
    filename: 'cours',
    entityType: 'courses',
    ...options
  });
}

/**
 * Exporte des notes en CSV
 */
export function exportGradesToCSV(grades, options = {}) {
  const columns = [
    { key: 'studentName', label: 'Étudiant' },
    { key: 'courseName', label: 'Cours' },
    { key: 'title', label: 'Évaluation' },
    { key: 'gradeType', label: 'Type' },
    { key: 'grade', label: 'Note' },
    { key: 'maxGrade', label: 'Note max' },
    { key: 'coefficient', label: 'Coefficient' },
    { key: 'date', label: 'Date', format: 'date' },
    { key: 'teacherName', label: 'Enseignant' }
  ];

  exportToCSV(grades, columns, {
    filename: 'notes',
    entityType: 'grades',
    ...options
  });
}
