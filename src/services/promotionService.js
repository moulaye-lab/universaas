/**
 * promotionService.js - Service Promotion Académique
 *
 * Gestion du passage en classe supérieure:
 * - Calcul moyennes et suggestions
 * - Validation décisions
 * - Exécution promotion en masse
 * - Historique académique
 */

import { database } from '../config/firebase';
import { ref, get, update, push, set } from 'firebase/database';
import {
  calculateYearAverage,
  suggestDecision,
  getNextLevel,
  getCurrentAcademicYear
} from '../utils/promotionHelpers';
import { createNotification } from './notificationService';
import { logAudit, AUDIT_ACTIONS } from './auditLogService';

/**
 * Charger données pour promotion
 * @param {string} universityId
 * @returns {Promise<Object>} - {students, grades, classes}
 */
export async function loadPromotionData(universityId) {
  try {
    const [studentsSnap, gradesSnap, classesSnap] = await Promise.all([
      get(ref(database, `universities/${universityId}/students`)),
      get(ref(database, `universities/${universityId}/grades`)),
      get(ref(database, `universities/${universityId}/classes`))
    ]);

    const students = studentsSnap.exists()
      ? Object.entries(studentsSnap.val()).map(([id, data]) => ({ id, ...data }))
      : [];

    const grades = gradesSnap.exists()
      ? Object.values(gradesSnap.val())
      : [];

    const classes = classesSnap.exists()
      ? Object.entries(classesSnap.val()).map(([id, data]) => ({ id, ...data }))
      : [];

    // Filtrer étudiants actifs uniquement
    const activeStudents = students.filter(s => s.status !== 'inactive' && s.status !== 'graduated');

    return { students: activeStudents, grades, classes };
  } catch (error) {
    console.error('Erreur chargement données promotion:', error);
    throw error;
  }
}

/**
 * Préparer suggestions de promotion pour tous les étudiants
 * @param {Array} students
 * @param {Array} grades
 * @returns {Array} - Étudiants avec moyennes et suggestions
 */
export function preparePromotionSuggestions(students, grades) {
  return students.map(student => {
    const { semester1Avg, semester2Avg, yearAvg } = calculateYearAverage(student, grades);
    const suggestedDecision = suggestDecision(student, yearAvg);

    return {
      ...student,
      semester1Avg,
      semester2Avg,
      yearAvg,
      suggestedDecision,
      decision: suggestedDecision, // Décision initiale = suggestion
      newLevel: suggestedDecision === 'promoted' ? getNextLevel(student.level) : null,
      newClassId: null,
      justification: null
    };
  });
}

/**
 * Valider une soutenance (L3/M2)
 * @param {string} universityId
 * @param {string} studentId
 * @param {Object} defenseData - {validated, date, grade}
 */
export async function validateDefense(universityId, studentId, defenseData) {
  try {
    const studentRef = ref(database, `universities/${universityId}/students/${studentId}`);

    await update(studentRef, {
      defenseValidated: defenseData.validated,
      defenseDate: defenseData.date || Date.now(),
      defenseGrade: defenseData.grade || null
    });

    // Log d'audit - Récupérer nom étudiant
    const studentSnap = await get(studentRef);
    const student = studentSnap.val();

    await logAudit(universityId, AUDIT_ACTIONS.DEFENSE_VALIDATE, studentId, {
      targetType: 'student',
      targetId: studentId,
      targetName: `${student.firstName} ${student.lastName}`,
      newValue: {
        validated: defenseData.validated,
        grade: defenseData.grade
      },
      additionalInfo: `Soutenance ${defenseData.validated ? 'validée' : 'non validée'}${defenseData.grade ? ` - Note: ${defenseData.grade}/20` : ''}`
    });

    return { success: true };
  } catch (error) {
    console.error('Erreur validation soutenance:', error);
    throw error;
  }
}

/**
 * Exécuter la promotion académique
 * @param {string} universityId
 * @param {Array} decisions - Liste décisions {studentId, decision, newLevel, newClassId, justification}
 * @param {string} adminId - UID admin
 */
export async function executePromotion(universityId, decisions, adminId) {
  try {
    const academicYear = getCurrentAcademicYear();
    const promotionId = push(ref(database, `universities/${universityId}/academic_promotions`)).key;

    // Statistiques
    const stats = {
      promoted: decisions.filter(d => d.decision === 'promoted').length,
      redoublant: decisions.filter(d => d.decision === 'redoublant').length,
      diplome: decisions.filter(d => d.decision === 'diplome').length,
      changeFiliere: decisions.filter(d => d.decision === 'changeFiliere').length,
      inactive: decisions.filter(d => d.decision === 'inactive').length,
      total: decisions.length
    };

    // Enregistrer promotion
    const promotionData = {
      id: promotionId,
      academicYear,
      createdAt: Date.now(),
      createdBy: adminId,
      status: 'completed',
      totalStudents: decisions.length,
      stats,
      decisions: {}
    };

    // Appliquer décisions individuelles
    const updates = {};

    for (const decision of decisions) {
      const studentId = decision.studentId;
      const studentPath = `universities/${universityId}/students/${studentId}`;

      // Préparer historique
      const historyEntry = {
        year: academicYear,
        semester1Avg: decision.semester1Avg,
        semester2Avg: decision.semester2Avg,
        yearAvg: decision.yearAvg,
        level: decision.oldLevel,
        className: decision.oldClassName,
        classId: decision.oldClassId,
        decision: decision.decision,
        promotedTo: decision.newClassName || null,
        promotedToClassId: decision.newClassId || null,
        justification: decision.justification || null,
        decidedBy: adminId,
        decidedAt: Date.now()
      };

      // Charger historique existant
      const studentRef = ref(database, studentPath);
      const studentSnap = await get(studentRef);
      const currentHistory = studentSnap.val()?.academicHistory || [];

      // Mises à jour selon décision
      const studentUpdates = {
        [`${studentPath}/academicHistory`]: [...currentHistory, historyEntry]
      };

      switch (decision.decision) {
        case 'promoted':
          studentUpdates[`${studentPath}/level`] = decision.newLevel;
          studentUpdates[`${studentPath}/classId`] = decision.newClassId;
          studentUpdates[`${studentPath}/className`] = decision.newClassName;
          break;

        case 'diplome':
          studentUpdates[`${studentPath}/status`] = 'graduated';
          studentUpdates[`${studentPath}/graduationDate`] = Date.now();
          break;

        case 'inactive':
          studentUpdates[`${studentPath}/status`] = 'inactive';
          studentUpdates[`${studentPath}/inactiveDate`] = Date.now();
          studentUpdates[`${studentPath}/inactiveReason`] = decision.justification;
          break;

        case 'changeFiliere':
          studentUpdates[`${studentPath}/level`] = decision.newLevel;
          studentUpdates[`${studentPath}/classId`] = decision.newClassId;
          studentUpdates[`${studentPath}/className`] = decision.newClassName;
          break;

        case 'redoublant':
          // Pas de changement de niveau/classe
          break;
      }

      Object.assign(updates, studentUpdates);

      // Ajouter à l'enregistrement promotion
      promotionData.decisions[studentId] = {
        studentName: `${decision.firstName} ${decision.lastName}`,
        oldLevel: decision.oldLevel,
        newLevel: decision.newLevel,
        oldClass: decision.oldClassName,
        newClass: decision.newClassName,
        decision: decision.decision,
        semester1Avg: decision.semester1Avg,
        semester2Avg: decision.semester2Avg,
        yearAvg: decision.yearAvg,
        defenseValidated: decision.defenseValidated || false,
        justification: decision.justification,
        decidedAt: Date.now()
      };

      // Créer notification pour étudiant
      await createNotification(universityId, studentId, {
        type: 'promotion',
        title: '📋 Décision de promotion',
        message: getPromotionMessage(decision),
        relatedId: promotionId,
        priority: 'high'
      });
    }

    // Sauvegarder promotion
    updates[`universities/${universityId}/academic_promotions/${promotionId}`] = promotionData;

    // Appliquer toutes les mises à jour
    await update(ref(database), updates);

    // Log d'audit global
    await logAudit(universityId, AUDIT_ACTIONS.PROMOTION_EXECUTE, adminId, {
      targetType: 'promotion',
      targetId: promotionId,
      targetName: `Promotion ${academicYear}`,
      newValue: stats,
      additionalInfo: `${stats.total} étudiants: ${stats.promoted} promus, ${stats.redoublant} redoublants, ${stats.diplome} diplômés`
    });

    console.log(`✅ Promotion ${academicYear} exécutée: ${stats.total} étudiants`);

    return { success: true, promotionId, stats };
  } catch (error) {
    console.error('Erreur exécution promotion:', error);
    throw error;
  }
}

/**
 * Générer message notification selon décision
 */
function getPromotionMessage(decision) {
  const messages = {
    promoted: `Félicitations ! Vous êtes admis et promu en ${decision.newLevel}. Classe: ${decision.newClassName}`,
    redoublant: `Vous redoublez votre année en ${decision.oldLevel}. Moyenne annuelle: ${decision.yearAvg}/20`,
    diplome: `🎉 Félicitations ! Vous avez obtenu votre diplôme ${decision.oldLevel} !`,
    changeFiliere: `Changement de filière validé. Nouvelle classe: ${decision.newClassName}`,
    inactive: `Votre inscription a été désactivée. Raison: ${decision.justification || 'Non spécifiée'}`
  };

  return messages[decision.decision] || 'Décision de promotion enregistrée';
}

/**
 * Récupérer historique des promotions
 * @param {string} universityId
 * @returns {Promise<Array>}
 */
export async function getPromotionHistory(universityId) {
  try {
    const promotionsRef = ref(database, `universities/${universityId}/academic_promotions`);
    const snapshot = await get(promotionsRef);

    if (!snapshot.exists()) {
      return [];
    }

    const promotions = Object.entries(snapshot.val()).map(([id, data]) => ({
      id,
      ...data
    }));

    return promotions.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Erreur chargement historique promotions:', error);
    throw error;
  }
}

/**
 * Annuler une promotion (dans les 7 jours)
 * @param {string} universityId
 * @param {string} promotionId
 */
export async function cancelPromotion(universityId, promotionId) {
  try {
    const promotionRef = ref(database, `universities/${universityId}/academic_promotions/${promotionId}`);
    const snapshot = await get(promotionRef);

    if (!snapshot.exists()) {
      throw new Error('Promotion introuvable');
    }

    const promotion = snapshot.val();
    const daysSince = (Date.now() - promotion.createdAt) / (1000 * 60 * 60 * 24);

    if (daysSince > 7) {
      throw new Error('Impossible d\'annuler une promotion de plus de 7 jours');
    }

    // Réverser toutes les modifications
    // TODO: Implémenter la logique de rollback complète

    await update(promotionRef, {
      status: 'cancelled',
      cancelledAt: Date.now()
    });

    return { success: true };
  } catch (error) {
    console.error('Erreur annulation promotion:', error);
    throw error;
  }
}
