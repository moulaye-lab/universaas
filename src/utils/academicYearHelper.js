/**
 * academicYearHelper.js - Utilitaires pour la gestion des années académiques
 *
 * Fonctions:
 * - getCurrentAcademicYear(): Retourne l'année académique actuelle
 * - getAcademicYears(): Génère la liste des années (passées, actuelle, futures)
 * - formatAcademicYear(): Formate une année (ex: 2025 → "2025-2026")
 * - parseAcademicYear(): Parse une année académique
 */

/**
 * Retourne l'année académique actuelle
 * Logique: Si on est entre septembre et décembre, année actuelle - année suivante
 *          Sinon, année précédente - année actuelle
 */
export function getCurrentAcademicYear() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = janvier, 8 = septembre

  // Si on est entre septembre (8) et décembre (11)
  if (currentMonth >= 8) {
    return `${currentYear}-${currentYear + 1}`;
  } else {
    return `${currentYear - 1}-${currentYear}`;
  }
}

/**
 * Génère la liste des années académiques
 * @param {number} yearsBack - Nombre d'années passées (défaut: 5)
 * @param {number} yearsForward - Nombre d'années futures (défaut: 2)
 * @returns {Array<string>} - Liste des années académiques
 */
export function getAcademicYears(yearsBack = 5, yearsForward = 2) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  // Déterminer l'année de référence
  const referenceYear = currentMonth >= 8 ? currentYear : currentYear - 1;

  const years = [];

  // Années passées
  for (let i = yearsBack; i > 0; i--) {
    const year = referenceYear - i;
    years.push(`${year}-${year + 1}`);
  }

  // Année actuelle
  years.push(`${referenceYear}-${referenceYear + 1}`);

  // Années futures
  for (let i = 1; i <= yearsForward; i++) {
    const year = referenceYear + i;
    years.push(`${year}-${year + 1}`);
  }

  return years;
}

/**
 * Formate un nombre en année académique
 * @param {number} year - Année de départ
 * @returns {string} - Année académique formatée
 */
export function formatAcademicYear(year) {
  return `${year}-${year + 1}`;
}

/**
 * Parse une année académique et retourne l'année de début
 * @param {string} academicYear - Année académique (ex: "2025-2026")
 * @returns {number} - Année de début
 */
export function parseAcademicYear(academicYear) {
  if (!academicYear || typeof academicYear !== 'string') return null;

  const parts = academicYear.split('-');
  if (parts.length !== 2) return null;

  const startYear = parseInt(parts[0], 10);
  return isNaN(startYear) ? null : startYear;
}

/**
 * Vérifie si une année académique est valide
 * @param {string} academicYear - Année à valider
 * @returns {boolean}
 */
export function isValidAcademicYear(academicYear) {
  if (!academicYear || typeof academicYear !== 'string') return false;

  const regex = /^\d{4}-\d{4}$/;
  if (!regex.test(academicYear)) return false;

  const [startYear, endYear] = academicYear.split('-').map(y => parseInt(y, 10));

  // Vérifier que endYear = startYear + 1
  return endYear === startYear + 1;
}

/**
 * Compare deux années académiques
 * @param {string} year1
 * @param {string} year2
 * @returns {number} - -1 si year1 < year2, 0 si égales, 1 si year1 > year2
 */
export function compareAcademicYears(year1, year2) {
  const start1 = parseAcademicYear(year1);
  const start2 = parseAcademicYear(year2);

  if (start1 === null || start2 === null) return 0;

  return start1 < start2 ? -1 : start1 > start2 ? 1 : 0;
}

/**
 * Retourne le libellé complet d'une année académique
 * @param {string} academicYear - Ex: "2025-2026"
 * @returns {string} - Ex: "Année 2025-2026"
 */
export function getAcademicYearLabel(academicYear) {
  if (!isValidAcademicYear(academicYear)) return 'Année invalide';

  const current = getCurrentAcademicYear();

  if (academicYear === current) {
    return `${academicYear} (En cours)`;
  }

  const startYear = parseAcademicYear(academicYear);
  const currentStartYear = parseAcademicYear(current);

  if (startYear < currentStartYear) {
    return `${academicYear} (Passée)`;
  }

  return `${academicYear} (Future)`;
}
