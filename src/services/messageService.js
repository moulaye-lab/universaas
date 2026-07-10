/**
 * messageService.js - Service de messagerie interne
 *
 * Fonctionnalités:
 * - Envoyer message direct utilisateur à utilisateur
 * - Lire boîte de réception (inbox)
 * - Lire messages envoyés (sent)
 * - Marquer comme lu
 * - Supprimer message
 * - Compter messages non lus
 */

import { ref, push, update, get, set, remove } from 'firebase/database';
import { database } from '../config/firebase';

/**
 * Envoyer un message
 * @param {string} universityId - ID de l'université
 * @param {Object} messageData - Données du message
 * @returns {Promise<string>} - ID du message créé
 */
export async function sendMessage(universityId, messageData) {
  const {
    from,
    fromName,
    fromRole,
    to,
    toName,
    toRole,
    subject,
    body
  } = messageData;

  if (!universityId || !from || !to || !subject || !body) {
    throw new Error('Données de message incomplètes');
  }

  if (from === to) {
    throw new Error('Vous ne pouvez pas vous envoyer un message à vous-même');
  }

  const messagesRef = ref(database, `universities/${universityId}/messages`);
  const newMessageRef = push(messagesRef);

  const message = {
    id: newMessageRef.key,
    from,
    fromName,
    fromRole,
    to,
    toName,
    toRole,
    subject,
    body,
    read: false,
    starred: false,
    archived: false,
    createdAt: Date.now(),
    readAt: null
  };

  await set(newMessageRef, message);

  return newMessageRef.key;
}

/**
 * Récupérer la boîte de réception (messages reçus)
 * @param {string} universityId - ID de l'université
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Array>} - Liste des messages reçus
 */
export async function getInbox(universityId, userId) {
  if (!universityId || !userId) {
    throw new Error('universityId et userId requis');
  }

  const messagesRef = ref(database, `universities/${universityId}/messages`);
  const snapshot = await get(messagesRef);

  if (!snapshot.exists()) {
    return [];
  }

  const messages = snapshot.val();
  const inbox = [];

  Object.keys(messages).forEach(messageId => {
    const message = messages[messageId];
    // Messages où je suis le destinataire
    if (message.to === userId && !message.archived) {
      inbox.push(message);
    }
  });

  // Trier par date décroissante (plus récents en premier)
  inbox.sort((a, b) => b.createdAt - a.createdAt);

  return inbox;
}

/**
 * Récupérer les messages envoyés
 * @param {string} universityId - ID de l'université
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Array>} - Liste des messages envoyés
 */
export async function getSentMessages(universityId, userId) {
  if (!universityId || !userId) {
    throw new Error('universityId et userId requis');
  }

  const messagesRef = ref(database, `universities/${universityId}/messages`);
  const snapshot = await get(messagesRef);

  if (!snapshot.exists()) {
    return [];
  }

  const messages = snapshot.val();
  const sent = [];

  Object.keys(messages).forEach(messageId => {
    const message = messages[messageId];
    // Messages où je suis l'expéditeur
    if (message.from === userId) {
      sent.push(message);
    }
  });

  // Trier par date décroissante
  sent.sort((a, b) => b.createdAt - a.createdAt);

  return sent;
}

/**
 * Récupérer un message spécifique
 * @param {string} universityId - ID de l'université
 * @param {string} messageId - ID du message
 * @returns {Promise<Object>} - Message
 */
export async function getMessage(universityId, messageId) {
  if (!universityId || !messageId) {
    throw new Error('universityId et messageId requis');
  }

  const messageRef = ref(database, `universities/${universityId}/messages/${messageId}`);
  const snapshot = await get(messageRef);

  if (!snapshot.exists()) {
    throw new Error('Message introuvable');
  }

  return snapshot.val();
}

/**
 * Marquer un message comme lu
 * @param {string} universityId - ID de l'université
 * @param {string} messageId - ID du message
 * @returns {Promise<void>}
 */
export async function markMessageAsRead(universityId, messageId) {
  if (!universityId || !messageId) {
    throw new Error('universityId et messageId requis');
  }

  const messageRef = ref(database, `universities/${universityId}/messages/${messageId}`);

  await update(messageRef, {
    read: true,
    readAt: Date.now()
  });
}

/**
 * Marquer tous les messages comme lus
 * @param {string} universityId - ID de l'université
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<number>} - Nombre de messages marqués
 */
export async function markAllMessagesAsRead(universityId, userId) {
  if (!universityId || !userId) {
    throw new Error('universityId et userId requis');
  }

  const messagesRef = ref(database, `universities/${universityId}/messages`);
  const snapshot = await get(messagesRef);

  if (!snapshot.exists()) {
    return 0;
  }

  const messages = snapshot.val();
  const updates = {};
  let count = 0;

  Object.keys(messages).forEach(messageId => {
    const message = messages[messageId];
    if (message.to === userId && !message.read) {
      updates[`${messageId}/read`] = true;
      updates[`${messageId}/readAt`] = Date.now();
      count++;
    }
  });

  if (count > 0) {
    await update(messagesRef, updates);
  }

  return count;
}

/**
 * Marquer/démarquer un message comme favori
 * @param {string} universityId - ID de l'université
 * @param {string} messageId - ID du message
 * @param {boolean} starred - True pour marquer, false pour retirer
 * @returns {Promise<void>}
 */
export async function toggleStarred(universityId, messageId, starred) {
  if (!universityId || !messageId) {
    throw new Error('universityId et messageId requis');
  }

  const messageRef = ref(database, `universities/${universityId}/messages/${messageId}`);

  await update(messageRef, {
    starred: starred
  });
}

/**
 * Archiver un message
 * @param {string} universityId - ID de l'université
 * @param {string} messageId - ID du message
 * @returns {Promise<void>}
 */
export async function archiveMessage(universityId, messageId) {
  if (!universityId || !messageId) {
    throw new Error('universityId et messageId requis');
  }

  const messageRef = ref(database, `universities/${universityId}/messages/${messageId}`);

  await update(messageRef, {
    archived: true,
    archivedAt: Date.now()
  });
}

/**
 * Supprimer un message
 * @param {string} universityId - ID de l'université
 * @param {string} messageId - ID du message
 * @returns {Promise<void>}
 */
export async function deleteMessage(universityId, messageId) {
  if (!universityId || !messageId) {
    throw new Error('universityId et messageId requis');
  }

  const messageRef = ref(database, `universities/${universityId}/messages/${messageId}`);

  await remove(messageRef);
}

/**
 * Compter les messages non lus
 * @param {string} universityId - ID de l'université
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<number>} - Nombre de messages non lus
 */
export async function getUnreadCount(universityId, userId) {
  if (!universityId || !userId) {
    throw new Error('universityId et userId requis');
  }

  const messagesRef = ref(database, `universities/${universityId}/messages`);
  const snapshot = await get(messagesRef);

  if (!snapshot.exists()) {
    return 0;
  }

  const messages = snapshot.val();
  let count = 0;

  Object.keys(messages).forEach(messageId => {
    const message = messages[messageId];
    if (message.to === userId && !message.read && !message.archived) {
      count++;
    }
  });

  return count;
}

/**
 * Rechercher des messages
 * @param {string} universityId - ID de l'université
 * @param {string} userId - ID de l'utilisateur
 * @param {string} searchQuery - Terme de recherche
 * @returns {Promise<Array>} - Messages trouvés
 */
export async function searchMessages(universityId, userId, searchQuery) {
  if (!universityId || !userId || !searchQuery) {
    throw new Error('universityId, userId et searchQuery requis');
  }

  const inbox = await getInbox(universityId, userId);
  const sent = await getSentMessages(universityId, userId);
  const allMessages = [...inbox, ...sent];

  const query = searchQuery.toLowerCase();

  return allMessages.filter(message => {
    return (
      message.subject.toLowerCase().includes(query) ||
      message.body.toLowerCase().includes(query) ||
      message.fromName.toLowerCase().includes(query) ||
      message.toName.toLowerCase().includes(query)
    );
  });
}
