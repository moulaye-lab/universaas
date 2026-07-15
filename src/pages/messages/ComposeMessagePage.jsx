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
import { ChevronLeft, Send, AlertCircle, CheckCircle, User, Users, Radio } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { sendMessage, createMessageBatch, updateBatchStats } from '../../services/messageService';
import { createNotification, NOTIFICATION_TYPES } from '../../services/notificationService';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';

export default function ComposeMessagePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userProfile } = useAuth();
  const universityId = userProfile?.universityId;

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sendMode, setSendMode] = useState('individual'); // 'individual', 'multiple', 'broadcast'
  const [selectedRecipients, setSelectedRecipients] = useState([]); // Pour mode multiple
  const [broadcastRole, setBroadcastRole] = useState('student'); // Pour mode broadcast
  const [formData, setFormData] = useState({
    to: '',
    subject: '',
    body: ''
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  // Pré-remplir si réponse à un message
  useEffect(() => {
    if (location.state?.replyTo) {
      const { recipientId, subject } = location.state.replyTo;
      setFormData({
        to: recipientId,
        subject: subject.startsWith('RE:') ? subject : `RE: ${subject}`,
        body: ''
      });
      setSendMode('individual'); // Forcer mode individuel pour les réponses
    }
  }, [location.state]);

  // Charger la liste des utilisateurs
  useEffect(() => {
    loadUsers();
  }, [universityId]);

  // Filtrer les utilisateurs
  useEffect(() => {
    let filtered = users;

    // Filtre par rôle
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Filtre par recherche (nom ou email)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.displayName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    }

    // Si un destinataire est pré-sélectionné (réponse), toujours l'inclure
    if (formData.to && !filtered.find(u => u.uid === formData.to)) {
      const preselectedUser = users.find(u => u.uid === formData.to);
      if (preselectedUser) {
        filtered = [preselectedUser, ...filtered];
      }
    }

    setFilteredUsers(filtered);
  }, [users, searchQuery, roleFilter, formData.to]);

  const loadUsers = async () => {
    if (!universityId) return;

    try {
      console.log('📚 Chargement utilisateurs pour universityId:', universityId);
      const usersList = [];

      // Charger les enseignants
      const teachersRef = ref(database, `universities/${universityId}/teachers`);
      const teachersSnap = await get(teachersRef);
      if (teachersSnap.exists()) {
        const teachersData = teachersSnap.val();
        Object.keys(teachersData).forEach(uid => {
          const teacher = teachersData[uid];
          if (uid !== currentUser.uid) {
            usersList.push({
              uid,
              displayName: `${teacher.firstName} ${teacher.lastName}`,
              email: teacher.email,
              role: 'teacher'
            });
          }
        });
      }

      // Charger les étudiants (SEULEMENT si l'utilisateur actuel n'est PAS un étudiant)
      if (userProfile.role !== 'student') {
        const studentsRef = ref(database, `universities/${universityId}/students`);
        const studentsSnap = await get(studentsRef);
        if (studentsSnap.exists()) {
          const studentsData = studentsSnap.val();
          Object.keys(studentsData).forEach(uid => {
            const student = studentsData[uid];
            if (uid !== currentUser.uid) {
              usersList.push({
                uid,
                displayName: `${student.firstName} ${student.lastName}`,
                email: student.email,
                role: 'student'
              });
            }
          });
        }
      }

      // Charger les parents (SEULEMENT si l'utilisateur actuel n'est PAS un étudiant)
      if (userProfile.role !== 'student') {
        const parentsRef = ref(database, `universities/${universityId}/parents`);
        const parentsSnap = await get(parentsRef);
        if (parentsSnap.exists()) {
          const parentsData = parentsSnap.val();
          Object.keys(parentsData).forEach(uid => {
            const parent = parentsData[uid];
            if (uid !== currentUser.uid) {
              usersList.push({
                uid,
                displayName: `${parent.firstName} ${parent.lastName}`,
                email: parent.email,
                role: 'parent'
              });
            }
          });
        }
      }

      // Charger les comptables
      const comptablesRef = ref(database, `universities/${universityId}/comptables`);
      const comptablesSnap = await get(comptablesRef);
      if (comptablesSnap.exists()) {
        const comptablesData = comptablesSnap.val();
        Object.keys(comptablesData).forEach(uid => {
          const comptable = comptablesData[uid];
          if (uid !== currentUser.uid) {
            usersList.push({
              uid,
              displayName: `${comptable.firstName} ${comptable.lastName}`,
              email: comptable.email,
              role: 'comptable'
            });
          }
        });
      }

      // Pour les admins, on doit récupérer depuis l'université
      const univRef = ref(database, `universities/${universityId}`);
      const univSnap = await get(univRef);
      if (univSnap.exists()) {
        const univData = univSnap.val();

        // Récupérer l'admin depuis les métadonnées de l'université
        if (univData.adminId && univData.adminName && univData.adminId !== currentUser.uid) {
          usersList.push({
            uid: univData.adminId,
            displayName: univData.adminName,
            email: univData.adminEmail || univData.email || 'N/A',
            role: 'admin_universite'
          });
        }
      }

      // Dédupliquer par UID (garder la première occurrence)
      const uniqueUsers = [];
      const seenUIDs = new Set();

      usersList.forEach(user => {
        if (!seenUIDs.has(user.uid)) {
          seenUIDs.add(user.uid);
          uniqueUsers.push(user);
        }
      });

      // Trier par rôle puis par nom
      const roleOrder = {
        'admin_universite': 1,
        'comptable': 2,
        'teacher': 3,
        'student': 4,
        'parent': 5
      };

      uniqueUsers.sort((a, b) => {
        const roleCompare = roleOrder[a.role] - roleOrder[b.role];
        if (roleCompare !== 0) return roleCompare;
        return a.displayName.localeCompare(b.displayName);
      });

      setUsers(uniqueUsers);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    }
  };

  const handleToggleRecipient = (userId) => {
    setSelectedRecipients(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredUsers.map(u => u.uid);
    setSelectedRecipients(allFilteredIds);
  };

  const handleDeselectAll = () => {
    setSelectedRecipients([]);
  };

  const isAllSelected = filteredUsers.length > 0 && selectedRecipients.length === filteredUsers.length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.subject.trim()) {
      setError('Veuillez saisir un objet');
      return;
    }

    if (!formData.body.trim()) {
      setError('Veuillez saisir un message');
      return;
    }

    // Validation selon le mode
    let recipientsList = [];

    if (sendMode === 'individual') {
      if (!formData.to) {
        setError('Veuillez sélectionner un destinataire');
        return;
      }
      const recipient = users.find(u => u.uid === formData.to);
      if (!recipient) {
        setError('Destinataire introuvable');
        return;
      }
      recipientsList = [recipient];
    } else if (sendMode === 'multiple') {
      if (selectedRecipients.length === 0) {
        setError('Veuillez sélectionner au moins un destinataire');
        return;
      }
      recipientsList = users.filter(u => selectedRecipients.includes(u.uid));
    } else if (sendMode === 'broadcast') {
      recipientsList = users.filter(u => u.role === broadcastRole);
      if (recipientsList.length === 0) {
        setError(`Aucun utilisateur avec le rôle ${getRoleLabel(broadcastRole)}`);
        return;
      }
    }

    try {
      setSending(true);
      setSentCount(0);

      // Récupérer les infos du thread si c'est une réponse
      const replyTo = location.state?.replyTo;
      const threadId = replyTo?.threadId || null;
      const replyToId = replyTo?.messageId || null;

      let batchId = null;

      // Créer un batch si envoi groupé (multiple ou broadcast)
      if ((sendMode === 'multiple' || sendMode === 'broadcast') && recipientsList.length > 1) {
        batchId = await createMessageBatch(universityId, {
          from: currentUser.uid,
          fromName: userProfile.displayName,
          fromRole: userProfile.role,
          subject: formData.subject,
          body: formData.body,
          recipientCount: recipientsList.length,
          recipientType: sendMode
        });
      }

      // Envoyer à tous les destinataires
      for (let i = 0; i < recipientsList.length; i++) {
        const recipient = recipientsList[i];

        // Envoyer le message
        const messageId = await sendMessage(universityId, {
          from: currentUser.uid,
          fromName: userProfile.displayName,
          fromRole: userProfile.role,
          to: recipient.uid,
          toName: recipient.displayName,
          toRole: recipient.role,
          subject: formData.subject,
          body: formData.body,
          threadId: threadId, // ID du thread (conversation)
          replyToId: replyToId, // ID du message auquel on répond
          batchId: batchId // ID du batch si envoi groupé
        });

        // Créer notification pour le destinataire
        await createNotification(universityId, {
          type: NOTIFICATION_TYPES.MESSAGE_NEW,
          title: '💬 Nouveau message',
          message: `${userProfile.displayName} vous a envoyé un message: ${formData.subject}`,
          recipientId: recipient.uid,
          priority: 'normal',
          metadata: {
            messageId: messageId,
            from: currentUser.uid,
            subject: formData.subject,
            batchId: batchId
          }
        });

        setSentCount(i + 1);
      }

      // Mettre à jour le batch comme envoyé
      if (batchId) {
        await updateBatchStats(universityId, batchId, {
          status: 'sent',
          sentCount: recipientsList.length,
          sentAt: Date.now()
        });
      }

      setSuccess(true);

      // Rediriger après 3s
      setTimeout(() => {
        navigate('/messages/inbox');
      }, 3000);

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
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Message{sentCount > 1 ? 's' : ''} envoyé{sentCount > 1 ? 's' : ''}!</h2>
          <p className="text-gray-600 mb-2">
            {sentCount} message{sentCount > 1 ? 's' : ''} envoyé{sentCount > 1 ? 's' : ''} avec succès
          </p>
          <p className="text-sm text-gray-500">Redirection vers la boîte de réception...</p>
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
            {/* Sélection du mode d'envoi */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-purple-900 mb-3">📮 Mode d'envoi</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSendMode('individual')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    sendMode === 'individual'
                      ? 'bg-purple-600 border-purple-600 text-white shadow-lg'
                      : 'bg-white border-purple-200 text-gray-700 hover:border-purple-400'
                  }`}
                >
                  <User className="h-6 w-6 mx-auto mb-2" />
                  <p className="font-semibold text-sm">Individuel</p>
                  <p className="text-xs opacity-80">1 destinataire</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSendMode('multiple')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    sendMode === 'multiple'
                      ? 'bg-purple-600 border-purple-600 text-white shadow-lg'
                      : 'bg-white border-purple-200 text-gray-700 hover:border-purple-400'
                  }`}
                >
                  <Users className="h-6 w-6 mx-auto mb-2" />
                  <p className="font-semibold text-sm">Groupé</p>
                  <p className="text-xs opacity-80">Plusieurs personnes</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSendMode('broadcast')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    sendMode === 'broadcast'
                      ? 'bg-purple-600 border-purple-600 text-white shadow-lg'
                      : 'bg-white border-purple-200 text-gray-700 hover:border-purple-400'
                  }`}
                >
                  <Radio className="h-6 w-6 mx-auto mb-2" />
                  <p className="font-semibold text-sm">Diffusion</p>
                  <p className="text-xs opacity-80">Tous d'un rôle</p>
                </button>
              </div>
            </div>

            {/* Filtres avancés (visible seulement en mode individual et multiple) */}
            {(sendMode === 'individual' || sendMode === 'multiple') && (
              <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-indigo-900 mb-2">🔍 Filtres de recherche</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Recherche par nom */}
                <div>
                  <input
                    type="text"
                    placeholder="Rechercher par nom ou email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border-2 border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  />
                </div>

                {/* Filtre par rôle */}
                <div>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border-2 border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  >
                    <option value="all">Tous les rôles</option>
                    <option value="admin_universite">Administrateurs</option>
                    <option value="comptable">Comptables</option>
                    <option value="teacher">Enseignants</option>
                    {userProfile.role !== 'student' && <option value="student">Étudiants</option>}
                    {userProfile.role !== 'student' && <option value="parent">Parents</option>}
                  </select>
                </div>
              </div>
                <p className="text-xs text-indigo-700">
                  {filteredUsers.length} destinataire{filteredUsers.length > 1 ? 's' : ''} trouvé{filteredUsers.length > 1 ? 's' : ''}
                </p>
              </div>
            )}

            {/* MODE INDIVIDUEL */}
            {sendMode === 'individual' && (
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
                  {filteredUsers.map(user => (
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
            )}

            {/* MODE GROUPÉ */}
            {sendMode === 'multiple' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Destinataires <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-indigo-600">
                      {selectedRecipients.length} / {filteredUsers.length} sélectionné{selectedRecipients.length > 1 ? 's' : ''}
                    </span>
                    <button
                      type="button"
                      onClick={isAllSelected ? handleDeselectAll : handleSelectAll}
                      className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition font-medium"
                    >
                      {isAllSelected ? '✖️ Tout désélectionner' : '✅ Tout sélectionner'}
                    </button>
                  </div>
                </div>
                <div className="border-2 border-gray-200 rounded-xl max-h-64 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">Aucun utilisateur trouvé</p>
                  ) : (
                    filteredUsers.map(user => (
                      <label
                        key={user.uid}
                        className="flex items-center gap-3 p-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRecipients.includes(user.uid)}
                          onChange={() => handleToggleRecipient(user.uid)}
                          className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <User className="h-5 w-5 text-gray-400" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{user.displayName}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${getRoleBadgeColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* MODE DIFFUSION */}
            {sendMode === 'broadcast' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Envoyer à tous les <span className="text-red-500">*</span>
                </label>
                <select
                  value={broadcastRole}
                  onChange={(e) => setBroadcastRole(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="admin_universite">📋 Administrateurs ({users.filter(u => u.role === 'admin_universite').length})</option>
                  <option value="comptable">💰 Comptables ({users.filter(u => u.role === 'comptable').length})</option>
                  <option value="teacher">👨‍🏫 Enseignants ({users.filter(u => u.role === 'teacher').length})</option>
                  <option value="student">🎓 Étudiants ({users.filter(u => u.role === 'student').length})</option>
                  <option value="parent">👪 Parents ({users.filter(u => u.role === 'parent').length})</option>
                </select>
                <div className="mt-3 bg-yellow-50 border-2 border-yellow-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold">Attention !</p>
                    <p>Ce message sera envoyé à <strong>{users.filter(u => u.role === broadcastRole).length} personne{users.filter(u => u.role === broadcastRole).length > 1 ? 's' : ''}</strong>.</p>
                  </div>
                </div>
              </div>
            )}

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
                {sending ? (
                  sentCount > 0 ? `Envoi... ${sentCount}` : 'Envoi...'
                ) : (
                  sendMode === 'broadcast' ? 'Diffuser' :
                  sendMode === 'multiple' ? `Envoyer (${selectedRecipients.length})` :
                  'Envoyer'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
