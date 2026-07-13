/**
 * MessageDetailPage.jsx - Détail d'un message
 *
 * Fonctionnalités:
 * - Afficher message complet
 * - Marquer automatiquement comme lu
 * - Répondre au message
 * - Supprimer
 * - Navigation retour inbox
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Reply,
  Trash2,
  User,
  Calendar,
  AlertCircle,
  Mail,
  MessageCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getMessage, markMessageAsRead, deleteMessage, getThreadMessages } from '../../services/messageService';

export default function MessageDetailPage() {
  const navigate = useNavigate();
  const { messageId } = useParams();
  const { currentUser, userProfile } = useAuth();
  const universityId = userProfile?.universityId;

  const [message, setMessage] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadMessage();
  }, [messageId, universityId]);

  const loadMessage = async () => {
    if (!universityId || !messageId) return;

    try {
      setLoading(true);
      const messageData = await getMessage(universityId, messageId);

      // Vérifier que je suis autorisé à voir ce message
      if (messageData.from !== currentUser.uid && messageData.to !== currentUser.uid) {
        setError('Vous n\'êtes pas autorisé à voir ce message');
        setLoading(false);
        return;
      }

      setMessage(messageData);

      // Charger tout le thread (conversation complète)
      const threadId = messageData.threadId || messageData.id;
      const thread = await getThreadMessages(universityId, threadId);
      setThreadMessages(thread);

      // Si je suis le destinataire et le message n'est pas lu, le marquer comme lu
      if (messageData.to === currentUser.uid && !messageData.read) {
        await markMessageAsRead(universityId, messageId);
        // Mettre à jour l'état local
        setMessage(prev => ({ ...prev, read: true, readAt: Date.now() }));
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading message:', err);
      setError(err.message || 'Erreur lors du chargement du message');
      setLoading(false);
    }
  };

  const handleReply = () => {
    // Déterminer à qui répondre : l'autre personne de la conversation
    const replyToUserId = message.from === currentUser.uid ? message.to : message.from;
    const replyToUserName = message.from === currentUser.uid ? message.toName : message.fromName;

    navigate('/messages/compose', {
      state: {
        replyTo: {
          recipientId: replyToUserId,
          recipientName: replyToUserName,
          subject: message.subject,
          threadId: message.threadId || message.id,
          messageId: message.id
        }
      }
    });
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer ce message ?')) return;

    try {
      setDeleting(true);
      await deleteMessage(universityId, messageId);
      navigate('/messages/inbox');
    } catch (err) {
      alert('Erreur lors de la suppression');
      setDeleting(false);
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin_universite: 'Administrateur',
      teacher: 'Enseignant',
      student: 'Étudiant',
      parent: 'Parent',
      comptable: 'Comptable',
      super_admin_plateforme: 'Super Administrateur'
    };
    return labels[role] || role;
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin_universite: 'bg-purple-100 text-purple-700',
      teacher: 'bg-blue-100 text-blue-700',
      student: 'bg-green-100 text-green-700',
      parent: 'bg-orange-100 text-orange-700',
      comptable: 'bg-yellow-100 text-yellow-700',
      super_admin_plateforme: 'bg-red-100 text-red-700'
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Mail className="h-12 w-12 text-indigo-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Chargement du message...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="glass p-12 rounded-3xl text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/messages/inbox')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold"
          >
            Retour à la boîte de réception
          </button>
        </div>
      </div>
    );
  }

  if (!message) {
    return null;
  }

  const isRecipient = message.to === currentUser.uid;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/messages/inbox')}
              className="p-2 hover:bg-white rounded-xl transition shadow-sm"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Mail className="h-8 w-8 text-indigo-600" />
                Message
              </h1>
            </div>
            <div className="flex gap-2">
              {isRecipient && (
                <button
                  onClick={handleReply}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 font-medium"
                >
                  <Reply className="h-5 w-5" />
                  Répondre
                </button>
              )}
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition flex items-center gap-2 font-medium disabled:opacity-50"
              >
                <Trash2 className="h-5 w-5" />
                Supprimer
              </button>
            </div>
          </div>
        </div>

        {/* Conversation (Thread) */}
        <div className="glass rounded-2xl overflow-hidden">
          {/* En-tête de la conversation */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <MessageCircle className="h-6 w-6" />
              <h2 className="text-2xl font-bold">{message.subject}</h2>
            </div>
            <p className="text-white/80 text-sm">
              {threadMessages.length} message{threadMessages.length > 1 ? 's' : ''} dans la conversation
            </p>
          </div>

          {/* Timeline des messages */}
          <div className="p-6 space-y-4">
            {threadMessages.map((msg, index) => {
              const isFromMe = msg.from === currentUser.uid;
              const isFirstMessage = index === 0;

              return (
                <div
                  key={msg.id}
                  className={`relative ${!isFirstMessage ? 'ml-6' : ''}`}
                >
                  {/* Ligne de connexion */}
                  {!isFirstMessage && (
                    <div className="absolute left-[-24px] top-[-16px] bottom-0 w-0.5 bg-gray-300"></div>
                  )}

                  {/* Message */}
                  <div className={`rounded-2xl p-5 ${
                    isFromMe
                      ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200'
                      : 'bg-white border-2 border-gray-200'
                  }`}>
                    {/* En-tête du message */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                          isFromMe ? 'bg-indigo-600' : 'bg-gray-600'
                        }`}>
                          {isFromMe ? msg.fromName[0] : msg.fromName[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900">{msg.fromName}</p>
                            <span className={`text-xs px-2 py-1 rounded-full ${getRoleBadgeColor(msg.fromRole)}`}>
                              {getRoleLabel(msg.fromRole)}
                            </span>
                            {isFromMe && (
                              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">
                                Vous
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            {formatDate(msg.createdAt)}
                            {msg.read && msg.readAt && !isFromMe && (
                              <span className="text-green-600 flex items-center gap-1">
                                ✓✓ Lu
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Badge nouveau message si c'est le premier */}
                      {isFirstMessage && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
                          Message initial
                        </span>
                      )}
                      {!isFirstMessage && (
                        <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">
                          Réponse
                        </span>
                      )}
                    </div>

                    {/* Destinataire */}
                    <div className="text-xs text-gray-500 mb-3 flex items-center gap-2">
                      <span>À:</span>
                      <span className="font-medium">{msg.toName}</span>
                      <span className={`px-2 py-0.5 rounded-full ${getRoleBadgeColor(msg.toRole)}`}>
                        {getRoleLabel(msg.toRole)}
                      </span>
                    </div>

                    {/* Corps du message */}
                    <div className="prose max-w-none">
                      <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                        {msg.body}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions du bas */}
          <div className="border-t border-gray-200 p-6 bg-gray-50 flex justify-between">
            <button
              onClick={() => navigate('/messages/inbox')}
              className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-white transition font-medium"
            >
              Retour
            </button>
            <button
              onClick={handleReply}
              className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition flex items-center gap-2 font-medium"
            >
              <Reply className="h-5 w-5" />
              Répondre à la conversation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
