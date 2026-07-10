/**
 * useMessages.js - Hook pour gérer la messagerie en temps réel
 *
 * Fonctionnalités:
 * - Écoute en temps réel des messages reçus
 * - Écoute en temps réel des messages envoyés
 * - Compteur de messages non lus
 * - Marquer comme lu
 * - Supprimer message
 * - Cleanup automatique des listeners
 */

import { useState, useEffect, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../config/firebase';
import {
  markMessageAsRead,
  markAllMessagesAsRead,
  deleteMessage,
  toggleStarred,
  archiveMessage
} from '../services/messageService';

/**
 * Hook pour gérer les messages d'un utilisateur
 * @param {string} universityId - ID de l'université
 * @param {string} userId - ID de l'utilisateur
 * @returns {Object} - Messages, compteurs, fonctions de gestion
 */
export function useMessages(universityId, userId) {
  const [inbox, setInbox] = useState([]);
  const [sentMessages, setSentMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!universityId || !userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Référence aux messages de l'université
    const messagesRef = ref(database, `universities/${universityId}/messages`);

    // Écouter les messages en temps réel
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (!snapshot.exists()) {
        setInbox([]);
        setSentMessages([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      const messagesData = snapshot.val();
      const inboxList = [];
      const sentList = [];
      let unreadCounter = 0;

      // Filtrer et trier les messages
      Object.keys(messagesData).forEach(messageId => {
        const message = messagesData[messageId];

        // Messages reçus (inbox)
        if (message.to === userId && !message.archived) {
          inboxList.push(message);
          if (!message.read) {
            unreadCounter++;
          }
        }

        // Messages envoyés
        if (message.from === userId) {
          sentList.push(message);
        }
      });

      // Trier par date décroissante (plus récents en premier)
      inboxList.sort((a, b) => b.createdAt - a.createdAt);
      sentList.sort((a, b) => b.createdAt - a.createdAt);

      setInbox(inboxList);
      setSentMessages(sentList);
      setUnreadCount(unreadCounter);
      setLoading(false);
    }, (error) => {
      console.error('Error loading messages:', error);
      setLoading(false);
    });

    // Stocker la fonction de cleanup
    unsubscribeRef.current = unsubscribe;

    // Cleanup au démontage
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [universityId, userId]);

  /**
   * Marquer un message comme lu
   */
  const handleMarkAsRead = async (messageId) => {
    try {
      await markMessageAsRead(universityId, messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  };

  /**
   * Marquer tous les messages comme lus
   */
  const handleMarkAllAsRead = async () => {
    try {
      await markAllMessagesAsRead(universityId, userId);
    } catch (error) {
      console.error('Error marking all messages as read:', error);
      throw error;
    }
  };

  /**
   * Supprimer un message
   */
  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteMessage(universityId, messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  };

  /**
   * Marquer/démarquer comme favori
   */
  const handleToggleStarred = async (messageId, starred) => {
    try {
      await toggleStarred(universityId, messageId, starred);
    } catch (error) {
      console.error('Error toggling starred:', error);
      throw error;
    }
  };

  /**
   * Archiver un message
   */
  const handleArchiveMessage = async (messageId) => {
    try {
      await archiveMessage(universityId, messageId);
    } catch (error) {
      console.error('Error archiving message:', error);
      throw error;
    }
  };

  return {
    inbox,
    sentMessages,
    unreadCount,
    loading,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    deleteMessage: handleDeleteMessage,
    toggleStarred: handleToggleStarred,
    archiveMessage: handleArchiveMessage
  };
}

/**
 * Hook pour récupérer uniquement le compteur de messages non lus
 * Plus léger que useMessages si on n'a besoin que du compteur
 * @param {string} universityId - ID de l'université
 * @param {string} userId - ID de l'utilisateur
 * @returns {number} - Nombre de messages non lus
 */
export function useUnreadMessagesCount(universityId, userId) {
  const [unreadCount, setUnreadCount] = useState(0);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!universityId || !userId) {
      return;
    }

    const messagesRef = ref(database, `universities/${universityId}/messages`);

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (!snapshot.exists()) {
        setUnreadCount(0);
        return;
      }

      const messagesData = snapshot.val();
      let counter = 0;

      Object.keys(messagesData).forEach(messageId => {
        const message = messagesData[messageId];
        if (message.to === userId && !message.read && !message.archived) {
          counter++;
        }
      });

      setUnreadCount(counter);
    }, (error) => {
      console.error('Error loading unread count:', error);
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [universityId, userId]);

  return unreadCount;
}
