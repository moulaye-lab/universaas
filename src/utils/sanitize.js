/**
 * sanitize.js - Protection XSS avec DOMPurify
 *
 * Fonctionnalités:
 * - Sanitize HTML pour éviter XSS
 * - Validation d'entrées
 * - Échappement de caractères spéciaux
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML pour prévenir XSS
 * @param {string} dirty - HTML potentiellement dangereux
 * @returns {string} - HTML nettoyé
 */
export function sanitizeHtml(dirty) {
  if (!dirty || typeof dirty !== 'string') return '';

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // Pas de tags HTML autorisés par défaut
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true // Garder le contenu texte
  });
}

/**
 * Sanitize pour affichage dans un attribut
 */
export function sanitizeAttribute(value) {
  if (!value || typeof value !== 'string') return '';

  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize un objet complet (récursif)
 */
export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeHtml(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Valider un email
 */
export function isValidEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Valider un nom (pas de caractères spéciaux dangereux)
 */
export function isValidName(name) {
  // Autorise lettres, espaces, tirets, apostrophes
  const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
  return nameRegex.test(name) && name.length <= 50;
}

/**
 * Valider un matricule
 * Format permanent sans niveau : XXX-YYYY-NNNNNN
 * Ex: SOR-2026-001234
 */
export function isValidMatricule(matricule) {
  // Format: XXX-YYYY-NNNNNN (sans niveau car l'étudiant peut changer de niveau)
  const matriculeRegex = /^[A-Z]{3}-\d{4}-\d{6}$/;
  return matriculeRegex.test(matricule);
}

/**
 * Nettoyer un nom de fichier
 */
export function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255);
}

/**
 * Valider une URL
 */
export function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export default {
  sanitizeHtml,
  sanitizeAttribute,
  sanitizeObject,
  isValidEmail,
  isValidName,
  isValidMatricule,
  sanitizeFilename,
  isValidUrl
};
