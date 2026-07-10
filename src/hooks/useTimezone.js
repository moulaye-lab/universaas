/**
 * useTimezone.js - Hook pour accéder au fuseau horaire de l'université
 *
 * Utilisation:
 * const { timezone, formatDate, getCurrentTime } = useTimezone();
 * formatDate(timestamp) => "10 juillet 2026 à 15:30" dans le fuseau de l'université
 */

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

export function useTimezone() {
  const { userProfile } = useAuth();
  const [timezone, setTimezone] = useState('Europe/Paris');
  const [timezoneOffset, setTimezoneOffset] = useState('+1');

  useEffect(() => {
    if (!userProfile?.universityId) return;

    // Écouter les changements de fuseau horaire en temps réel
    const univRef = ref(database, `universities/${userProfile.universityId}`);
    const unsubscribe = onValue(univRef, (snapshot) => {
      if (snapshot.exists()) {
        const univData = snapshot.val();
        setTimezone(univData.timezone || 'Europe/Paris');
        setTimezoneOffset(univData.timezoneOffset || '+1');
      }
    });

    return () => unsubscribe();
  }, [userProfile?.universityId]);

  /**
   * Formate une date/timestamp dans le fuseau horaire de l'université
   * @param {number|Date} dateInput - Timestamp ou objet Date
   * @param {object} options - Options de formatage (dateStyle, timeStyle, etc.)
   * @returns {string} - Date formatée
   */
  const formatDate = (dateInput, options = {}) => {
    if (!dateInput) return '';

    const date = typeof dateInput === 'number' ? new Date(dateInput) : dateInput;

    const defaultOptions = {
      timeZone: timezone,
      dateStyle: 'medium',
      timeStyle: 'short',
      ...options
    };

    try {
      return new Intl.DateTimeFormat('fr-FR', defaultOptions).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return date.toLocaleString('fr-FR');
    }
  };

  /**
   * Retourne l'heure actuelle dans le fuseau horaire de l'université
   * @returns {Date}
   */
  const getCurrentTime = () => {
    return new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
  };

  /**
   * Convertit un timestamp UTC en heure locale de l'université
   * @param {number} timestamp - Timestamp UTC
   * @returns {Date}
   */
  const utcToLocal = (timestamp) => {
    const utcDate = new Date(timestamp);
    return new Date(utcDate.toLocaleString('en-US', { timeZone: timezone }));
  };

  /**
   * Vérifie si une date est aujourd'hui dans le fuseau de l'université
   * @param {number|Date} dateInput
   * @returns {boolean}
   */
  const isToday = (dateInput) => {
    const date = typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    const today = getCurrentTime();

    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  /**
   * Retourne le début de la journée dans le fuseau de l'université
   * @param {Date} date - Date à traiter (défaut: aujourd'hui)
   * @returns {Date}
   */
  const getStartOfDay = (date = getCurrentTime()) => {
    const localDate = new Date(date);
    localDate.setHours(0, 0, 0, 0);
    return localDate;
  };

  /**
   * Retourne la fin de la journée dans le fuseau de l'université
   * @param {Date} date - Date à traiter (défaut: aujourd'hui)
   * @returns {Date}
   */
  const getEndOfDay = (date = getCurrentTime()) => {
    const localDate = new Date(date);
    localDate.setHours(23, 59, 59, 999);
    return localDate;
  };

  return {
    timezone,
    timezoneOffset,
    formatDate,
    getCurrentTime,
    utcToLocal,
    isToday,
    getStartOfDay,
    getEndOfDay
  };
}
