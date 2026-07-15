/**
 * academicYearService.js - Gestion Année Académique et Semestres
 *
 * Fonctionnalités:
 * - Définir les dates de début/fin de semestre
 * - Clôturer un semestre (verrouillage des notes)
 * - Vérifier si on peut faire la promotion
 * - Historique des années académiques
 */

import { database } from '../config/firebase';
import { ref, get, set, update } from 'firebase/database';
import { logAudit, AUDIT_ACTIONS } from './auditLogService';

/**
 * Structure année académique:
 * {
 *   year: "2025-2026",
 *   startDate: timestamp,
 *   endDate: timestamp,
 *   status: "active" | "closed",
 *   semester1: {
 *     startDate: timestamp (ex: 01/09/2025),
 *     endDate: timestamp (ex: 31/01/2026),
 *     status: "not_started" | "in_progress" | "closed",
 *     closedAt: timestamp,
 *     closedBy: uid
 *   },
 *   semester2: {
 *     startDate: timestamp (ex: 01/02/2026),
 *     endDate: timestamp (ex: 30/06/2026),
 *     status: "not_started" | "in_progress" | "closed",
 *     closedAt: timestamp,
 *     closedBy: uid
 *   }
 * }
 */

/**
 * Obtenir l'année académique active
 */
export async function getActiveAcademicYear(universityId) {
  try {
    const yearRef = ref(database, `universities/${universityId}/academicYear`);
    const snapshot = await get(yearRef);

    if (!snapshot.exists()) {
      // Créer année par défaut si n'existe pas
      return await createDefaultAcademicYear(universityId);
    }

    return snapshot.val();
  } catch (error) {
    console.error('Erreur chargement année académique:', error);
    throw error;
  }
}

/**
 * Créer année académique par défaut
 */
async function createDefaultAcademicYear(universityId) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const nextYear = currentYear + 1;

  // Semestre 1: Sept → Jan
  const s1Start = new Date(currentYear, 8, 1).getTime(); // 1 sept
  const s1End = new Date(nextYear, 0, 31).getTime(); // 31 jan

  // Semestre 2: Fév → Juin
  const s2Start = new Date(nextYear, 1, 1).getTime(); // 1 fév
  const s2End = new Date(nextYear, 5, 30).getTime(); // 30 juin

  const defaultYear = {
    year: `${currentYear}-${nextYear}`,
    startDate: s1Start,
    endDate: s2End,
    status: 'active',
    semester1: {
      startDate: s1Start,
      endDate: s1End,
      status: now.getTime() < s1Start ? 'not_started' : (now.getTime() > s1End ? 'closed' : 'in_progress'),
      closedAt: null,
      closedBy: null
    },
    semester2: {
      startDate: s2Start,
      endDate: s2End,
      status: now.getTime() < s2Start ? 'not_started' : (now.getTime() > s2End ? 'closed' : 'in_progress'),
      closedAt: null,
      closedBy: null
    },
    createdAt: Date.now()
  };

  const yearRef = ref(database, `universities/${universityId}/academicYear`);
  await set(yearRef, defaultYear);

  return defaultYear;
}

/**
 * Configurer les dates de l'année académique
 */
export async function configureAcademicYear(universityId, config, adminId) {
  try {
    const yearRef = ref(database, `universities/${universityId}/academicYear`);

    const academicYear = {
      year: config.year, // "2025-2026"
      startDate: config.startDate,
      endDate: config.endDate,
      status: 'active',
      semester1: {
        startDate: config.semester1StartDate,
        endDate: config.semester1EndDate,
        status: 'not_started',
        closedAt: null,
        closedBy: null
      },
      semester2: {
        startDate: config.semester2StartDate,
        endDate: config.semester2EndDate,
        status: 'not_started',
        closedAt: null,
        closedBy: null
      },
      updatedAt: Date.now(),
      updatedBy: adminId
    };

    await set(yearRef, academicYear);

    // Log d'audit
    await logAudit(universityId, AUDIT_ACTIONS.ACADEMIC_YEAR_CONFIG, adminId, {
      targetType: 'academic_year',
      targetId: config.year,
      targetName: `Année ${config.year}`,
      newValue: {
        year: config.year,
        semester1: `${new Date(config.semester1StartDate).toLocaleDateString('fr-FR')} - ${new Date(config.semester1EndDate).toLocaleDateString('fr-FR')}`,
        semester2: `${new Date(config.semester2StartDate).toLocaleDateString('fr-FR')} - ${new Date(config.semester2EndDate).toLocaleDateString('fr-FR')}`
      },
      additionalInfo: `Configuration de l'année académique ${config.year}`
    });

    return { success: true, academicYear };
  } catch (error) {
    console.error('Erreur configuration année:', error);
    throw error;
  }
}

/**
 * Clôturer un semestre (verrouillage des notes)
 */
export async function closeSemester(universityId, semesterNumber, adminId) {
  try {
    if (semesterNumber !== 1 && semesterNumber !== 2) {
      throw new Error('Semestre invalide (doit être 1 ou 2)');
    }

    const yearRef = ref(database, `universities/${universityId}/academicYear`);
    const snapshot = await get(yearRef);

    if (!snapshot.exists()) {
      throw new Error('Année académique non configurée');
    }

    const academicYear = snapshot.val();
    const semesterKey = `semester${semesterNumber}`;

    // Vérifier que le semestre n'est pas déjà clôturé
    if (academicYear[semesterKey].status === 'closed') {
      throw new Error(`Semestre ${semesterNumber} déjà clôturé`);
    }

    // Clôturer
    await update(yearRef, {
      [`${semesterKey}/status`]: 'closed',
      [`${semesterKey}/closedAt`]: Date.now(),
      [`${semesterKey}/closedBy`]: adminId
    });

    // Log d'audit
    await logAudit(universityId, AUDIT_ACTIONS.SEMESTER_CLOSE, adminId, {
      targetType: 'semester',
      targetId: `${academicYear.year}-S${semesterNumber}`,
      targetName: `Semestre ${semesterNumber} - ${academicYear.year}`,
      newValue: { status: 'closed' },
      additionalInfo: `Semestre ${semesterNumber} clôturé - Notes verrouillées`
    });

    console.log(`✅ Semestre ${semesterNumber} clôturé`);

    return { success: true };
  } catch (error) {
    console.error('Erreur clôture semestre:', error);
    throw error;
  }
}

/**
 * Rouvrir un semestre (déverrouillage - cas exceptionnel)
 */
export async function reopenSemester(universityId, semesterNumber, adminId, reason) {
  try {
    const yearRef = ref(database, `universities/${universityId}/academicYear`);
    const semesterKey = `semester${semesterNumber}`;

    await update(yearRef, {
      [`${semesterKey}/status`]: 'in_progress',
      [`${semesterKey}/reopenedAt`]: Date.now(),
      [`${semesterKey}/reopenedBy`]: adminId,
      [`${semesterKey}/reopenReason`]: reason
    });

    // Log d'audit
    const yearRef2 = ref(database, `universities/${universityId}/academicYear`);
    const snapshot2 = await get(yearRef2);
    const academicYear = snapshot2.val();

    await logAudit(universityId, AUDIT_ACTIONS.SEMESTER_REOPEN, adminId, {
      targetType: 'semester',
      targetId: `${academicYear.year}-S${semesterNumber}`,
      targetName: `Semestre ${semesterNumber} - ${academicYear.year}`,
      newValue: { status: 'in_progress' },
      reason: reason,
      additionalInfo: `Semestre ${semesterNumber} réouvert - Raison: ${reason}`
    });

    console.log(`🔓 Semestre ${semesterNumber} réouvert`);

    return { success: true };
  } catch (error) {
    console.error('Erreur réouverture semestre:', error);
    throw error;
  }
}

/**
 * Vérifier si on peut faire la promotion
 * (Les 2 semestres doivent être clôturés)
 */
export async function canPromoteStudents(universityId) {
  try {
    const academicYear = await getActiveAcademicYear(universityId);

    const s1Closed = academicYear.semester1.status === 'closed';
    const s2Closed = academicYear.semester2.status === 'closed';

    return {
      canPromote: s1Closed && s2Closed,
      semester1Closed: s1Closed,
      semester2Closed: s2Closed,
      message: s1Closed && s2Closed
        ? 'Les deux semestres sont clôturés. La promotion peut être lancée.'
        : `Semestre${!s1Closed ? ' 1' : ''}${!s1Closed && !s2Closed ? ' et' : ''}${!s2Closed ? ' 2' : ''} non clôturé${(!s1Closed && !s2Closed) ? 's' : ''}.`
    };
  } catch (error) {
    console.error('Erreur vérification promotion:', error);
    throw error;
  }
}

/**
 * Clôturer l'année académique complète
 */
export async function closeAcademicYear(universityId, adminId) {
  try {
    const yearRef = ref(database, `universities/${universityId}/academicYear`);
    const snapshot = await get(yearRef);

    if (!snapshot.exists()) {
      throw new Error('Année académique non trouvée');
    }

    const academicYear = snapshot.val();

    // Vérifier que les 2 semestres sont clôturés
    if (academicYear.semester1.status !== 'closed' || academicYear.semester2.status !== 'closed') {
      throw new Error('Les deux semestres doivent être clôturés avant de clôturer l\'année');
    }

    // Archiver l'année actuelle
    const archiveRef = ref(database, `universities/${universityId}/academicYearHistory/${academicYear.year}`);
    await set(archiveRef, {
      ...academicYear,
      closedAt: Date.now(),
      closedBy: adminId
    });

    // Marquer comme closed
    await update(yearRef, {
      status: 'closed',
      closedAt: Date.now(),
      closedBy: adminId
    });

    console.log(`✅ Année académique ${academicYear.year} clôturée et archivée`);

    return { success: true };
  } catch (error) {
    console.error('Erreur clôture année:', error);
    throw error;
  }
}

/**
 * Obtenir le statut actuel (pour affichage)
 */
export async function getAcademicStatus(universityId) {
  try {
    const academicYear = await getActiveAcademicYear(universityId);
    const now = Date.now();

    let currentPeriod = 'Année non commencée';
    if (now >= academicYear.semester1.startDate && now <= academicYear.semester1.endDate) {
      currentPeriod = 'Semestre 1 en cours';
    } else if (now >= academicYear.semester2.startDate && now <= academicYear.semester2.endDate) {
      currentPeriod = 'Semestre 2 en cours';
    } else if (now > academicYear.semester2.endDate) {
      currentPeriod = 'Année terminée';
    }

    return {
      year: academicYear.year,
      currentPeriod,
      semester1: {
        status: academicYear.semester1.status,
        startDate: new Date(academicYear.semester1.startDate).toLocaleDateString('fr-FR'),
        endDate: new Date(academicYear.semester1.endDate).toLocaleDateString('fr-FR'),
        isClosed: academicYear.semester1.status === 'closed'
      },
      semester2: {
        status: academicYear.semester2.status,
        startDate: new Date(academicYear.semester2.startDate).toLocaleDateString('fr-FR'),
        endDate: new Date(academicYear.semester2.endDate).toLocaleDateString('fr-FR'),
        isClosed: academicYear.semester2.status === 'closed'
      },
      canPromote: academicYear.semester1.status === 'closed' && academicYear.semester2.status === 'closed'
    };
  } catch (error) {
    console.error('Erreur statut académique:', error);
    throw error;
  }
}
