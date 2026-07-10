/**
 * NotificationBell.jsx - Cloche de notifications avec badge et dropdown
 *
 * Fonctionnalités:
 * - Badge avec compteur de notifications non lues
 * - Dropdown avec les 5 dernières notifications
 * - Marquer comme lu au clic
 * - Lien vers page complète
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react';
import { useUnreadCount } from '../hooks/useNotifications';
import { useAuth } from '../contexts/AuthContext';
import { ref, onValue } from 'firebase/database';
import { database } from '../config/firebase';
import { markAsRead } from '../services/notificationService';

export default function NotificationBell() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const dropdownRef = useRef(null);

  const universityId = userProfile?.universityId;
  const userId = currentUser?.uid;
  const unreadCount = useUnreadCount(universityId, userId);

  // Écouter les 5 dernières notifications
  useEffect(() => {
    if (!universityId || !userId) return;

    const notificationsRef = ref(database, `universities/${universityId}/notifications`);

    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setRecentNotifications([]);
        return;
      }

      const notificationsData = snapshot.val();
      const userNotifications = [];

      Object.keys(notificationsData).forEach(notificationId => {
        const notification = notificationsData[notificationId];
        if (notification.recipientId === userId) {
          userNotifications.push(notification);
        }
      });

      // Trier par date décroissante et prendre les 5 premières
      userNotifications.sort((a, b) => b.createdAt - a.createdAt);
      setRecentNotifications(userNotifications.slice(0, 5));
    });

    return () => unsubscribe();
  }, [universityId, userId]);

  // Fermer dropdown si clic en dehors
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (notificationId, e) => {
    e.stopPropagation();
    try {
      await markAsRead(universityId, notificationId);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Marquer comme lu
    if (!notification.read) {
      try {
        await markAsRead(universityId, notification.id);
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }

    // Fermer dropdown
    setIsOpen(false);

    // Navigation selon le type de notification
    switch (notification.type) {
      case 'grade_new':
      case 'grade_update':
        if (userProfile?.role === 'student') {
          navigate('/dashboard/student');
        } else if (userProfile?.role === 'parent') {
          navigate('/dashboard/parent');
        }
        break;
      case 'payment_due':
      case 'payment_overdue':
      case 'payment_received':
        if (userProfile?.role === 'student') {
          navigate('/student/payments');
        } else if (userProfile?.role === 'parent') {
          navigate('/parent/payments');
        }
        break;
      case 'absence_reported':
        if (userProfile?.role === 'student') {
          navigate('/student/absences');
        }
        break;
      case 'schedule_change':
        if (userProfile?.role === 'student') {
          navigate('/student/schedule');
        } else if (userProfile?.role === 'teacher') {
          navigate('/teacher/schedule');
        }
        break;
      default:
        // Page notifications complète
        navigate('/notifications');
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      grade_new: '📊',
      grade_update: '📈',
      payment_due: '💰',
      payment_overdue: '⚠️',
      payment_received: '✅',
      absence_reported: '📅',
      message_new: '💬',
      schedule_change: '🔔',
      announcement: '📢',
      system: '⚙️'
    };
    return icons[type] || '🔔';
  };

  const formatTimestamp = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes}min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return new Date(timestamp).toLocaleDateString('fr-FR');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bouton cloche */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 group"
      >
        <Bell className="h-6 w-6 text-gray-600 group-hover:text-indigo-600 transition-colors" />

        {/* Badge compteur */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-white" />
              <h3 className="font-bold text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
                  {unreadCount} non {unreadCount > 1 ? 'lues' : 'lue'}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Liste des notifications */}
          <div className="max-h-96 overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Aucune notification</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer transition-all hover:bg-gray-50 ${
                      !notification.read ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icône */}
                      <div className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-semibold ${
                            !notification.read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5"></span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTimestamp(notification.createdAt)}
                        </p>
                      </div>

                      {/* Bouton marquer comme lu */}
                      {!notification.read && (
                        <button
                          onClick={(e) => handleMarkAsRead(notification.id, e)}
                          className="flex-shrink-0 p-1.5 hover:bg-white rounded-lg transition text-gray-400 hover:text-indigo-600"
                          title="Marquer comme lu"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {recentNotifications.length > 0 && (
            <div className="border-t border-gray-200 p-3 bg-gray-50">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/notifications');
                }}
                className="w-full text-sm text-indigo-600 hover:text-indigo-700 font-semibold transition"
              >
                Voir toutes les notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
