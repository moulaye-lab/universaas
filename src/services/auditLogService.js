/**
 * auditLogService.js - Système de Logs d'Audit
 *
 * Traçabilité immuable des actions critiques:
 * - Modification de notes
 * - Création/suppression d'utilisateurs
 * - Clôture/réouverture de semestres
 * - Validation de soutenances
 * - Promotion académique
 * - Modifications de configuration
 */

import { database } from '../config/firebase';
import { ref, push, get, query, orderByChild, limitToLast } from 'firebase/database';

/**
 * Types d'actions auditables
 */
export const AUDIT_ACTIONS = {
  // Notes
  GRADE_CREATE: 'grade_create',
  GRADE_UPDATE: 'grade_update',
  GRADE_DELETE: 'grade_delete',

  // Utilisateurs
  USER_CREATE: 'user_create',
  USER_UPDATE: 'user_update',
  USER_DELETE: 'user_delete',
  USER_STATUS_CHANGE: 'user_status_change',

  // Année académique
  SEMESTER_CLOSE: 'semester_close',
  SEMESTER_REOPEN: 'semester_reopen',
  ACADEMIC_YEAR_CONFIG: 'academic_year_config',

  // Promotion
  DEFENSE_VALIDATE: 'defense_validate',
  PROMOTION_EXECUTE: 'promotion_execute',

  // Classes & Cours
  CLASS_CREATE: 'class_create',
  CLASS_UPDATE: 'class_update',
  CLASS_DELETE: 'class_delete',
  COURSE_CREATE: 'course_create',
  COURSE_UPDATE: 'course_update',
  COURSE_DELETE: 'course_delete',

  // Configuration
  SETTINGS_UPDATE: 'settings_update',
  PAYMENT_PLAN_CREATE: 'payment_plan_create',
  PAYMENT_PLAN_UPDATE: 'payment_plan_update',

  // Authentification
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout'
};

/**
 * Enregistrer un log d'audit
 * @param {string} universityId - ID université
 * @param {string} action - Type d'action (AUDIT_ACTIONS)
 * @param {string} userId - ID utilisateur qui fait l'action
 * @param {Object} details - Détails de l'action
 * @param {string} details.targetType - Type de cible (student, teacher, grade, etc.)
 * @param {string} details.targetId - ID de la cible
 * @param {string} details.targetName - Nom de la cible
 * @param {Object} details.oldValue - Ancienne valeur (pour updates)
 * @param {Object} details.newValue - Nouvelle valeur
 * @param {string} details.reason - Raison (optionnel)
 * @param {string} details.additionalInfo - Info supplémentaire
 */
export async function logAudit(universityId, action, userId, details = {}) {
  try {
    const logsRef = ref(database, `universities/${universityId}/auditLogs`);

    // Récupérer info utilisateur
    const userRef = ref(database, `users/${userId}`);
    const userSnap = await get(userRef);

    let userName = 'Utilisateur inconnu';
    let userRole = 'unknown';

    if (userSnap.exists()) {
      const userData = userSnap.val();
      userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email;
      userRole = userData.role || 'unknown';
    }

    const logEntry = {
      action,
      timestamp: Date.now(),
      date: new Date().toISOString(),
      userId,
      userName,
      userRole,
      targetType: details.targetType || null,
      targetId: details.targetId || null,
      targetName: details.targetName || null,
      oldValue: details.oldValue || null,
      newValue: details.newValue || null,
      reason: details.reason || null,
      additionalInfo: details.additionalInfo || null,
      ipAddress: null, // TODO: Récupérer IP si disponible
      userAgent: navigator?.userAgent || null
    };

    await push(logsRef, logEntry);

    console.log('📋 Audit log enregistré:', action);

    return { success: true };
  } catch (error) {
    console.error('❌ Erreur enregistrement audit log:', error);
    // Ne pas throw - les logs ne doivent pas bloquer les opérations
    return { success: false, error };
  }
}

/**
 * Récupérer logs d'audit avec filtres
 * @param {string} universityId
 * @param {Object} filters
 * @param {string} filters.action - Filtrer par type d'action
 * @param {string} filters.userId - Filtrer par utilisateur
 * @param {string} filters.targetType - Filtrer par type de cible
 * @param {number} filters.startDate - Date début (timestamp)
 * @param {number} filters.endDate - Date fin (timestamp)
 * @param {number} filters.limit - Limite de résultats (défaut: 100)
 */
export async function getAuditLogs(universityId, filters = {}) {
  try {
    const logsRef = ref(database, `universities/${universityId}/auditLogs`);

    // Récupérer tous les logs (ou les derniers N)
    let logsQuery = logsRef;
    if (filters.limit) {
      logsQuery = query(logsRef, orderByChild('timestamp'), limitToLast(filters.limit));
    }

    const snapshot = await get(logsQuery);

    if (!snapshot.exists()) {
      return [];
    }

    let logs = Object.entries(snapshot.val()).map(([id, data]) => ({
      id,
      ...data
    }));

    // Filtres côté client
    if (filters.action) {
      logs = logs.filter(log => log.action === filters.action);
    }

    if (filters.userId) {
      logs = logs.filter(log => log.userId === filters.userId);
    }

    if (filters.targetType) {
      logs = logs.filter(log => log.targetType === filters.targetType);
    }

    if (filters.startDate) {
      logs = logs.filter(log => log.timestamp >= filters.startDate);
    }

    if (filters.endDate) {
      logs = logs.filter(log => log.timestamp <= filters.endDate);
    }

    // Trier par date décroissante
    logs.sort((a, b) => b.timestamp - a.timestamp);

    return logs;
  } catch (error) {
    console.error('Erreur récupération logs:', error);
    throw error;
  }
}

/**
 * Récupérer logs pour un utilisateur spécifique
 */
export async function getUserAuditLogs(universityId, userId, limit = 50) {
  return getAuditLogs(universityId, { userId, limit });
}

/**
 * Récupérer logs pour une cible spécifique (ex: un étudiant)
 */
export async function getTargetAuditLogs(universityId, targetType, targetId, limit = 50) {
  const allLogs = await getAuditLogs(universityId, { limit: 500 });
  return allLogs.filter(log =>
    log.targetType === targetType && log.targetId === targetId
  ).slice(0, limit);
}

/**
 * Obtenir statistiques des logs
 */
export async function getAuditStats(universityId, period = 'month') {
  try {
    const now = Date.now();
    let startDate;

    switch (period) {
      case 'day':
        startDate = now - (24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = now - (30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = now - (365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = now - (30 * 24 * 60 * 60 * 1000);
    }

    const logs = await getAuditLogs(universityId, { startDate });

    const stats = {
      total: logs.length,
      byAction: {},
      byUser: {},
      byDay: {}
    };

    logs.forEach(log => {
      // Par action
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;

      // Par utilisateur
      stats.byUser[log.userName] = (stats.byUser[log.userName] || 0) + 1;

      // Par jour
      const day = new Date(log.timestamp).toISOString().split('T')[0];
      stats.byDay[day] = (stats.byDay[day] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('Erreur stats audit:', error);
    throw error;
  }
}

/**
 * Formatter une action en texte lisible
 */
export function formatAuditAction(log) {
  const actionLabels = {
    grade_create: '📝 Note créée',
    grade_update: '✏️ Note modifiée',
    grade_delete: '🗑️ Note supprimée',
    user_create: '👤 Utilisateur créé',
    user_update: '✏️ Utilisateur modifié',
    user_delete: '🗑️ Utilisateur supprimé',
    user_status_change: '🔄 Statut utilisateur modifié',
    semester_close: '🔒 Semestre clôturé',
    semester_reopen: '🔓 Semestre réouvert',
    academic_year_config: '📅 Année académique configurée',
    defense_validate: '🎓 Soutenance validée',
    promotion_execute: '🎓 Promotion exécutée',
    class_create: '🏫 Classe créée',
    class_update: '✏️ Classe modifiée',
    class_delete: '🗑️ Classe supprimée',
    course_create: '📚 Cours créé',
    course_update: '✏️ Cours modifié',
    course_delete: '🗑️ Cours supprimé',
    settings_update: '⚙️ Paramètres modifiés',
    payment_plan_create: '💳 Plan de paiement créé',
    payment_plan_update: '✏️ Plan de paiement modifié',
    login_success: '✅ Connexion réussie',
    login_failed: '❌ Échec connexion',
    logout: '👋 Déconnexion'
  };

  return actionLabels[log.action] || log.action;
}

/**
 * Obtenir couleur selon type d'action
 */
export function getAuditActionColor(action) {
  if (action.includes('create')) return 'text-green-600 bg-green-50';
  if (action.includes('update')) return 'text-blue-600 bg-blue-50';
  if (action.includes('delete')) return 'text-red-600 bg-red-50';
  if (action.includes('close')) return 'text-orange-600 bg-orange-50';
  if (action.includes('reopen')) return 'text-yellow-600 bg-yellow-50';
  if (action.includes('promotion')) return 'text-purple-600 bg-purple-50';
  if (action.includes('login')) return 'text-gray-600 bg-gray-50';
  return 'text-gray-600 bg-gray-50';
}
