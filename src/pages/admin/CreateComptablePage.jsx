/**
 * CreateComptablePage.jsx - Création d'un compte comptable
 *
 * Fonctionnalités:
 * - Formulaire création comptable (email/password)
 * - API REST Firebase Auth
 * - Rôle: comptable
 * - Accès: Comptabilité uniquement
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, set, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTimeout } from '../../hooks/useTimeout';
import { ChevronLeft, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';

export default function CreateComptablePage() {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const setTimeoutSafe = useTimeout();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      setError('Tous les champs obligatoires doivent être remplis');
      return;
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      setLoading(true);

      // Récupérer les données de l'université pour obtenir le nom
      const universityRef = ref(database, `universities/${userProfile.universityId}`);
      const universitySnapshot = await get(universityRef);

      if (!universitySnapshot.exists()) {
        throw new Error('Université introuvable');
      }

      const universityData = universitySnapshot.val();
      const universityName = universityData.name || 'Université';

      // Récupérer Firebase ID Token pour auth avec API
      const idToken = await currentUser.getIdToken();

      // Appeler API REST Firebase Auth pour créer le compte
      const createUserResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${import.meta.env.VITE_FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            returnSecureToken: true
          })
        }
      );

      if (!createUserResponse.ok) {
        const errorData = await createUserResponse.json();
        throw new Error(errorData.error?.message || 'Erreur lors de la création du compte');
      }

      const userData = await createUserResponse.json();
      const newUid = userData.localId;

      // Créer profil comptable dans Realtime Database
      const userRef = ref(database, `users/${newUid}`);
      const profileData = {
        uid: newUid,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        displayName: `${formData.firstName} ${formData.lastName}`,
        role: 'comptable',
        universityId: userProfile.universityId,
        universityName: universityName,
        loginMethod: 'email',
        createdAt: Date.now(),
        createdBy: currentUser.uid,
        status: 'active'
      };

      // Ajouter le téléphone seulement s'il est rempli
      if (formData.phone && formData.phone.trim().length > 0) {
        profileData.phone = formData.phone.trim();
      }

      await set(userRef, profileData);

      setSuccess(`✅ Comptable créé avec succès! Email: ${formData.email}`);

      setTimeoutSafe(() => {
        navigate('/dashboard/admin');
      }, 2000);
    } catch (err) {
      console.error('Error creating comptable:', err);
      setError('Erreur: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="p-2 hover:bg-white rounded-xl transition"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">👨‍💼 Créer un Compte Comptable</h1>
            <p className="text-gray-600 mt-1">Gestion de la comptabilité générale</p>
          </div>
        </div>

        {/* Info */}
        <div className="glass rounded-2xl p-6 mb-6 border-l-4 border-blue-500">
          <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            Accès du Comptable
          </h3>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>Accès complet à la comptabilité (revenus, dépenses, budget)</li>
            <li>Peut consulter les paiements des étudiants</li>
            <li>Pas d'accès aux notes, cours, emplois du temps</li>
            <li>L'admin garde un contrôle total</li>
          </ul>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
            <p className="text-green-800 font-medium">{success}</p>
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6">
          <div className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email professionnel *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="comptable@universite.com"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition outline-none"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mot de passe *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                placeholder="Min. 6 caractères"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 6 caractères</p>
            </div>

            {/* Prénom */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Prénom *
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                placeholder="Jean"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition outline-none"
              />
            </div>

            {/* Nom */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nom *
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                placeholder="Dupont"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition outline-none"
              />
            </div>

            {/* Téléphone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Téléphone (optionnel)
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+33 6 12 34 56 78"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard/admin')}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    Création...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5" />
                    Créer le Compte Comptable
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Info technique */}
        <div className="mt-6 p-4 bg-blue-50 rounded-xl">
          <p className="text-xs text-blue-800">
            <strong>Note:</strong> Le comptable recevra ses identifiants par email. Il devra se connecter avec l'email et le mot de passe définis ci-dessus.
          </p>
        </div>
      </div>
    </div>
  );
}
