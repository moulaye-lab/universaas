/**
 * MessageBatchDetailPage.jsx - Détail d'un envoi groupé (batch/campagne)
 *
 * Fonctionnalités:
 * - Afficher infos du batch (sujet, corps, stats)
 * - Liste tous les destinataires avec statut (lu/non lu)
 * - Filtrer par statut
 * - Statistiques de lecture
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Users,
  Send,
  CheckCheck,
  Mail,
  MailOpen,
  Calendar,
  AlertCircle,
  User,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getBatch, getBatchMessages } from '../../services/messageService';

export default function MessageBatchDetailPage() {
  const navigate = useNavigate();
  const { batchId } = useParams();
  const { userProfile } = useAuth();
  const universityId = userProfile?.universityId;

  const [batch, setBatch] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, read, unread

  useEffect(() => {
    loadBatchData();
  }, [batchId, universityId]);

  const loadBatchData = async () => {
    if (!universityId || !batchId) return;

    try {
      setLoading(true);
      const batchData = await getBatch(universityId, batchId);
      const batchMessages = await getBatchMessages(universityId, batchId);

      setBatch(batchData);
      setMessages(batchMessages);

      setLoading(false);
    } catch (err) {
      console.error('Error loading batch:', err);
      setError(err.message || 'Erreur lors du chargement');
      setLoading(false);
    }
  };

  const filteredMessages = messages.filter(msg => {
    if (filter === 'read' && !msg.read) return false;
    if (filter === 'unread' && msg.read) return false;
    return true;
  });

  const readCount = messages.filter(m => m.read).length;
  const readPercentage = Math.round((readCount / messages.length) * 100);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Users className="h-12 w-12 text-indigo-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="glass p-12 rounded-3xl text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-6">{error || 'Batch introuvable'}</p>
          <button
            onClick={() => navigate('/messages/inbox')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold"
          >
            Retour à la messagerie
          </button>
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
              onClick={() => navigate('/messages/inbox')}
              className="p-2 hover:bg-white rounded-xl transition shadow-sm"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Users className="h-8 w-8 text-purple-600" />
                Envoi groupé
              </h1>
              <p className="text-gray-600 mt-1">{batch.subject}</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Send className="h-5 w-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-700">Destinataires</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{batch.recipientCount}</p>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCheck className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-700">Messages lus</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{readCount}</p>
            <p className="text-sm text-gray-500 mt-1">{readPercentage}% du total</p>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-gray-700">Taux de lecture</h3>
            </div>
            <div className="relative pt-1">
              <div className="overflow-hidden h-3 mb-2 text-xs flex rounded-full bg-gray-200">
                <div
                  style={{ width: `${readPercentage}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                ></div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{readPercentage}%</p>
            </div>
          </div>
        </div>

        {/* Message Content */}
        <div className="glass rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="h-5 w-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-900">Contenu du message</h2>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-sm text-gray-600 mb-2">Objet :</p>
            <p className="font-semibold text-gray-900 mb-4">{batch.subject}</p>
            <p className="text-sm text-gray-600 mb-2">Message :</p>
            <div className="whitespace-pre-wrap text-gray-700">{batch.body}</div>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Envoyé le {formatDate(batch.createdAt)}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
              batch.recipientType === 'broadcast' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {batch.recipientType === 'broadcast' ? 'Diffusion' : 'Envoi groupé'}
            </span>
          </div>
        </div>

        {/* Filtres */}
        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Filtrer les destinataires</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl border-2 transition ${
                filter === 'all'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              Tous ({messages.length})
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-4 py-2 rounded-xl border-2 transition ${
                filter === 'read'
                  ? 'border-green-500 bg-green-50 text-green-700 font-semibold'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <CheckCheck className="h-4 w-4 inline mr-1" />
              Lus ({readCount})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-xl border-2 transition ${
                filter === 'unread'
                  ? 'border-orange-500 bg-orange-50 text-orange-700 font-semibold'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Mail className="h-4 w-4 inline mr-1" />
              Non lus ({messages.length - readCount})
            </button>
          </div>
        </div>

        {/* Liste des destinataires */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Destinataires ({filteredMessages.length})
          </h2>
          <div className="space-y-2">
            {filteredMessages.map((msg) => (
              <div
                key={msg.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                    msg.read ? 'bg-green-600' : 'bg-gray-400'
                  }`}>
                    {msg.toName[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{msg.toName}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${getRoleBadgeColor(msg.toRole)}`}>
                        {getRoleLabel(msg.toRole)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {msg.read ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <MailOpen className="h-5 w-5" />
                      <div className="text-right">
                        <p className="text-sm font-semibold">Lu</p>
                        <p className="text-xs">{formatDate(msg.readAt)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Mail className="h-5 w-5" />
                      <p className="text-sm font-semibold">Non lu</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
