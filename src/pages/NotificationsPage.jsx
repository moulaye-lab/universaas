/**
 * NotificationsPage.jsx - Page complète de gestion des notifications
 *
 * Fonctionnalités:
 * - Liste complète de toutes les notifications
 * - Filtres (toutes, non lues, lues)
 * - Filtres par type
 * - Marquer comme lu/non lu
 * - Supprimer notifications
 * - Pagination
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronLeft,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { NOTIFICATION_TYPES } from '../services/notificationService';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const universityId = userProfile?.universityId;
  const userId = currentUser?.uid;

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteReadNotifications
  } = useNotifications(universityId, userId);

  const [filter, setFilter] = useState('all'); // all, unread, read
  const [typeFilter, setTypeFilter] = useState('all');
  const [deleting, setDeleting] = useState(null);

  // Filtrer notifications
  const filteredNotifications = notifications.filter(notification => {
    // Filtre lecture
    if (filter === 'unread' && notification.read) return false;
    if (filter === 'read' && !notification.read) return false;

    // Filtre type
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false;

    return true;
  });

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId);
    } catch (error) {
      alert('Erreur lors du marquage comme lu');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!confirm('Marquer toutes les notifications comme lues ?')) return;

    try {
      await markAllAsRead();
    } catch (error) {
      alert('Erreur lors du marquage de toutes les notifications');
    }
  };

  const handleDelete = async (notificationId) => {
    if (!confirm('Supprimer cette notification ?')) return;

    try {
      setDeleting(notificationId);
      await deleteNotification(notificationId);
    } catch (error) {
      alert('Erreur lors de la suppression');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteReadNotifications = async () => {
    if (!confirm('Supprimer toutes les notifications lues ?')) return;

    try {
      const count = await deleteReadNotifications();
      alert(`${count} notification(s) supprimée(s)`);
    } catch (error) {
      alert('Erreur lors de la suppression');
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

  const getNotificationTypeName = (type) => {
    const names = {
      grade_new: 'Nouvelle note',
      grade_update: 'Note mise à jour',
      payment_due: 'Paiement à venir',
      payment_overdue: 'Paiement en retard',
      payment_received: 'Paiement reçu',
      absence_reported: 'Absence',
      message_new: 'Nouveau message',
      schedule_change: 'Emploi du temps',
      announcement: 'Annonce',
      system: 'Système'
    };
    return names[type] || type;
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    let relative = '';
    if (minutes < 1) relative = 'À l\'instant';
    else if (minutes < 60) relative = `Il y a ${minutes}min`;
    else if (hours < 24) relative = `Il y a ${hours}h`;
    else if (days < 7) relative = `Il y a ${days}j`;
    else relative = '';

    const absolute = date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return relative ? `${relative} (${absolute})` : absolute;
  };

  const getDashboardRoute = () => {
    const role = userProfile?.role;
    if (role === 'super_admin_plateforme') return '/dashboard/super-admin';
    if (role === 'admin_universite') return '/dashboard/admin';
    if (role === 'comptable') return '/dashboard/comptable';
    if (role === 'teacher') return '/dashboard/teacher';
    if (role === 'student') return '/dashboard/student';
    if (role === 'parent') return '/dashboard/parent';
    return '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement des notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate(getDashboardRoute())}
              className="p-2 hover:bg-white rounded-xl transition shadow-sm"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Bell className="h-8 w-8 text-indigo-600" />
                Notifications
              </h1>
              <p className="text-gray-600 mt-1">
                {notifications.length} notification{notifications.length > 1 ? 's' : ''}
                {unreadCount > 0 && (
                  <span className="ml-2 text-indigo-600 font-semibold">
                    ({unreadCount} non {unreadCount > 1 ? 'lues' : 'lue'})
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Actions rapides */}
          {notifications.length > 0 && (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
              >
                <CheckCheck className="h-4 w-4" />
                Tout marquer comme lu
              </button>
              <button
                onClick={handleDeleteReadNotifications}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition flex items-center gap-2 text-sm font-medium"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer les lues
              </button>
            </div>
          )}
        </div>

        {/* Filtres */}
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-600" />
            <h2 className="font-semibold text-gray-900">Filtres</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Filtre par statut de lecture */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut de lecture
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`flex-1 px-4 py-2 rounded-xl border-2 transition ${
                    filter === 'all'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Toutes ({notifications.length})
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`flex-1 px-4 py-2 rounded-xl border-2 transition ${
                    filter === 'unread'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Non lues ({unreadCount})
                </button>
                <button
                  onClick={() => setFilter('read')}
                  className={`flex-1 px-4 py-2 rounded-xl border-2 transition ${
                    filter === 'read'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Lues ({notifications.length - unreadCount})
                </button>
              </div>
            </div>

            {/* Filtre par type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de notification
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">Tous les types</option>
                {Object.values(NOTIFICATION_TYPES).map(type => (
                  <option key={type} value={type}>
                    {getNotificationIcon(type)} {getNotificationTypeName(type)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Liste des notifications */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium mb-2">
                Aucune notification
              </p>
              <p className="text-gray-500 text-sm">
                {filter !== 'all' || typeFilter !== 'all'
                  ? 'Aucune notification ne correspond aux filtres sélectionnés'
                  : 'Vous n\'avez pas encore de notifications'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`glass rounded-2xl p-5 transition-all hover:shadow-lg ${
                  !notification.read ? 'border-l-4 border-indigo-500 bg-blue-50/30' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icône */}
                  <div className="text-4xl flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`text-lg font-semibold ${
                            !notification.read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{formatTimestamp(notification.createdAt)}</span>
                          <span>•</span>
                          <span className="text-indigo-600 font-medium">
                            {getNotificationTypeName(notification.type)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!notification.read ? (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="p-2 hover:bg-indigo-100 rounded-lg transition text-indigo-600"
                        title="Marquer comme lu"
                      >
                        <Check className="h-5 w-5" />
                      </button>
                    ) : (
                      <div className="p-2 text-green-600" title="Lu">
                        <CheckCheck className="h-5 w-5" />
                      </div>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id)}
                      disabled={deleting === notification.id}
                      className="p-2 hover:bg-red-100 rounded-lg transition text-red-600 disabled:opacity-50"
                      title="Supprimer"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
