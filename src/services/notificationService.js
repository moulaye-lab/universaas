/**
 * notificationService.js - Service de gestion des notifications
 *
 * Fonctionnalités:
 * - Créer notifications pour utilisateurs
 * - Lire notifications
 * - Marquer comme lues
 * - Compter notifications non lues
 * - Supprimer notifications
 */

import { ref, push, update, get, query, orderByChild, equalTo, limitToLast } from 'firebase/database';
import { database } from '../config/firebase';

/**
 * Types de notifications supportés
 */
export const NOTIFICATION_TYPES = {
  GRADE_NEW: 'grade_new',
  GRADE_UPDATE: 'grade_update',
  PAYMENT_DUE: 'payment_due',
  PAYMENT_OVERDUE: 'payment_overdue',
  PAYMENT_RECEIVED: 'payment_received',
  ABSENCE_REPORTED: 'absence_reported',
  MESSAGE_NEW: 'message_new',
  SCHEDULE_CHANGE: 'schedule_change',
  ANNOUNCEMENT: 'announcement',
  SYSTEM: 'system'
};

/**
 * Créer une notification
 * @param {string} universityId - ID de l'université
 * @param {Object} notificationData - Données de la notification
 * @returns {Promise<string>} - ID de la notification créée
 */
export async function createNotification(universityId, notificationData) {
  const {
    type,
    title,
    message,
    recipientId,
    metadata = {},
    priority = 'normal'
  } = notificationData;

  if (!universityId || !type || !title || !message || !recipientId) {
    throw new Error('Données de notification incomplètes');
  }

  if (!Object.values(NOTIFICATION_TYPES).includes(type)) {
    throw new Error(`Type de notification invalide: ${type}`);
  }

  const notificationsRef = ref(database, `universities/${universityId}/notifications`);
  const newNotificationRef = push(notificationsRef);

  const notification = {
    id: newNotificationRef.key,
    type,
    title,
    message,
    recipientId,
    universityId,
    read: false,
    priority,
    metadata,
    createdAt: Date.now()
  };

  await update(newNotificationRef, notification);

  return newNotificationRef.key;
}

/**
 * Créer plusieurs notifications en batch
 * @param {string} universityId - ID de l'université
 * @param {Array} notificationsData - Tableau de données de notifications
 * @returns {Promise<Array<string>>} - IDs des notifications créées
 */
export async function createBatchNotifications(universityId, notificationsData) {
  const notificationIds = [];

  for (const notificationData of notificationsData) {
    const notificationId = await createNotification(universityId, notificationData);
    notificationIds.push(notificationId);
  }

  return notificationIds;
}

/**
 * Marquer une notification comme lue
 * @param {string} universityId - ID de l'université
 * @param {string} notificationId - ID de la notification
 * @returns {Promise<void>}
 */
export async function markAsRead(universityId, notificationId) {
  if (!universityId || !notificationId) {
    throw new Error('universityId et notificationId requis');
  }

  const notificationRef = ref(database, `universities/${universityId}/notifications/${notificationId}`);

  await update(notificationRef, {
    read: true,
    readAt: Date.now()
  });
}

/**
 * Marquer toutes les notifications d'un utilisateur comme lues
 * @param {string} universityId - ID de l'université
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<number>} - Nombre de notifications marquées comme lues
 */
export async function markAllAsRead(universityId, userId) {
  if (!universityId || !userId) {
    throw new Error('universityId et userId requis');
  }

  const notificationsRef = ref(database, `universities/${universityId}/notifications`);
  const snapshot = await get(notificationsRef);

  if (!snapshot.exists()) {
    return 0;
  }

  const notifications = snapshot.val();
  const updates = {};
  let count = 0;

  Object.keys(notifications).forEach(notificationId => {
    const notification = notifications[notificationId];
    if (notification.recipientId === userId && !notification.read) {
      updates[`${notificationId}/read`] = true;
      updates[`${notificationId}/readAt`] = Date.now();
      count++;
    }
  });

  if (count > 0) {
    await update(notificationsRef, updates);
  }

  return count;
}

/**
 * Récupérer les notifications d'un utilisateur
 * @param {string} universityId - ID de l'université
 * @param {string} userId - ID de l'utilisateur
 * @param {number} limit - Nombre maximum de notifications à récupérer
 * @returns {Promise<Array>} - Liste des notifications
 */
export async function getUserNotifications(universityId, userId, limit = 50) {
  if (!universityId || !userId) {
    throw new Error('universityId et userId requis');
  }

  const notificationsRef = ref(database, `universities/${universityId}/notifications`);
  const snapshot = await get(notificationsRef);

  if (!snapshot.exists()) {
    return [];
  }

  const notifications = snapshot.val();
  const userNotifications = [];

  Object.keys(notifications).forEach(notificationId => {
    const notification = notifications[notificationId];
    if (notification.recipientId === userId) {
      userNotifications.push(notification);
    }
  });

  // Trier par date décroissante (plus récentes en premier)
  userNotifications.sort((a, b) => b.createdAt - a.createdAt);

  // Limiter le nombre de résultats
  return userNotifications.slice(0, limit);
}

/**
 * Compter les notifications non lues d'un utilisateur
 * @param {string} universityId - ID de l'université
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<number>} - Nombre de notifications non lues
 */
export async function getUnreadCount(universityId, userId) {
  if (!universityId || !userId) {
    throw new Error('universityId et userId requis');
  }

  const notificationsRef = ref(database, `universities/${universityId}/notifications`);
  const snapshot = await get(notificationsRef);

  if (!snapshot.exists()) {
    return 0;
  }

  const notifications = snapshot.val();
  let count = 0;

  Object.keys(notifications).forEach(notificationId => {
    const notification = notifications[notificationId];
    if (notification.recipientId === userId && !notification.read) {
      count++;
    }
  });

  return count;
}

/**
 * Supprimer une notification
 * @param {string} universityId - ID de l'université
 * @param {string} notificationId - ID de la notification
 * @returns {Promise<void>}
 */
export async function deleteNotification(universityId, notificationId) {
  if (!universityId || !notificationId) {
    throw new Error('universityId et notificationId requis');
  }

  const notificationRef = ref(database, `universities/${universityId}/notifications/${notificationId}`);

  await update(notificationRef, null);
}

/**
 * Supprimer toutes les notifications lues d'un utilisateur
 * @param {string} universityId - ID de l'université
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<number>} - Nombre de notifications supprimées
 */
export async function deleteReadNotifications(universityId, userId) {
  if (!universityId || !userId) {
    throw new Error('universityId et userId requis');
  }

  const notificationsRef = ref(database, `universities/${universityId}/notifications`);
  const snapshot = await get(notificationsRef);

  if (!snapshot.exists()) {
    return 0;
  }

  const notifications = snapshot.val();
  const updates = {};
  let count = 0;

  Object.keys(notifications).forEach(notificationId => {
    const notification = notifications[notificationId];
    if (notification.recipientId === userId && notification.read) {
      updates[notificationId] = null;
      count++;
    }
  });

  if (count > 0) {
    await update(notificationsRef, updates);
  }

  return count;
}

/**
 * Helpers pour créer des notifications spécifiques
 */

export async function notifyNewGrade(universityId, studentId, gradeData) {
  return createNotification(universityId, {
    type: NOTIFICATION_TYPES.GRADE_NEW,
    title: '📊 Nouvelle note disponible',
    message: `Vous avez reçu une nouvelle note en ${gradeData.courseName}: ${gradeData.grade}/${gradeData.maxGrade}`,
    recipientId: studentId,
    priority: 'normal',
    metadata: {
      courseId: gradeData.courseId,
      courseName: gradeData.courseName,
      grade: gradeData.grade,
      maxGrade: gradeData.maxGrade,
      teacherId: gradeData.teacherId
    }
  });
}

export async function notifyPaymentDue(universityId, studentId, paymentData) {
  return createNotification(universityId, {
    type: NOTIFICATION_TYPES.PAYMENT_DUE,
    title: '💰 Paiement à venir',
    message: `Un paiement de ${paymentData.amount}${paymentData.currency} est dû le ${new Date(paymentData.dueDate).toLocaleDateString('fr-FR')}`,
    recipientId: studentId,
    priority: 'high',
    metadata: {
      paymentId: paymentData.paymentId,
      amount: paymentData.amount,
      currency: paymentData.currency,
      dueDate: paymentData.dueDate,
      description: paymentData.description
    }
  });
}

export async function notifyPaymentOverdue(universityId, studentId, paymentData) {
  return createNotification(universityId, {
    type: NOTIFICATION_TYPES.PAYMENT_OVERDUE,
    title: '⚠️ Paiement en retard',
    message: `Votre paiement de ${paymentData.amount}${paymentData.currency} est en retard depuis le ${new Date(paymentData.dueDate).toLocaleDateString('fr-FR')}`,
    recipientId: studentId,
    priority: 'urgent',
    metadata: {
      paymentId: paymentData.paymentId,
      amount: paymentData.amount,
      currency: paymentData.currency,
      dueDate: paymentData.dueDate,
      description: paymentData.description
    }
  });
}

export async function notifyAbsence(universityId, studentId, absenceData) {
  return createNotification(universityId, {
    type: NOTIFICATION_TYPES.ABSENCE_REPORTED,
    title: '📅 Absence enregistrée',
    message: `Votre absence du ${new Date(absenceData.date).toLocaleDateString('fr-FR')} a été enregistrée pour ${absenceData.courseName}`,
    recipientId: studentId,
    priority: 'normal',
    metadata: {
      courseId: absenceData.courseId,
      courseName: absenceData.courseName,
      date: absenceData.date,
      reason: absenceData.reason
    }
  });
}

export async function notifyScheduleChange(universityId, studentId, scheduleData) {
  return createNotification(universityId, {
    type: NOTIFICATION_TYPES.SCHEDULE_CHANGE,
    title: '🔔 Modification emploi du temps',
    message: `Le cours ${scheduleData.courseName} a été modifié: ${scheduleData.changeDescription}`,
    recipientId: studentId,
    priority: 'high',
    metadata: {
      courseId: scheduleData.courseId,
      courseName: scheduleData.courseName,
      changeDescription: scheduleData.changeDescription,
      newDate: scheduleData.newDate
    }
  });
}

export async function notifyAnnouncement(universityId, recipientId, announcementData) {
  return createNotification(universityId, {
    type: NOTIFICATION_TYPES.ANNOUNCEMENT,
    title: `📢 ${announcementData.title}`,
    message: announcementData.message,
    recipientId: recipientId,
    priority: announcementData.priority || 'normal',
    metadata: {
      authorId: announcementData.authorId,
      authorName: announcementData.authorName,
      category: announcementData.category
    }
  });
}
