/**
 * agoraService.js - Service pour Agora.io Video SDK
 *
 * Fonctionnalités:
 * - Création et gestion de canaux vidéo
 * - Génération de tokens Agora (côté client)
 * - Gestion des sessions live (Firebase)
 */

import AgoraRTC from 'agora-rtc-sdk-ng';
import { ref, push, set, get, update, onValue } from 'firebase/database';
import { database } from '../config/firebase';

// Récupérer App ID depuis variables d'environnement
const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID;

/**
 * Client Agora global
 */
let agoraClient = null;
let localAudioTrack = null;
let localVideoTrack = null;

/**
 * Initialiser le client Agora
 */
export function initAgoraClient() {
  if (!agoraClient) {
    // Désactiver les logs de débogage Agora
    AgoraRTC.setLogLevel(4); // 4 = ERROR only (pas de warnings)

    agoraClient = AgoraRTC.createClient({
      mode: 'rtc', // Real-time communication
      codec: 'vp8'
    });
  }
  return agoraClient;
}

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

    const channelName = `live_${newSessionRef.key}`;
    const now = Date.now();

    const sessionData = {
      id: newSessionRef.key,
      sessionName,
      courseId,
      courseName,
      teacherId,
      teacherName,
      channelName,
      status: 'scheduled', // scheduled | live | ended
      scheduledStartTime: scheduledStartTime || now,
      duration,
      createdAt: now,
      participants: {},
      chatMessages: []
    };

    await set(newSessionRef, sessionData);

    return {
      success: true,
      sessionId: newSessionRef.key,
      channelName
    };
  } catch (error) {
    console.error('Error creating live session:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtenir un token Agora depuis le serveur
 */
async function getAgoraToken(channelName, uid, role) {
  try {
    const auth = await import('../config/firebase').then(m => m.auth);
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const token = await currentUser.getIdToken();
    const API_URL = import.meta.env.VITE_APP_ENV === 'production' ? '' : 'http://localhost:3001';

    const response = await fetch(`${API_URL}/api/agora/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        channelName,
        uid,
        role
      })
    });

    console.log('🌐 Token API response status:', response.status);

    if (!response.ok) {
      const responseText = await response.text();
      console.error('❌ Token API error response:', responseText);
      try {
        const errorData = JSON.parse(responseText);
        throw new Error(errorData.error || 'Failed to get token');
      } catch (e) {
        throw new Error(`API Error (${response.status}): ${responseText}`);
      }
    }

    const data = await response.json();
    console.log('✅ Token received from API');
    return data.token;
  } catch (error) {
    console.error('Error getting Agora token:', error);
    throw error;
  }
}

/**
 * Rejoindre un canal Agora
 */
export async function joinChannel({
  channelName,
  userId,
  userName,
  role = 'audience' // 'host' pour enseignant, 'audience' pour étudiant
}) {
  try {
    if (!AGORA_APP_ID || AGORA_APP_ID === 'your_agora_app_id_here') {
      throw new Error('Agora App ID non configuré. Veuillez configurer VITE_AGORA_APP_ID dans .env');
    }

    const client = initAgoraClient();

    // Obtenir le token depuis le serveur
    console.log('🔑 Getting Agora token from server...');
    const token = await getAgoraToken(channelName, userId, role);
    console.log('✅ Token received');

    // Rejoindre le canal avec le token
    const uid = await client.join(
      AGORA_APP_ID,
      channelName,
      token, // Token sécurisé généré côté serveur
      userId
    );

    console.log('✅ Joined channel:', channelName, 'with UID:', uid);

    return { success: true, uid };
  } catch (error) {
    console.error('❌ Error joining channel:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Publier les flux audio/vidéo locaux
 */
export async function publishLocalTracks() {
  try {
    const client = initAgoraClient();

    // Créer les tracks audio et vidéo
    localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    localVideoTrack = await AgoraRTC.createCameraVideoTrack({
      encoderConfig: '720p_2' // 720p, 30fps
    });

    // Publier les tracks
    await client.publish([localAudioTrack, localVideoTrack]);

    console.log('✅ Published local audio/video tracks');

    return {
      success: true,
      audioTrack: localAudioTrack,
      videoTrack: localVideoTrack
    };
  } catch (error) {
    console.error('❌ Error publishing tracks:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Afficher la vidéo locale dans un élément DOM
 */
export function playLocalVideo(elementId) {
  if (localVideoTrack) {
    localVideoTrack.play(elementId);
  }
}

/**
 * Afficher la vidéo distante dans un élément DOM
 */
export function playRemoteVideo(track, elementId) {
  track.play(elementId);
}

/**
 * Mute/Unmute microphone
 */
export async function toggleMicrophone(muted) {
  if (localAudioTrack) {
    await localAudioTrack.setMuted(muted);
    return true;
  }
  return false;
}

/**
 * Activer/Désactiver caméra
 */
export async function toggleCamera(enabled) {
  if (localVideoTrack) {
    await localVideoTrack.setEnabled(enabled);
    return true;
  }
  return false;
}

/**
 * Quitter le canal et nettoyer les ressources
 */
export async function leaveChannel() {
  try {
    const client = initAgoraClient();

    // Fermer les tracks locaux
    if (localAudioTrack) {
      localAudioTrack.close();
      localAudioTrack = null;
    }

    if (localVideoTrack) {
      localVideoTrack.close();
      localVideoTrack = null;
    }

    // Quitter le canal
    await client.leave();

    console.log('✅ Left channel');

    return { success: true };
  } catch (error) {
    console.error('❌ Error leaving channel:', error);
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

    await set(participantRef, null);

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
 * Envoyer un message dans le chat de la session
 */
export async function sendChatMessage(universityId, sessionId, userId, userName, message) {
  try {
    const messagesRef = ref(
      database,
      `universities/${universityId}/liveSessions/${sessionId}/chatMessages`
    );

    const newMessageRef = push(messagesRef);

    await set(newMessageRef, {
      userId,
      userName,
      message,
      timestamp: Date.now()
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending chat message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Écouter les messages du chat en temps réel
 */
export function listenToChatMessages(universityId, sessionId, callback) {
  const messagesRef = ref(
    database,
    `universities/${universityId}/liveSessions/${sessionId}/chatMessages`
  );

  return onValue(messagesRef, (snapshot) => {
    const messages = [];

    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        messages.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
    }

    callback(messages);
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

export default {
  initAgoraClient,
  createLiveSession,
  joinChannel,
  publishLocalTracks,
  playLocalVideo,
  playRemoteVideo,
  toggleMicrophone,
  toggleCamera,
  leaveChannel,
  updateSessionStatus,
  addParticipant,
  removeParticipant,
  listenToParticipants,
  sendChatMessage,
  listenToChatMessages,
  getCourseliveSessions
};
