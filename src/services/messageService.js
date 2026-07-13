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
    body,
    threadId,
    replyToId,
    batchId // ID du batch si envoi groupé
  } = messageData;

  if (!universityId || !from || !to || !subject || !body) {
    throw new Error('Données de message incomplètes');
  }

  if (!toName || !toRole) {
    throw new Error('Destinataire incomplet (toName ou toRole manquant)');
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
    readAt: null,
    // Thread management
    threadId: threadId || newMessageRef.key, // Si pas de thread, ce message crée un nouveau thread
    replyToId: replyToId || null, // ID du message auquel on répond (null si premier message)
    isReply: !!replyToId, // Flag pour savoir si c'est une réponse
    // Batch management
    batchId: batchId || null, // ID du batch si envoi groupé
    isBatch: !!batchId // Flag pour savoir si fait partie d'un envoi groupé
  };

  try {
    await set(newMessageRef, message);
  } catch (error) {
    console.error('Erreur lors de la création du message:', error);
    throw error;
  }

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

/**
 * Récupérer tous les messages d'un thread (conversation)
 * @param {string} universityId - ID de l'université
 * @param {string} threadId - ID du thread
 * @returns {Promise<Array>} - Messages du thread triés chronologiquement
 */
export async function getThreadMessages(universityId, threadId) {
  if (!universityId || !threadId) {
    throw new Error('universityId et threadId requis');
  }

  const messagesRef = ref(database, `universities/${universityId}/messages`);
  const snapshot = await get(messagesRef);

  if (!snapshot.exists()) {
    return [];
  }

  const messages = snapshot.val();
  const threadMessages = [];

  Object.keys(messages).forEach(messageId => {
    const message = messages[messageId];
    // Tous les messages du même thread
    if (message.threadId === threadId) {
      threadMessages.push(message);
    }
  });

  // Trier par date croissante (plus ancien en premier pour afficher la conversation dans l'ordre)
  threadMessages.sort((a, b) => a.createdAt - b.createdAt);

  return threadMessages;
}

/**
 * Créer un batch (campagne) d'envoi groupé
 * @param {string} universityId - ID de l'université
 * @param {Object} batchData - Données du batch
 * @returns {Promise<string>} - ID du batch créé
 */
export async function createMessageBatch(universityId, batchData) {
  const {
    from,
    fromName,
    fromRole,
    subject,
    body,
    recipientCount,
    recipientType // 'multiple' ou 'broadcast'
  } = batchData;

  if (!universityId || !from || !subject || !body || !recipientCount) {
    throw new Error('Données de batch incomplètes');
  }

  const batchesRef = ref(database, `universities/${universityId}/messageBatches`);
  const newBatchRef = push(batchesRef);

  const batch = {
    id: newBatchRef.key,
    from,
    fromName,
    fromRole,
    subject,
    body,
    recipientCount,
    recipientType,
    sentCount: 0,
    readCount: 0,
    createdAt: Date.now(),
    status: 'sending' // sending, sent, failed
  };

  await set(newBatchRef, batch);

  return newBatchRef.key;
}

/**
 * Mettre à jour les statistiques d'un batch
 * @param {string} universityId - ID de l'université
 * @param {string} batchId - ID du batch
 * @param {Object} updates - Mises à jour
 * @returns {Promise<void>}
 */
export async function updateBatchStats(universityId, batchId, updates) {
  if (!universityId || !batchId) {
    throw new Error('universityId et batchId requis');
  }

  const batchRef = ref(database, `universities/${universityId}/messageBatches/${batchId}`);
  await update(batchRef, updates);
}

/**
 * Récupérer tous les batches d'un utilisateur
 * @param {string} universityId - ID de l'université
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Array>} - Liste des batches
 */
export async function getUserBatches(universityId, userId) {
  if (!universityId || !userId) {
    throw new Error('universityId et userId requis');
  }

  const batchesRef = ref(database, `universities/${universityId}/messageBatches`);
  const snapshot = await get(batchesRef);

  if (!snapshot.exists()) {
    return [];
  }

  const batches = snapshot.val();
  const userBatches = [];

  Object.keys(batches).forEach(batchId => {
    const batch = batches[batchId];
    if (batch.from === userId) {
      userBatches.push(batch);
    }
  });

  // Trier par date décroissante
  userBatches.sort((a, b) => b.createdAt - a.createdAt);

  return userBatches;
}

/**
 * Récupérer un batch spécifique
 * @param {string} universityId - ID de l'université
 * @param {string} batchId - ID du batch
 * @returns {Promise<Object>} - Batch
 */
export async function getBatch(universityId, batchId) {
  if (!universityId || !batchId) {
    throw new Error('universityId et batchId requis');
  }

  const batchRef = ref(database, `universities/${universityId}/messageBatches/${batchId}`);
  const snapshot = await get(batchRef);

  if (!snapshot.exists()) {
    throw new Error('Batch introuvable');
  }

  return snapshot.val();
}

/**
 * Récupérer tous les messages d'un batch
 * @param {string} universityId - ID de l'université
 * @param {string} batchId - ID du batch
 * @returns {Promise<Array>} - Messages du batch
 */
export async function getBatchMessages(universityId, batchId) {
  if (!universityId || !batchId) {
    throw new Error('universityId et batchId requis');
  }

  const messagesRef = ref(database, `universities/${universityId}/messages`);
  const snapshot = await get(messagesRef);

  if (!snapshot.exists()) {
    return [];
  }

  const messages = snapshot.val();
  const batchMessages = [];

  Object.keys(messages).forEach(messageId => {
    const message = messages[messageId];
    if (message.batchId === batchId) {
      batchMessages.push(message);
    }
  });

  // Trier par nom du destinataire
  batchMessages.sort((a, b) => a.toName.localeCompare(b.toName));

  return batchMessages;
}
