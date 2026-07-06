/**
 * rateLimiter.js - Rate limiting côté client
 *
 * Fonctionnalités:
 * - Limiter le nombre de requêtes par minute
 * - Prévenir les attaques DoS basiques
 * - Afficher des messages d'avertissement
 */

class RateLimiter {
  constructor() {
    this.requests = new Map(); // key: action, value: array of timestamps
  }

  /**
   * Vérifie si une action est autorisée
   * @param {string} action - Nom de l'action (ex: 'createStudent')
   * @param {number} maxRequests - Nombre max de requêtes
   * @param {number} windowMs - Fenêtre de temps en millisecondes
   * @returns {boolean} - true si autorisé, false sinon
   */
  checkLimit(action, maxRequests = 10, windowMs = 60000) {
    const now = Date.now();
    const actionRequests = this.requests.get(action) || [];

    // Nettoyer les requêtes anciennes
    const validRequests = actionRequests.filter(
      timestamp => now - timestamp < windowMs
    );

    // Vérifier la limite
    if (validRequests.length >= maxRequests) {
      const oldestRequest = Math.min(...validRequests);
      const timeToWait = windowMs - (now - oldestRequest);
      const secondsToWait = Math.ceil(timeToWait / 1000);

      throw new Error(
        `Trop de requêtes. Veuillez patienter ${secondsToWait} seconde(s).`
      );
    }

    // Ajouter la nouvelle requête
    validRequests.push(now);
    this.requests.set(action, validRequests);

    return true;
  }

  /**
   * Réinitialiser les compteurs pour une action
   */
  reset(action) {
    this.requests.delete(action);
  }

  /**
   * Réinitialiser tous les compteurs
   */
  resetAll() {
    this.requests.clear();
  }

  /**
   * Obtenir le nombre de requêtes restantes
   */
  getRemainingRequests(action, maxRequests = 10, windowMs = 60000) {
    const now = Date.now();
    const actionRequests = this.requests.get(action) || [];

    const validRequests = actionRequests.filter(
      timestamp => now - timestamp < windowMs
    );

    return Math.max(0, maxRequests - validRequests.length);
  }
}

// Instance globale
const rateLimiter = new RateLimiter();

/**
 * Hook React pour rate limiting
 */
export function useRateLimit() {
  return {
    checkLimit: (action, maxRequests, windowMs) =>
      rateLimiter.checkLimit(action, maxRequests, windowMs),

    getRemainingRequests: (action, maxRequests, windowMs) =>
      rateLimiter.getRemainingRequests(action, maxRequests, windowMs),

    reset: (action) => rateLimiter.reset(action),

    resetAll: () => rateLimiter.resetAll()
  };
}

/**
 * Décorateur pour limiter une fonction
 */
export function withRateLimit(fn, action, maxRequests = 10, windowMs = 60000) {
  return async function (...args) {
    rateLimiter.checkLimit(action, maxRequests, windowMs);
    return fn(...args);
  };
}

/**
 * Limites recommandées par action
 */
export const RATE_LIMITS = {
  CREATE_STUDENT: { maxRequests: 5, windowMs: 60000 },      // 5 par minute
  CREATE_CLASS: { maxRequests: 10, windowMs: 60000 },       // 10 par minute
  CREATE_COURSE: { maxRequests: 10, windowMs: 60000 },      // 10 par minute
  EDIT_STUDENT: { maxRequests: 20, windowMs: 60000 },       // 20 par minute
  BULK_ENROLL: { maxRequests: 3, windowMs: 60000 },         // 3 par minute
  LOGIN_ATTEMPT: { maxRequests: 5, windowMs: 300000 },      // 5 par 5 minutes
  PASSWORD_RESET: { maxRequests: 3, windowMs: 600000 },     // 3 par 10 minutes
};

export default rateLimiter;
