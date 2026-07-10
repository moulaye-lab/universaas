/**
 * ComposeMessagePage.jsx - Composer un message
 *
 * Fonctionnalités:
 * - Sélection destinataire
 * - Saisie sujet et corps
 * - Envoi message
 * - Notification automatique au destinataire
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Send, AlertCircle, CheckCircle, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { sendMessage } from '../../services/messageService';
import { createNotification, NOTIFICATION_TYPES } from '../../services/notificationService';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';

export default function ComposeMessagePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userProfile } = useAuth();
  const universityId = userProfile?.universityId;

  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    to: '',
    subject: '',
    body: ''
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Pré-remplir si réponse à un message
  useEffect(() => {
    if (location.state?.replyTo) {
      const { from, fromName, subject } = location.state.replyTo;
      setFormData({
        to: from,
        subject: `RE: ${subject}`,
        body: ''
      });
    }
  }, [location.state]);

  // Charger la liste des utilisateurs
  useEffect(() => {
    loadUsers();
  }, [universityId]);

  const loadUsers = async () => {
    if (!universityId) return;

    try {
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);

      if (!snapshot.exists()) {
        setUsers([]);
        return;
      }

      const usersData = snapshot.val();
      const usersList = [];

      Object.keys(usersData).forEach(uid => {
        const user = usersData[uid];
        // Filtrer: même université + pas moi-même
        if (user.universityId === universityId && uid !== currentUser.uid) {
          usersList.push({
            uid,
            displayName: user.displayName,
            email: user.email,
            role: user.role
          });
        }
      });

      // Trier par nom
      usersList.sort((a, b) => a.displayName.localeCompare(b.displayName));

      setUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.to) {
      setError('Veuillez sélectionner un destinataire');
      return;
    }

    if (!formData.subject.trim()) {
      setError('Veuillez saisir un objet');
      return;
    }

    if (!formData.body.trim()) {
      setError('Veuillez saisir un message');
      return;
    }

    try {
      setSending(true);

      // Trouver les infos du destinataire
      const recipient = users.find(u => u.uid === formData.to);

      if (!recipient) {
        throw new Error('Destinataire introuvable');
      }

      // Envoyer le message
      const messageId = await sendMessage(universityId, {
        from: currentUser.uid,
        fromName: userProfile.displayName,
        fromRole: userProfile.role,
        to: formData.to,
        toName: recipient.displayName,
        toRole: recipient.role,
        subject: formData.subject,
        body: formData.body
      });

      // Créer notification pour le destinataire
      await createNotification(universityId, {
        type: NOTIFICATION_TYPES.MESSAGE_NEW,
        title: '💬 Nouveau message',
        message: `${userProfile.displayName} vous a envoyé un message: ${formData.subject}`,
        recipientId: formData.to,
        priority: 'normal',
        metadata: {
          messageId: messageId,
          from: currentUser.uid,
          subject: formData.subject
        }
      });

      setSuccess(true);

      // Rediriger après 2s
      setTimeout(() => {
        navigate('/messages/inbox');
      }, 2000);

    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.message || 'Erreur lors de l\'envoi du message');
      setSending(false);
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin_universite: 'Admin',
      teacher: 'Enseignant',
      student: 'Étudiant',
      parent: 'Parent',
      comptable: 'Comptable',
      super_admin_plateforme: 'Super Admin'
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

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="glass p-12 rounded-3xl text-center max-w-md">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Message envoyé!</h2>
          <p className="text-gray-600">Redirection vers la boîte de réception...</p>
        </div>
      </div>
    );
  }

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
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Send className="h-8 w-8 text-indigo-600" />
                Nouveau Message
              </h1>
              <p className="text-gray-600 mt-1">Envoyer un message à un membre de l'université</p>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <div className="glass rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Destinataire */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                À <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.to}
                onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Sélectionner un destinataire</option>
                {users.map(user => (
                  <option key={user.uid} value={user.uid}>
                    {user.displayName} - {getRoleLabel(user.role)}
                  </option>
                ))}
              </select>
              {formData.to && (
                <div className="mt-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {users.find(u => u.uid === formData.to)?.displayName}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${getRoleBadgeColor(users.find(u => u.uid === formData.to)?.role)}`}>
                    {getRoleLabel(users.find(u => u.uid === formData.to)?.role)}
                  </span>
                </div>
              )}
            </div>

            {/* Objet */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Objet <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Objet du message"
                maxLength={200}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">{formData.subject.length}/200 caractères</p>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={12}
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="Saisissez votre message ici..."
                maxLength={5000}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">{formData.body.length}/5000 caractères</p>
            </div>

            {/* Messages d'erreur/succès */}
            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Boutons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/messages/inbox')}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={sending}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Send className="h-5 w-5" />
                {sending ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
