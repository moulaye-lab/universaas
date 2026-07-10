/**
 * useNotifications.js - Hook pour gérer les notifications en temps réel
 *
 * Fonctionnalités:
 * - Écoute en temps réel des notifications utilisateur
 * - Compteur de notifications non lues
 * - Marquer comme lues
 * - Cleanup automatique des listeners
 */

import { useState, useEffect, useRef } from 'react';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../config/firebase';
import {
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications
} from '../services/notificationService';

/**
 * Hook pour gérer les notifications d'un utilisateur
 * @param {string} universityId - ID de l'université
 * @param {string} userId - ID de l'utilisateur
 * @returns {Object} - Notifications, compteur non lues, fonctions de gestion
 */
export function useNotifications(universityId, userId) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!universityId || !userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Référence aux notifications de l'université
    const notificationsRef = ref(database, `universities/${universityId}/notifications`);

    // Écouter les notifications en temps réel
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      const notificationsData = snapshot.val();
      const userNotifications = [];
      let unreadCounter = 0;

      // Filtrer les notifications de l'utilisateur
      Object.keys(notificationsData).forEach(notificationId => {
        const notification = notificationsData[notificationId];
        if (notification.recipientId === userId) {
          userNotifications.push(notification);
          if (!notification.read) {
            unreadCounter++;
          }
        }
      });

      // Trier par date décroissante (plus récentes en premier)
      userNotifications.sort((a, b) => b.createdAt - a.createdAt);

      setNotifications(userNotifications);
      setUnreadCount(unreadCounter);
      setLoading(false);
    }, (error) => {
      console.error('Error loading notifications:', error);
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
   * Marquer une notification comme lue
   */
  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(universityId, notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  };

  /**
   * Marquer toutes les notifications comme lues
   */
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead(universityId, userId);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  };

  /**
   * Supprimer une notification
   */
  const handleDeleteNotification = async (notificationId) => {
    try {
      await deleteNotification(universityId, notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  };

  /**
   * Supprimer toutes les notifications lues
   */
  const handleDeleteReadNotifications = async () => {
    try {
      await deleteReadNotifications(universityId, userId);
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      throw error;
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    deleteNotification: handleDeleteNotification,
    deleteReadNotifications: handleDeleteReadNotifications
  };
}

/**
 * Hook pour récupérer uniquement le compteur de notifications non lues
 * Plus léger que useNotifications si on n'a besoin que du compteur
 * @param {string} universityId - ID de l'université
 * @param {string} userId - ID de l'utilisateur
 * @returns {number} - Nombre de notifications non lues
 */
export function useUnreadCount(universityId, userId) {
  const [unreadCount, setUnreadCount] = useState(0);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!universityId || !userId) {
      return;
    }

    const notificationsRef = ref(database, `universities/${universityId}/notifications`);

    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setUnreadCount(0);
        return;
      }

      const notificationsData = snapshot.val();
      let counter = 0;

      Object.keys(notificationsData).forEach(notificationId => {
        const notification = notificationsData[notificationId];
        if (notification.recipientId === userId && !notification.read) {
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
