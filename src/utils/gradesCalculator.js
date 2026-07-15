/**
 * gradesCalculator.js - Utilitaires de calcul de moyennes
 *
 * Fonctions:
 * - calculateCourseAverage: Moyenne d'un cours
 * - calculateOverallAverage: Moyenne générale
 * - getMention: Déterminer la mention
 * - cacheStudentAverages: Mettre en cache dans Firebase
 */

import { ref, get, set } from 'firebase/database';

/**
 * Calcule la moyenne d'un étudiant pour un cours
 * @param {Array} grades - Notes du cours (filtrées)
 * @returns {number|null} - Moyenne sur 20, ou null si pas de notes
 */
export function calculateCourseAverage(grades) {
  if (!grades || grades.length === 0) return null;

  let totalWeighted = 0;
  let totalCoefficient = 0;

  grades.forEach(g => {
    // Support des deux structures: ancienne (value) et nouvelle (grade, maxGrade)
    const gradeValue = g.grade ?? g.value ?? 0;
    const maxValue = g.maxGrade ?? 20;

    // Normaliser à /20
    const normalizedGrade = (gradeValue / maxValue) * 20;

    if (!isNaN(normalizedGrade)) {
      totalWeighted += normalizedGrade * g.coefficient;
      totalCoefficient += g.coefficient;
    }
  });

  if (totalCoefficient === 0) return null;
  const avg = totalWeighted / totalCoefficient;
  return isNaN(avg) ? null : avg;
}

/**
 * Calcule la moyenne générale d'un étudiant
 * @param {Array} allGrades - Toutes les notes de l'étudiant
 * @returns {Object} - { overall, byCourse }
 */
export function calculateOverallAverage(allGrades) {
  if (!allGrades || allGrades.length === 0) {
    return { overall: null, byCourse: {} };
  }

  // Grouper par cours
  const byCourse = {};
  allGrades.forEach(grade => {
    if (!byCourse[grade.courseId]) {
      byCourse[grade.courseId] = {
        courseName: grade.courseName,
        grades: []
      };
    }
    byCourse[grade.courseId].grades.push(grade);
  });

  // Calculer moyenne par cours
  const courseAverages = {};
  Object.entries(byCourse).forEach(([courseId, data]) => {
    courseAverages[courseId] = {
      courseName: data.courseName,
      average: calculateCourseAverage(data.grades),
      gradesCount: data.grades.length,
      coefficient: data.grades[0]?.coefficient || 1 // Récupérer coefficient
    };
  });

  // Moyenne générale PONDÉRÉE (tenir compte des coefficients)
  let totalWeighted = 0;
  let totalCoefficient = 0;

  Object.values(courseAverages).forEach(course => {
    if (course.average !== null && !isNaN(course.average)) {
      totalWeighted += course.average * course.coefficient;
      totalCoefficient += course.coefficient;
    }
  });

  const overall = totalCoefficient > 0
    ? totalWeighted / totalCoefficient
    : null;

  return { overall, byCourse: courseAverages };
}

/**
 * Détermine la mention selon la moyenne
 * @param {number} average - Moyenne sur 20
 * @returns {string|null} - Mention ou null
 */
export function getMention(average) {
  if (!average || isNaN(average)) return null;
  if (average >= 16) return 'Très Bien';
  if (average >= 14) return 'Bien';
  if (average >= 12) return 'Assez Bien';
  if (average >= 10) return 'Passable';
  return 'Insuffisant';
}

/**
 * Détermine la couleur selon la moyenne
 * @param {number} average - Moyenne sur 20
 * @returns {string} - Classe CSS Tailwind
 */
export function getAverageColor(average) {
  if (!average || isNaN(average)) return 'text-gray-500';
  if (average >= 16) return 'text-green-600';
  if (average >= 14) return 'text-blue-600';
  if (average >= 12) return 'text-yellow-600';
  if (average >= 10) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Détermine le statut de la note (réussite/échec)
 * @param {number} grade - Note normalisée sur 20
 * @returns {Object} - { status, color, icon }
 */
export function getGradeStatus(grade) {
  if (!grade || isNaN(grade)) {
    return { status: 'N/A', color: 'gray', icon: '❓' };
  }

  if (grade >= 10) {
    return { status: 'Réussite', color: 'green', icon: '✅' };
  } else {
    return { status: 'Échec', color: 'red', icon: '❌' };
  }
}

/**
 * Cache les moyennes dans Firebase pour performance
 * @param {string} studentId - ID de l'étudiant
 * @param {string} universityId - ID de l'université
 * @param {Object} database - Instance Firebase Database
 * @returns {Promise<Object>} - { overall, courses }
 */
export async function cacheStudentAverages(studentId, universityId, database) {
  try {
    const gradesRef = ref(database, `universities/${universityId}/grades`);
    const gradesSnap = await get(gradesRef);

    if (!gradesSnap.exists()) {
      return { overall: null, courses: {} };
    }

    const studentGrades = Object.values(gradesSnap.val())
      .filter(g => g.studentId === studentId);

    const { overall, byCourse } = calculateOverallAverage(studentGrades);

    const cacheRef = ref(database, `universities/${universityId}/studentAverages/${studentId}`);
    await set(cacheRef, {
      overall,
      courses: byCourse,
      lastUpdated: Date.now()
    });

    return { overall, courses: byCourse };
  } catch (error) {
    console.error('Error caching averages:', error);
    return { overall: null, courses: {} };
  }
}

/**
 * Charge les moyennes depuis le cache (plus rapide)
 * @param {string} studentId - ID de l'étudiant
 * @param {string} universityId - ID de l'université
 * @param {Object} database - Instance Firebase Database
 * @returns {Promise<Object|null>} - Moyennes en cache ou null
 */
export async function loadCachedAverages(studentId, universityId, database) {
  try {
    const cacheRef = ref(database, `universities/${universityId}/studentAverages/${studentId}`);
    const cacheSnap = await get(cacheRef);

    if (cacheSnap.exists()) {
      const cached = cacheSnap.val();

      // Vérifier si le cache est récent (< 1 heure)
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      if (cached.lastUpdated && cached.lastUpdated > oneHourAgo) {
        return cached;
      }
    }

    return null;
  } catch (error) {
    console.error('Error loading cached averages:', error);
    return null;
  }
}

/**
 * Calcule les statistiques globales d'un étudiant
 * @param {Array} grades - Toutes les notes
 * @returns {Object} - Statistiques complètes
 */
export function calculateStatistics(grades) {
  if (!grades || grades.length === 0) {
    return {
      total: 0,
      coursesCount: 0,
      bestGrade: null,
      worstGrade: null,
      successRate: 0,
      averageCoefficient: 0
    };
  }

  // Normaliser toutes les notes sur 20
  const normalizedGrades = grades.map(g => ({
    ...g,
    normalized: (g.grade / g.maxGrade) * 20
  }));

  // Meilleure et pire note
  const sortedGrades = [...normalizedGrades].sort((a, b) => b.normalized - a.normalized);
  const bestGrade = sortedGrades[0];
  const worstGrade = sortedGrades[sortedGrades.length - 1];

  // Taux de réussite (notes >= 10)
  const passedGrades = normalizedGrades.filter(g => g.normalized >= 10);
  const successRate = (passedGrades.length / grades.length) * 100;

  // Coefficient moyen
  const avgCoefficient = grades.reduce((sum, g) => sum + g.coefficient, 0) / grades.length;

  // Nombre de cours uniques
  const uniqueCourses = new Set(grades.map(g => g.courseId));

  return {
    total: grades.length,
    coursesCount: uniqueCourses.size,
    bestGrade: {
      value: bestGrade.normalized,
      courseName: bestGrade.courseName,
      title: bestGrade.title
    },
    worstGrade: {
      value: worstGrade.normalized,
      courseName: worstGrade.courseName,
      title: worstGrade.title
    },
    successRate: Math.round(successRate),
    averageCoefficient: Math.round(avgCoefficient * 10) / 10
  };
}

/**
 * Filtre les notes par période
 * @param {Array} grades - Notes à filtrer
 * @param {string} period - 'semester1', 'semester2', 'year', 'last30days'
 * @returns {Array} - Notes filtrées
 */
export function filterByPeriod(grades, period) {
  if (!grades || grades.length === 0) return [];

  const now = Date.now();
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

  switch (period) {
    case 'semester1':
      return grades.filter(g => g.semester === 1);
    case 'semester2':
      return grades.filter(g => g.semester === 2);
    case 'year':
      return grades; // Toutes les notes
    case 'last30days':
      return grades.filter(g => g.date && g.date > thirtyDaysAgo);
    default:
      return grades;
  }
}

/**
 * Exporte les notes au format CSV
 * @param {Array} grades - Notes à exporter
 * @param {string} filename - Nom du fichier
 */
export function exportToCSV(grades, filename = 'notes') {
  if (!grades || grades.length === 0) {
    alert('Aucune note à exporter');
    return;
  }

  // En-têtes
  const headers = [
    'Date',
    'Cours',
    'Évaluation',
    'Note',
    'Note/20',
    'Coefficient',
    'Type',
    'Enseignant'
  ];

  // Données
  const rows = grades.map(g => [
    new Date(g.date).toLocaleDateString('fr-FR'),
    g.courseName,
    g.title,
    `${g.grade}/${g.maxGrade}`,
    ((g.grade / g.maxGrade) * 20).toFixed(2),
    g.coefficient,
    g.gradeType,
    g.teacherName || 'N/A'
  ]);

  // Construire CSV
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Télécharger
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${Date.now()}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
