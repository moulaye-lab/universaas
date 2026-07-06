/**
 * auditLogger.js - Audit trail complet pour traçabilité
 *
 * Fonctionnalités:
 * - Enregistrer toutes les actions sensibles
 * - Tracer les modifications de données
 * - Détecter les comportements suspects
 */

import { ref, push, set } from 'firebase/database';
import { database } from '../config/firebase';

/**
 * Types d'actions auditées
 */
export const AUDIT_ACTIONS = {
  // Classes
  CREATE_CLASS: 'CREATE_CLASS',
  UPDATE_CLASS: 'UPDATE_CLASS',
  DELETE_CLASS: 'DELETE_CLASS',
  ADD_COURSE_TO_CLASS: 'ADD_COURSE_TO_CLASS',
  REMOVE_COURSE_FROM_CLASS: 'REMOVE_COURSE_FROM_CLASS',

  // Étudiants
  CREATE_STUDENT: 'CREATE_STUDENT',
  UPDATE_STUDENT: 'UPDATE_STUDENT',
  DELETE_STUDENT: 'DELETE_STUDENT',
  CHANGE_STUDENT_CLASS: 'CHANGE_STUDENT_CLASS',
  BULK_ENROLL_STUDENTS: 'BULK_ENROLL_STUDENTS',

  // Enseignants
  CREATE_TEACHER: 'CREATE_TEACHER',
  UPDATE_TEACHER: 'UPDATE_TEACHER',
  DELETE_TEACHER: 'DELETE_TEACHER',
  ASSIGN_COURSE_TO_TEACHER: 'ASSIGN_COURSE_TO_TEACHER',

  // Cours
  CREATE_COURSE: 'CREATE_COURSE',
  UPDATE_COURSE: 'UPDATE_COURSE',
  DELETE_COURSE: 'DELETE_COURSE',

  // Notes
  CREATE_GRADE: 'CREATE_GRADE',
  UPDATE_GRADE: 'UPDATE_GRADE',
  DELETE_GRADE: 'DELETE_GRADE',

  // Sécurité
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Système
  EXPORT_DATA: 'EXPORT_DATA',
  IMPORT_DATA: 'IMPORT_DATA',
  BACKUP_CREATED: 'BACKUP_CREATED'
};

/**
 * Niveaux de criticité
 */
export const SEVERITY_LEVELS = {
  LOW: 'LOW',           // Actions normales
  MEDIUM: 'MEDIUM',     // Actions importantes
  HIGH: 'HIGH',         // Actions sensibles
  CRITICAL: 'CRITICAL'  // Actions de sécurité
};

class AuditLogger {
  /**
   * Enregistrer une action d'audit
   */
  async log({
    action,
    severity = SEVERITY_LEVELS.MEDIUM,
    universityId,
    userId,
    userName,
    targetId = null,
    targetName = null,
    details = {},
    ipAddress = null,
    userAgent = null
  }) {
    try {
      // Validation
      if (!action || !universityId || !userId) {
        console.error('[AUDIT] Missing required fields');
        return;
      }

      const auditEntry = {
        action,
        severity,
        universityId,
        userId,
        userName: userName || 'Unknown',
        targetId,
        targetName,
        details: this.sanitizeDetails(details),
        timestamp: Date.now(),
        date: new Date().toISOString(),
        ipAddress: ipAddress || await this.getClientIP(),
        userAgent: userAgent || navigator.userAgent,
        sessionId: this.getSessionId()
      };

      // Enregistrer dans Firebase
      const auditRef = ref(database, `universities/${universityId}/audit`);
      const newAuditRef = push(auditRef);
      await set(newAuditRef, auditEntry);

      // Log côté client pour debug (seulement en dev)
      if (import.meta.env.DEV) {
        console.log('[AUDIT]', action, auditEntry);
      }

      // Alertes pour actions critiques
      if (severity === SEVERITY_LEVELS.CRITICAL) {
        await this.sendCriticalAlert(auditEntry);
      }

      return newAuditRef.key;
    } catch (error) {
      console.error('[AUDIT] Error logging:', error);
      // Ne pas bloquer l'application si audit échoue
    }
  }

  /**
   * Sanitize details pour éviter de logger des données sensibles
   */
  sanitizeDetails(details) {
    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'credential'];
    const sanitized = { ...details };

    for (const key in sanitized) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Obtenir l'IP du client (approximatif)
   */
  async getClientIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json', {
        timeout: 2000
      });
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Obtenir/créer un session ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('audit_session_id');

    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('audit_session_id', sessionId);
    }

    return sessionId;
  }

  /**
   * Envoyer une alerte pour action critique
   */
  async sendCriticalAlert(auditEntry) {
    // TODO: Implémenter notification (email, Slack, etc.)
    console.warn('[CRITICAL AUDIT]', auditEntry);

    // Exemple: envoyer à un webhook
    // try {
    //   await fetch('/api/critical-alerts', {
    //     method: 'POST',
    //     body: JSON.stringify(auditEntry)
    //   });
    // } catch (error) {
    //   console.error('Failed to send critical alert:', error);
    // }
  }

  /**
   * Rechercher dans les logs d'audit
   */
  async search(universityId, filters = {}) {
    // TODO: Implémenter recherche
    // Nécessite indexation Firebase ou service externe
  }
}

// Instance globale
const auditLogger = new AuditLogger();

/**
 * Hook React pour audit logging
 */
export function useAuditLog() {
  return {
    log: (params) => auditLogger.log(params)
  };
}

/**
 * Helper: Log une création d'entité
 */
export async function logCreate(entityType, entityData, universityId, userId, userName) {
  return auditLogger.log({
    action: `CREATE_${entityType.toUpperCase()}`,
    severity: SEVERITY_LEVELS.MEDIUM,
    universityId,
    userId,
    userName,
    targetId: entityData.id,
    targetName: entityData.name || entityData.firstName + ' ' + entityData.lastName,
    details: {
      entityType,
      data: entityData
    }
  });
}

/**
 * Helper: Log une modification d'entité
 */
export async function logUpdate(entityType, entityId, entityName, changes, universityId, userId, userName) {
  return auditLogger.log({
    action: `UPDATE_${entityType.toUpperCase()}`,
    severity: SEVERITY_LEVELS.MEDIUM,
    universityId,
    userId,
    userName,
    targetId: entityId,
    targetName: entityName,
    details: {
      entityType,
      changes
    }
  });
}

/**
 * Helper: Log une suppression d'entité
 */
export async function logDelete(entityType, entityId, entityName, universityId, userId, userName) {
  return auditLogger.log({
    action: `DELETE_${entityType.toUpperCase()}`,
    severity: SEVERITY_LEVELS.HIGH,
    universityId,
    userId,
    userName,
    targetId: entityId,
    targetName: entityName,
    details: {
      entityType
    }
  });
}

/**
 * Helper: Log événement de sécurité
 */
export async function logSecurityEvent(event, details, universityId, userId) {
  return auditLogger.log({
    action: event,
    severity: SEVERITY_LEVELS.CRITICAL,
    universityId,
    userId,
    userName: 'System',
    details
  });
}

export default auditLogger;
