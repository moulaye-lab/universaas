/**
 * calendarService.js - Service Calendrier Académique
 *
 * Gestion des événements académiques:
 * - Examens
 * - Vacances
 * - Rentrée/Fin d'année
 * - Événements spéciaux
 * - Jours fériés
 */

import { database } from '../config/firebase';
import { ref, push, set, get, update, remove, query, orderByChild, equalTo } from 'firebase/database';

/**
 * Types d'événements
 */
export const EVENT_TYPES = {
  EXAM: 'exam',
  VACATION: 'vacation',
  HOLIDAY: 'holiday',
  SCHOOL_START: 'school_start',
  SCHOOL_END: 'school_end',
  EVENT: 'event'
};

export const EVENT_TYPE_LABELS = {
  exam: 'Examen',
  vacation: 'Vacances',
  holiday: 'Jour férié',
  school_start: 'Rentrée',
  school_end: 'Fin d\'année',
  event: 'Événement'
};

export const EVENT_TYPE_COLORS = {
  exam: '#ef4444', // Rouge
  vacation: '#10b981', // Vert
  holiday: '#f59e0b', // Orange
  school_start: '#3b82f6', // Bleu
  school_end: '#8b5cf6', // Violet
  event: '#06b6d4' // Cyan
};

/**
 * Valider le schéma d'un événement
 * @param {Object} eventData - Données de l'événement
 * @returns {Object} - {valid: boolean, errors: Array}
 */
function validateEventSchema(eventData) {
  const errors = [];

  // Champs obligatoires
  if (!eventData.title || typeof eventData.title !== 'string' || eventData.title.trim().length === 0) {
    errors.push('Titre obligatoire et non vide');
  }

  if (!eventData.type || !Object.values(EVENT_TYPES).includes(eventData.type)) {
    errors.push('Type d\'événement invalide');
  }

  if (!eventData.startDate) {
    errors.push('Date de début obligatoire');
  }

  // Validation de la cible
  if (!eventData.target || typeof eventData.target !== 'object') {
    errors.push('Champ "target" obligatoire');
  } else {
    const validTargetTypes = ['all', 'level', 'class', 'teachers_of_class'];
    if (!validTargetTypes.includes(eventData.target.type)) {
      errors.push('Type de cible invalide (doit être: all, level, class, ou teachers_of_class)');
    }

    if (eventData.target.type !== 'all' && !eventData.target.value) {
      errors.push('Valeur de cible obligatoire pour type level/class/teachers_of_class');
    }
  }

  // Validation dates
  if (eventData.endDate) {
    const start = new Date(eventData.startDate);
    const end = new Date(eventData.endDate);
    if (end < start) {
      errors.push('Date de fin doit être après date de début');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Créer un événement (Admin uniquement)
 * @param {string} universityId - ID de l'université
 * @param {Object} eventData - Données de l'événement
 * @param {string} eventData.title - Titre
 * @param {string} eventData.type - Type (exam, vacation, etc.)
 * @param {string} eventData.startDate - Date début ISO
 * @param {string} eventData.endDate - Date fin ISO (optionnel)
 * @param {Object} eventData.target - Cible {type: 'all'|'level'|'class', value: string|null}
 * @param {string} createdBy - UID créateur
 */
export async function createEvent(universityId, eventData, createdBy) {
  try {
    // Validation stricte du schéma
    const validation = validateEventSchema(eventData);
    if (!validation.valid) {
      throw new Error('Validation échouée: ' + validation.errors.join(', '));
    }

    const eventsRef = ref(database, `universities/${universityId}/calendar/events`);
    const newEventRef = push(eventsRef);

    const event = {
      ...eventData,
      id: newEventRef.key,
      createdAt: Date.now(),
      createdBy,
      updatedAt: Date.now(),
      // Assurer que target est bien structuré
      target: {
        type: eventData.target.type,
        value: eventData.target.value || null
      }
    };

    await set(newEventRef, event);
    return { success: true, eventId: newEventRef.key };
  } catch (error) {
    console.error('Erreur création événement:', error);
    throw error;
  }
}

/**
 * Modifier un événement
 */
export async function updateEvent(universityId, eventId, updates) {
  try {
    const eventRef = ref(database, `universities/${universityId}/calendar/events/${eventId}`);

    await update(eventRef, {
      ...updates,
      updatedAt: Date.now()
    });

    return { success: true };
  } catch (error) {
    console.error('Erreur modification événement:', error);
    throw error;
  }
}

/**
 * Supprimer un événement
 */
export async function deleteEvent(universityId, eventId) {
  try {
    const eventRef = ref(database, `universities/${universityId}/calendar/events/${eventId}`);
    await remove(eventRef);
    return { success: true };
  } catch (error) {
    console.error('Erreur suppression événement:', error);
    throw error;
  }
}

/**
 * Récupérer tous les événements (Admin - sans filtre)
 */
export async function getAllEvents(universityId) {
  try {
    const eventsRef = ref(database, `universities/${universityId}/calendar/events`);
    const snapshot = await get(eventsRef);

    if (!snapshot.exists()) {
      return [];
    }

    const eventsData = snapshot.val();
    return Object.keys(eventsData).map(key => {
      const event = eventsData[key];

      // Rétro-compatibilité: ajouter target si manquant
      if (!event.target) {
        event.target = { type: 'all', value: null };
      }

      return {
        id: key,
        ...event
      };
    });
  } catch (error) {
    console.error('Erreur chargement événements:', error);
    throw error;
  }
}

/**
 * 🎯 FILTRE INTELLIGENT - Charger calendrier pour un utilisateur spécifique
 * @param {string} universityId - ID université
 * @param {Object} userContext - Contexte utilisateur
 * @param {string} userContext.level - Niveau (ex: "L1", "M2")
 * @param {string} userContext.classId - ID classe
 * @param {string} userContext.className - Nom classe
 * @param {string} userContext.role - Rôle (student, enseignant)
 * @param {string} userContext.teacherId - ID enseignant (si role = enseignant)
 * @returns {Array} - Événements filtrés
 */
export async function getCalendarForUser(universityId, userContext) {
  try {
    // Récupérer tous les événements
    const allEvents = await getAllEvents(universityId);

    // 🔍 Filtrage intelligent
    const filteredEvents = allEvents.filter(event => {
      const target = event.target || { type: 'all', value: null };

      // Cas 1: Événement global → visible par TOUS
      if (target.type === 'all') {
        return true;
      }

      // Cas 2: Événement ciblé par niveau
      if (target.type === 'level' && userContext.level) {
        return target.value === userContext.level;
      }

      // Cas 3: Événement ciblé par classe (ID ou nom)
      if (target.type === 'class') {
        return (
          target.value === userContext.classId ||
          target.value === userContext.className
        );
      }

      // Cas 4: Événement ciblé par professeurs d'une classe
      if (target.type === 'teachers_of_class' && userContext.role === 'enseignant') {
        // Vérifier si cet enseignant enseigne dans cette classe
        return userContext.teachingClassIds?.includes(target.value);
      }

      // Par défaut: ne pas afficher
      return false;
    });

    console.log(`📅 Calendrier filtré: ${filteredEvents.length}/${allEvents.length} événements pour`, userContext);
    return filteredEvents;

  } catch (error) {
    console.error('Erreur chargement calendrier utilisateur:', error);
    throw error;
  }
}

/**
 * Récupérer événements pour un mois (avec filtre utilisateur)
 */
export async function getEventsForMonthFiltered(universityId, year, month, userContext) {
  try {
    const filteredEvents = await getCalendarForUser(universityId, userContext);

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);

    return filteredEvents.filter(event => {
      const eventStart = new Date(event.startDate).getTime();
      const eventEnd = event.endDate ? new Date(event.endDate).getTime() : eventStart;
      const rangeStart = startDate.getTime();
      const rangeEnd = endDate.getTime();

      return (eventStart <= rangeEnd && eventEnd >= rangeStart);
    });
  } catch (error) {
    console.error('Erreur chargement mois filtré:', error);
    throw error;
  }
}

/**
 * Récupérer événements par type
 */
export async function getEventsByType(universityId, type) {
  try {
    const eventsRef = ref(database, `universities/${universityId}/calendar/events`);
    const eventsQuery = query(eventsRef, orderByChild('type'), equalTo(type));
    const snapshot = await get(eventsQuery);

    if (!snapshot.exists()) {
      return [];
    }

    const eventsData = snapshot.val();
    return Object.keys(eventsData).map(key => ({
      id: key,
      ...eventsData[key]
    }));
  } catch (error) {
    console.error('Erreur chargement événements par type:', error);
    throw error;
  }
}

/**
 * Récupérer événements pour une période
 */
export async function getEventsByDateRange(universityId, startDate, endDate) {
  try {
    const allEvents = await getAllEvents(universityId);

    return allEvents.filter(event => {
      const eventStart = new Date(event.startDate).getTime();
      const eventEnd = event.endDate ? new Date(event.endDate).getTime() : eventStart;
      const rangeStart = new Date(startDate).getTime();
      const rangeEnd = new Date(endDate).getTime();

      // Événement chevauche la période
      return (eventStart <= rangeEnd && eventEnd >= rangeStart);
    });
  } catch (error) {
    console.error('Erreur chargement événements par période:', error);
    throw error;
  }
}

/**
 * Récupérer événements d'un mois
 */
export async function getEventsForMonth(universityId, year, month) {
  try {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);

    return await getEventsByDateRange(universityId, startDate, endDate);
  } catch (error) {
    console.error('Erreur chargement événements du mois:', error);
    throw error;
  }
}

/**
 * Récupérer événements à venir (prochains 30 jours)
 */
export async function getUpcomingEvents(universityId, daysAhead = 30) {
  try {
    const allEvents = await getAllEvents(universityId);
    const now = Date.now();
    const futureLimit = now + (daysAhead * 24 * 60 * 60 * 1000);

    return allEvents
      .filter(event => {
        const eventDate = new Date(event.startDate).getTime();
        return eventDate >= now && eventDate <= futureLimit;
      })
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  } catch (error) {
    console.error('Erreur chargement événements à venir:', error);
    throw error;
  }
}

/**
 * Vérifier si une date est un jour férié/vacances
 */
export async function isHoliday(universityId, date) {
  try {
    const allEvents = await getAllEvents(universityId);
    const dateTime = new Date(date).setHours(0, 0, 0, 0);

    return allEvents.some(event => {
      if (event.type !== EVENT_TYPES.HOLIDAY && event.type !== EVENT_TYPES.VACATION) {
        return false;
      }

      const eventStart = new Date(event.startDate).setHours(0, 0, 0, 0);
      const eventEnd = event.endDate
        ? new Date(event.endDate).setHours(23, 59, 59, 999)
        : eventStart;

      return dateTime >= eventStart && dateTime <= eventEnd;
    });
  } catch (error) {
    console.error('Erreur vérification jour férié:', error);
    return false;
  }
}

/**
 * Statistiques calendrier
 */
export async function getCalendarStats(universityId) {
  try {
    const allEvents = await getAllEvents(universityId);
    const now = Date.now();

    const stats = {
      totalEvents: allEvents.length,
      upcomingEvents: allEvents.filter(e => new Date(e.startDate).getTime() > now).length,
      pastEvents: allEvents.filter(e => new Date(e.startDate).getTime() < now).length,
      byType: {}
    };

    // Compter par type
    Object.values(EVENT_TYPES).forEach(type => {
      stats.byType[type] = allEvents.filter(e => e.type === type).length;
    });

    return stats;
  } catch (error) {
    console.error('Erreur stats calendrier:', error);
    throw error;
  }
}
