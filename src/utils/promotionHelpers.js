/**
 * promotionHelpers.js - Helpers pour Promotion Académique
 *
 * Fonctions utilitaires:
 * - Calcul moyennes annuelles
 * - Suggestions de décision
 * - Mapping niveau suivant
 */

/**
 * Calculer moyenne annuelle PONDÉRÉE (S1 + S2) / 2
 * Prend en compte:
 * - Coefficients des matières
 * - Types de contrôles (Devoirs, Examens, Projets, Participation)
 *
 * @param {Object} student - Données étudiant
 * @param {Array} allGrades - Toutes les notes de l'université
 * @returns {Object} - {semester1Avg, semester2Avg, yearAvg (MGA)}
 */
export function calculateYearAverage(student, allGrades) {
  const studentGrades = allGrades.filter(g => g.studentId === student.id);

  if (studentGrades.length === 0) {
    return { semester1Avg: null, semester2Avg: null, yearAvg: null };
  }

  // Grouper par semestre et cours
  const gradesBySemester = {
    1: {},
    2: {}
  };

  studentGrades.forEach(grade => {
    let semester = grade.semester || 1;

    // Normaliser le semestre (peut être string "1", "2" ou number)
    if (typeof semester === 'string') {
      semester = parseInt(semester, 10);
    }

    // S'assurer que le semestre est 1 ou 2
    if (semester !== 1 && semester !== 2) {
      semester = 1;
    }

    const courseId = grade.courseId;

    if (!gradesBySemester[semester]) {
      gradesBySemester[semester] = {};
    }

    if (!gradesBySemester[semester][courseId]) {
      gradesBySemester[semester][courseId] = {
        grades: [],
        coefficient: grade.coefficient || 1,
        courseName: grade.courseName
      };
    }

    // Support des deux structures: ancienne (value, type) et nouvelle (grade, maxGrade, gradeType)
    const gradeValue = grade.grade ?? grade.value ?? 0;
    const maxValue = grade.maxGrade ?? 20;
    const normalizedValue = (gradeValue / maxValue) * 20;

    gradesBySemester[semester][courseId].grades.push({
      value: normalizedValue,
      type: grade.gradeType || grade.type || 'exam'
    });
  });

  // Calculer moyenne PONDÉRÉE par semestre
  const calculateSemesterAvg = (semesterGrades) => {
    let totalWeightedScore = 0;
    let totalCoefficient = 0;

    Object.values(semesterGrades).forEach(courseData => {
      const { grades, coefficient } = courseData;

      if (grades.length === 0) return;

      // Calculer moyenne du cours (toutes les notes)
      const courseAvg = grades.reduce((sum, g) => {
        const val = g.value ?? 0;
        return sum + (isNaN(val) ? 0 : val);
      }, 0) / grades.length;

      // Vérifier que courseAvg est valide
      if (isNaN(courseAvg)) return;

      // Pondérer par coefficient de la matière
      totalWeightedScore += courseAvg * coefficient;
      totalCoefficient += coefficient;
    });

    if (totalCoefficient === 0) return null;

    // Moyenne pondérée = somme(note × coef) / somme(coef)
    const avg = totalWeightedScore / totalCoefficient;
    return isNaN(avg) ? null : parseFloat(avg.toFixed(2));
  };

  const semester1Avg = calculateSemesterAvg(gradesBySemester[1]);
  const semester2Avg = calculateSemesterAvg(gradesBySemester[2]);

  // MGA (Moyenne Générale Annuelle) = (S1 + S2) / 2
  let yearAvg = null;
  if (semester1Avg !== null && semester2Avg !== null && !isNaN(semester1Avg) && !isNaN(semester2Avg)) {
    yearAvg = parseFloat(((semester1Avg + semester2Avg) / 2).toFixed(2));
  } else if (semester1Avg !== null && !isNaN(semester1Avg)) {
    yearAvg = semester1Avg;
  } else if (semester2Avg !== null && !isNaN(semester2Avg)) {
    yearAvg = semester2Avg;
  }

  return {
    semester1Avg: isNaN(semester1Avg) ? null : semester1Avg,
    semester2Avg: isNaN(semester2Avg) ? null : semester2Avg,
    yearAvg: isNaN(yearAvg) ? null : yearAvg
  };
}

/**
 * Calculer détails des moyennes par matière (pour bulletins)
 * @param {Object} student - Données étudiant
 * @param {Array} allGrades - Toutes les notes
 * @returns {Object} - Détails par semestre et par matière
 */
export function calculateDetailedAverages(student, allGrades) {
  const studentGrades = allGrades.filter(g => g.studentId === student.id);

  const details = {
    semester1: [],
    semester2: []
  };

  // Grouper par semestre et cours
  const gradesBySemester = {
    1: {},
    2: {}
  };

  studentGrades.forEach(grade => {
    const semester = grade.semester || 1;
    const courseId = grade.courseId;

    if (!gradesBySemester[semester][courseId]) {
      gradesBySemester[semester][courseId] = {
        courseId,
        courseName: grade.courseName,
        coefficient: grade.coefficient || 1,
        grades: []
      };
    }

    // Support des deux structures: ancienne (value, type) et nouvelle (grade, maxGrade, gradeType)
    const gradeValue = grade.grade ?? grade.value ?? 0;
    const maxValue = grade.maxGrade ?? 20;
    const normalizedValue = (gradeValue / maxValue) * 20;

    gradesBySemester[semester][courseId].grades.push({
      value: normalizedValue,
      type: grade.gradeType || grade.type || 'exam',
      date: grade.date,
      createdAt: grade.createdAt
    });
  });

  // Calculer moyennes par matière pour chaque semestre
  [1, 2].forEach(sem => {
    Object.values(gradesBySemester[sem]).forEach(courseData => {
      const { courseName, coefficient, grades } = courseData;

      if (grades.length === 0) return;

      // Moyenne du cours
      const courseAvg = grades.reduce((sum, g) => sum + g.value, 0) / grades.length;

      // Grouper les notes par type
      const byType = {};
      grades.forEach(g => {
        if (!byType[g.type]) byType[g.type] = [];
        byType[g.type].push(g.value);
      });

      const detailsKey = sem === 1 ? 'semester1' : 'semester2';
      details[detailsKey].push({
        courseName,
        coefficient,
        average: parseFloat(courseAvg.toFixed(2)),
        gradeCount: grades.length,
        gradesByType: byType,
        weightedScore: parseFloat((courseAvg * coefficient).toFixed(2))
      });
    });
  });

  return details;
}

/**
 * Suggérer décision selon critères académiques
 * @param {Object} student - Données étudiant
 * @param {number} yearAvg - Moyenne annuelle
 * @returns {string} - 'promoted' | 'redoublant' | 'diplome'
 */
export function suggestDecision(student, yearAvg) {
  // Pas de moyenne calculée
  if (yearAvg === null) {
    return 'redoublant';
  }

  const level = student.level?.toUpperCase() || '';

  // L3 ou M2 avec soutenance validée → Diplômé
  if ((level === 'L3' || level === 'M2') && student.defenseValidated === true) {
    return 'diplome';
  }

  // Moyenne >= 10 → Admis (passage)
  if (yearAvg >= 10) {
    // L3/M2 sans soutenance validée → Redoublant
    if (level === 'L3' || level === 'M2') {
      return 'redoublant';
    }
    return 'promoted';
  }

  // Moyenne < 10 → Redoublant
  return 'redoublant';
}

/**
 * Obtenir le niveau suivant
 * @param {string} currentLevel - Niveau actuel (L1, L2, L3, M1, M2)
 * @returns {string|null} - Niveau suivant ou null si diplômé
 */
export function getNextLevel(currentLevel) {
  const levelMap = {
    'L1': 'L2',
    'L2': 'L3',
    'L3': 'M1', // Ou diplômé si pas de master
    'M1': 'M2',
    'M2': null  // Diplômé
  };

  return levelMap[currentLevel?.toUpperCase()] || null;
}

/**
 * Obtenir les classes disponibles pour un niveau
 * @param {Array} allClasses - Toutes les classes
 * @param {string} level - Niveau recherché
 * @returns {Array} - Classes filtrées
 */
export function getClassesForLevel(allClasses, level) {
  return allClasses.filter(cls =>
    cls.level?.toUpperCase() === level?.toUpperCase()
  );
}

/**
 * Valider si un étudiant peut être promu
 * @param {Object} student - Données étudiant
 * @param {number} yearAvg - Moyenne annuelle
 * @returns {Object} - {canPromote: boolean, reason: string}
 */
export function validatePromotion(student, yearAvg) {
  if (yearAvg === null) {
    return { canPromote: false, reason: 'Aucune note enregistrée' };
  }

  if (yearAvg < 10) {
    return { canPromote: false, reason: 'Moyenne insuffisante (< 10)' };
  }

  const level = student.level?.toUpperCase();
  if ((level === 'L3' || level === 'M2') && !student.defenseValidated) {
    return { canPromote: false, reason: 'Soutenance non validée' };
  }

  return { canPromote: true, reason: 'Admis' };
}

/**
 * Formatter une décision en texte lisible
 * @param {string} decision - Code décision
 * @returns {Object} - {label, color, icon}
 */
export function formatDecision(decision) {
  const decisions = {
    promoted: {
      label: 'Admis - Promu',
      color: 'bg-green-100 text-green-700 border-green-300',
      icon: '✅'
    },
    redoublant: {
      label: 'Redoublant',
      color: 'bg-orange-100 text-orange-700 border-orange-300',
      icon: '🔄'
    },
    diplome: {
      label: 'Diplômé',
      color: 'bg-blue-100 text-blue-700 border-blue-300',
      icon: '🎓'
    },
    changeFiliere: {
      label: 'Changement de filière',
      color: 'bg-purple-100 text-purple-700 border-purple-300',
      icon: '🔀'
    },
    inactive: {
      label: 'Inactif',
      color: 'bg-gray-100 text-gray-700 border-gray-300',
      icon: '⏸️'
    }
  };

  return decisions[decision] || {
    label: 'Non défini',
    color: 'bg-gray-100 text-gray-600',
    icon: '❓'
  };
}

/**
 * Calculer statistiques de promotion
 * @param {Array} decisions - Liste des décisions
 * @returns {Object} - Stats {promoted, redoublant, diplome, changeFiliere, inactive, total}
 */
export function calculatePromotionStats(decisions) {
  const stats = {
    promoted: 0,
    redoublant: 0,
    diplome: 0,
    changeFiliere: 0,
    inactive: 0,
    total: decisions.length
  };

  decisions.forEach(d => {
    if (stats[d.decision] !== undefined) {
      stats[d.decision]++;
    }
  });

  return stats;
}

/**
 * Vérifier si l'année académique est clôturée (S2 terminé)
 * @param {Date} currentDate - Date actuelle
 * @returns {boolean}
 */
export function isAcademicYearClosed(currentDate = new Date()) {
  const month = currentDate.getMonth() + 1; // 1-12
  // Clôture typique : après juin (mois 6)
  return month >= 6 && month <= 9;
}

/**
 * Obtenir l'année académique courante
 * @param {Date} date - Date de référence
 * @returns {string} - Format "2025-2026"
 */
export function getCurrentAcademicYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  // Si après septembre, nouvelle année académique
  if (month >= 9) {
    return `${year}-${year + 1}`;
  }

  return `${year - 1}-${year}`;
}
