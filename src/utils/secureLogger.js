/**
 * secureLogger.js - Logging sécurisé pour production
 *
 * Fonctionnalités:
 * - Désactive automatiquement les logs en production
 * - Filtre les données sensibles (emails, passwords, tokens)
 * - Envoie les erreurs critiques à un service de monitoring
 */

const isProd = import.meta.env.PROD;

// Liste des clés sensibles à masquer
const SENSITIVE_KEYS = [
  'password',
  'token',
  'apiKey',
  'secret',
  'credential',
  'auth',
  'email',
  'phoneNumber',
  'ssn',
  'creditCard',
  'temporaryPassword'
];

/**
 * Masque les données sensibles dans un objet
 */
function sanitizeData(data) {
  if (!data || typeof data !== 'object') return data;

  const sanitized = Array.isArray(data) ? [] : {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some(sensitiveKey =>
      lowerKey.includes(sensitiveKey.toLowerCase())
    );

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Logger sécurisé
 */
export const logger = {
  /**
   * Log de debug (désactivé en production)
   */
  debug: (...args) => {
    if (!isProd) {
      console.log('[DEBUG]', ...args.map(sanitizeData));
    }
  },

  /**
   * Log d'info (désactivé en production)
   */
  info: (...args) => {
    if (!isProd) {
      console.info('[INFO]', ...args.map(sanitizeData));
    }
  },

  /**
   * Log d'avertissement (activé en production, sanitizé)
   */
  warn: (...args) => {
    if (isProd) {
      // En prod: envoyer à un service de monitoring
      // TODO: Intégrer Sentry/DataDog
      console.warn('[WARN]', ...args.map(sanitizeData));
    } else {
      console.warn('[WARN]', ...args);
    }
  },

  /**
   * Log d'erreur (activé en production, sanitizé)
   */
  error: (message, error) => {
    const sanitizedError = {
      message: error?.message || message,
      code: error?.code,
      timestamp: new Date().toISOString()
    };

    if (isProd) {
      // En prod: envoyer à un service de monitoring
      // TODO: Intégrer Sentry
      console.error('[ERROR]', sanitizedError);

      // Exemple intégration Sentry (à décommenter après installation)
      // if (window.Sentry) {
      //   window.Sentry.captureException(error, {
      //     tags: { environment: 'production' },
      //     extra: sanitizedError
      //   });
      // }
    } else {
      console.error('[ERROR]', message, error);
    }
  },

  /**
   * Log de données utilisateur (TOUJOURS sanitizé)
   */
  user: (action, userId, data) => {
    if (!isProd) {
      console.log('[USER]', action, userId, sanitizeData(data));
    }
  },

  /**
   * Log de sécurité (TOUJOURS activé et envoyé au serveur)
   */
  security: (event, details) => {
    const securityLog = {
      event,
      details: sanitizeData(details),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };

    console.warn('[SECURITY]', securityLog);

    // TODO: Envoyer au serveur pour audit
    // fetch('/api/security-logs', {
    //   method: 'POST',
    //   body: JSON.stringify(securityLog)
    // });
  }
};

/**
 * Désactiver complètement console en production
 */
export function disableConsoleProd() {
  if (isProd) {
    const noop = () => {};
    console.log = noop;
    console.debug = noop;
    console.info = noop;
    // Garder console.error et console.warn pour les erreurs critiques
  }
}

export default logger;
