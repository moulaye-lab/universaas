/**
 * InboxPage.jsx - Boîte de réception
 *
 * Fonctionnalités:
 * - Liste des messages reçus
 * - Badge non lu
 * - Filtrer lu/non lu
 * - Marquer comme lu
 * - Supprimer
 * - Navigation vers détail message
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  MailOpen,
  ChevronLeft,
  Trash2,
  Check,
  CheckCheck,
  Filter,
  PenSquare,
  Send,
  Star,
  StarOff
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useMessages } from '../../hooks/useMessages';

export default function InboxPage() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const universityId = userProfile?.universityId;
  const userId = currentUser?.uid;

  const {
    inbox,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteMessage,
    toggleStarred
  } = useMessages(universityId, userId);

  const [filter, setFilter] = useState('all'); // all, unread, read, starred
  const [deleting, setDeleting] = useState(null);

  // Filtrer messages
  const filteredMessages = inbox.filter(message => {
    if (filter === 'unread' && message.read) return false;
    if (filter === 'read' && !message.read) return false;
    if (filter === 'starred' && !message.starred) return false;
    return true;
  });

  const handleMessageClick = async (message) => {
    // Marquer comme lu si non lu
    if (!message.read) {
      try {
        await markAsRead(message.id);
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }

    // Naviguer vers le détail
    navigate(`/messages/${message.id}`);
  };

  const handleDelete = async (messageId, e) => {
    e.stopPropagation();

    if (!confirm('Supprimer ce message ?')) return;

    try {
      setDeleting(messageId);
      await deleteMessage(messageId);
    } catch (error) {
      alert('Erreur lors de la suppression');
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleStar = async (messageId, currentStarred, e) => {
    e.stopPropagation();

    try {
      await toggleStarred(messageId, !currentStarred);
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  const handleMarkAllRead = async () => {
    if (!confirm('Marquer tous les messages comme lus ?')) return;

    try {
      await markAllAsRead();
    } catch (error) {
      alert('Erreur lors du marquage');
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes}min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-FR');
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin_universite: 'bg-purple-100 text-purple-700',
      teacher: 'bg-blue-100 text-blue-700',
      student: 'bg-green-100 text-green-700',
      parent: 'bg-orange-100 text-orange-700',
      comptable: 'bg-yellow-100 text-yellow-700'
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin_universite: 'Admin',
      teacher: 'Enseignant',
      student: 'Étudiant',
      parent: 'Parent',
      comptable: 'Comptable'
    };
    return labels[role] || role;
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
          <Mail className="h-12 w-12 text-indigo-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Chargement des messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                <Mail className="h-8 w-8 text-indigo-600" />
                Boîte de Réception
              </h1>
              <p className="text-gray-600 mt-1">
                {inbox.length} message{inbox.length > 1 ? 's' : ''}
                {unreadCount > 0 && (
                  <span className="ml-2 text-indigo-600 font-semibold">
                    ({unreadCount} non {unreadCount > 1 ? 'lus' : 'lu'})
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => navigate('/messages/compose')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 font-medium shadow-lg"
            >
              <PenSquare className="h-5 w-5" />
              Écrire
            </button>
          </div>

          {/* Actions rapides */}
          {inbox.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
                className="px-4 py-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
              >
                <CheckCheck className="h-4 w-4" />
                Tout marquer comme lu
              </button>
              <button
                onClick={() => navigate('/messages/sent')}
                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition flex items-center gap-2 text-sm font-medium"
              >
                <Send className="h-4 w-4" />
                Messages envoyés
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
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl border-2 transition ${
                filter === 'all'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              Tous ({inbox.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-xl border-2 transition ${
                filter === 'unread'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              Non lus ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-4 py-2 rounded-xl border-2 transition ${
                filter === 'read'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              Lus ({inbox.length - unreadCount})
            </button>
            <button
              onClick={() => setFilter('starred')}
              className={`px-4 py-2 rounded-xl border-2 transition ${
                filter === 'starred'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Star className="h-4 w-4 inline mr-1" />
              Favoris ({inbox.filter(m => m.starred).length})
            </button>
          </div>
        </div>

        {/* Liste des messages */}
        <div className="space-y-3">
          {filteredMessages.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Mail className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium mb-2">
                Aucun message
              </p>
              <p className="text-gray-500 text-sm">
                {filter !== 'all'
                  ? 'Aucun message ne correspond aux filtres sélectionnés'
                  : 'Vous n\'avez pas encore de messages'}
              </p>
            </div>
          ) : (
            filteredMessages.map((message) => (
              <div
                key={message.id}
                onClick={() => handleMessageClick(message)}
                className={`glass rounded-2xl p-5 transition-all hover:shadow-lg cursor-pointer ${
                  !message.read ? 'border-l-4 border-indigo-500 bg-blue-50/30' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icône */}
                  <div className={`p-3 rounded-xl ${!message.read ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                    {!message.read ? (
                      <Mail className="h-6 w-6 text-indigo-600" />
                    ) : (
                      <MailOpen className="h-6 w-6 text-gray-600" />
                    )}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`text-lg font-semibold ${
                            !message.read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {message.fromName}
                          </h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${getRoleBadgeColor(message.fromRole)}`}>
                            {getRoleLabel(message.fromRole)}
                          </span>
                          {!message.read && (
                            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                          )}
                        </div>
                        <p className={`text-base mb-1 ${!message.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {message.subject}
                        </p>
                        <p className="text-sm text-gray-500 line-clamp-1">
                          {message.body}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {formatTimestamp(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => handleToggleStar(message.id, message.starred, e)}
                      className={`p-2 rounded-lg transition ${
                        message.starred
                          ? 'text-yellow-500 hover:bg-yellow-100'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title={message.starred ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    >
                      {message.starred ? (
                        <Star className="h-5 w-5 fill-current" />
                      ) : (
                        <StarOff className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={(e) => handleDelete(message.id, e)}
                      disabled={deleting === message.id}
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
