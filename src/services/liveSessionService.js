/**
 * liveSessionService.js - Service pour sessions live avec Jitsi Meet
 *
 * Fonctionnalités:
 * - Création de sessions live
 * - Gestion des participants
 * - Pas de backend requis (Firebase uniquement)
 */

import { ref, push, set, get, update, onValue, remove } from 'firebase/database';
import { database } from '../config/firebase';

/**
 * Créer une session live dans Firebase
 */
export async function createLiveSession({
  universityId,
  courseId,
  courseName,
  teacherId,
  teacherName,
  sessionName,
  scheduledStartTime,
  duration = 60 // minutes
}) {
  try {
    const sessionsRef = ref(database, `universities/${universityId}/liveSessions`);
    const newSessionRef = push(sessionsRef);

    // Nom de salle Jitsi unique
    const roomName = `univ_${universityId}_${newSessionRef.key}`;
    const now = Date.now();

    const sessionData = {
      id: newSessionRef.key,
      sessionName,
      courseId,
      courseName,
      teacherId,
      teacherName,
      roomName, // Pour Jitsi Meet
      status: 'scheduled', // scheduled | live | ended
      scheduledStartTime: scheduledStartTime || now,
      duration,
      createdAt: now,
      participants: {},
      createdBy: teacherId
    };

    await set(newSessionRef, sessionData);

    return {
      success: true,
      sessionId: newSessionRef.key,
      roomName
    };
  } catch (error) {
    console.error('Error creating live session:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mettre à jour le statut de la session
 */
export async function updateSessionStatus(universityId, sessionId, status) {
  try {
    const sessionRef = ref(database, `universities/${universityId}/liveSessions/${sessionId}`);

    const updates = {
      status,
      updatedAt: Date.now()
    };

    if (status === 'live') {
      updates.actualStartTime = Date.now();
    } else if (status === 'ended') {
      updates.endedAt = Date.now();
    }

    await update(sessionRef, updates);

    return { success: true };
  } catch (error) {
    console.error('Error updating session status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Ajouter un participant à la session
 */
export async function addParticipant(universityId, sessionId, userId, userName) {
  try {
    const participantRef = ref(
      database,
      `universities/${universityId}/liveSessions/${sessionId}/participants/${userId}`
    );

    await set(participantRef, {
      userId,
      userName,
      joinedAt: Date.now()
    });

    return { success: true };
  } catch (error) {
    console.error('Error adding participant:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Retirer un participant de la session
 */
export async function removeParticipant(universityId, sessionId, userId) {
  try {
    const participantRef = ref(
      database,
      `universities/${universityId}/liveSessions/${sessionId}/participants/${userId}`
    );

    await remove(participantRef);

    return { success: true };
  } catch (error) {
    console.error('Error removing participant:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Écouter les participants en temps réel
 */
export function listenToParticipants(universityId, sessionId, callback) {
  const participantsRef = ref(
    database,
    `universities/${universityId}/liveSessions/${sessionId}/participants`
  );

  return onValue(participantsRef, (snapshot) => {
    const participants = [];

    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        participants.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
    }

    callback(participants);
  });
}

/**
 * Obtenir les sessions live d'un cours
 */
export async function getCourseliveSessions(universityId, courseId) {
  try {
    const sessionsRef = ref(database, `universities/${universityId}/liveSessions`);
    const snapshot = await get(sessionsRef);

    if (!snapshot.exists()) {
      return { success: true, sessions: [] };
    }

    const sessions = [];
    snapshot.forEach((childSnapshot) => {
      const session = childSnapshot.val();
      if (session.courseId === courseId) {
        sessions.push({
          id: childSnapshot.key,
          ...session
        });
      }
    });

    // Trier par date (plus récentes en premier)
    sessions.sort((a, b) => b.scheduledStartTime - a.scheduledStartTime);

    return { success: true, sessions };
  } catch (error) {
    console.error('Error getting course sessions:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtenir toutes les sessions live de l'université
 */
export async function getAllLiveSessions(universityId) {
  try {
    const sessionsRef = ref(database, `universities/${universityId}/liveSessions`);
    const snapshot = await get(sessionsRef);

    if (!snapshot.exists()) {
      return { success: true, sessions: [] };
    }

    const sessions = [];
    snapshot.forEach((childSnapshot) => {
      sessions.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });

    // Trier par date (plus récentes en premier)
    sessions.sort((a, b) => b.scheduledStartTime - a.scheduledStartTime);

    return { success: true, sessions };
  } catch (error) {
    console.error('Error getting all sessions:', error);
    return { success: false, error: error.message };
  }
}

export default {
  createLiveSession,
  updateSessionStatus,
  addParticipant,
  removeParticipant,
  listenToParticipants,
  getCourseliveSessions,
  getAllLiveSessions
};
