/**
 * Modal pour Créer ou Lier un Compte Parent
 * Utilisé par les Admins Université
 */

import { useState } from 'react';
import { X, User, Mail, Phone, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { auth, database } from '../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, get, set, update } from 'firebase/database';

export default function CreateParentModal({ isOpen, onClose, studentData, universityId, adminUid }) {
  const [formData, setFormData] = useState({
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    relationship: 'père'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [existingParent, setExistingParent] = useState(null);

  if (!isOpen) return null;

  // Générer mot de passe temporaire
  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let password = 'Temp';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    password += '!';
    return password;
  };

  // Rechercher parent existant par email ou téléphone
  const searchParentByEmailOrPhone = async (email, phoneNumber) => {
    const usersRef = ref(database, 'users');
    const usersSnap = await get(usersRef);

    if (!usersSnap.exists()) return null;

    const allUsers = usersSnap.val();
    const cleanPhone = phoneNumber.replace(/\s/g, '');

    for (const [uid, userData] of Object.entries(allUsers)) {
      if (userData.role !== 'parent') continue;

      // Vérifier correspondance par email
      if (userData.email === email) {
        return { uid, ...userData };
      }

      // Vérifier correspondance par téléphone
      const userCleanPhone = userData.phoneNumber?.replace(/\s/g, '');
      if (userCleanPhone === cleanPhone) {
        return { uid, ...userData };
      }
    }

    return null;
  };

  // Créer ou lier le parent
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(null);
    setLoading(true);

    try {
      const { parentName, parentEmail, parentPhone, relationship } = formData;

      // Validation
      if (!parentName.trim()) {
        throw new Error('Le nom du parent est requis');
      }

      if (!parentPhone.trim()) {
        throw new Error('Le numéro de téléphone est requis');
      }

      // Déterminer l'identifiant principal
      let primaryEmail;
      let loginMethod;

      if (parentEmail && parentEmail.trim() !== '') {
        primaryEmail = parentEmail.trim().toLowerCase();
        loginMethod = 'email';
      } else {
        const cleanPhone = parentPhone.replace(/\s/g, '');
        primaryEmail = `${cleanPhone}@noemail.university-saas.com`;
        loginMethod = 'phone';
      }

      // Chercher si ce parent existe déjà
      const existing = await searchParentByEmailOrPhone(primaryEmail, parentPhone);

      if (existing) {
        // Parent existe → Ajouter l'enfant
        const updatedChildren = existing.children || [];

        // Vérifier si cet enfant n'est pas déjà lié
        const alreadyLinked = updatedChildren.some(
          child => child.childId === studentData.id && child.universityId === universityId
        );

        if (alreadyLinked) {
          throw new Error('Cet enfant est déjà lié à ce parent');
        }

        updatedChildren.push({
          childId: studentData.id,
          universityId: universityId,
          childName: `${studentData.firstName} ${studentData.lastName}`,
          relationship: relationship,
          addedBy: adminUid,
          addedAt: Date.now()
        });

        // Mettre à jour l'index d'accès sécurisé
        const updatedAccess = existing.childrenAccess || {};
        if (!updatedAccess[universityId]) {
          updatedAccess[universityId] = {};
        }
        updatedAccess[universityId][studentData.id] = true;

        await update(ref(database, `users/${existing.uid}`), {
          children: updatedChildren,
          childrenAccess: updatedAccess
        });

        setSuccess({
          isNew: false,
          parentName: existing.displayName,
          email: loginMethod === 'phone' ? null : primaryEmail,
          phone: parentPhone,
          childName: `${studentData.firstName} ${studentData.lastName}`
        });

        console.log(`
📧 EMAIL/SMS À ENVOYER AU PARENT (${loginMethod === 'phone' ? parentPhone : primaryEmail}) :

Bonjour ${existing.displayName},

Un nouvel enfant a été ajouté à votre compte parent :
- ${studentData.firstName} ${studentData.lastName} (${universityId})

Vous pouvez maintenant suivre ses notes depuis votre compte.
Connectez-vous sur https://university-saas.com/login
        `);

      } else {
        // Parent n'existe pas → Créer le compte
        const tempPassword = generateTempPassword();

        // Créer compte Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          primaryEmail,
          tempPassword
        );

        const parentUid = userCredential.user.uid;

        // Créer l'index d'accès sécurisé
        const childrenAccess = {};
        childrenAccess[universityId] = {};
        childrenAccess[universityId][studentData.id] = true;

        // Créer profil parent
        await set(ref(database, `users/${parentUid}`), {
          email: primaryEmail,
          loginMethod: loginMethod,
          phoneNumber: parentPhone,
          displayName: parentName,
          role: 'parent',
          universityId: null,
          children: [
            {
              childId: studentData.id,
              universityId: universityId,
              childName: `${studentData.firstName} ${studentData.lastName}`,
              relationship: relationship,
              addedBy: adminUid,
              addedAt: Date.now()
            }
          ],
          childrenAccess: childrenAccess,
          mustChangePassword: true,
          createdAt: Date.now(),
          lastLogin: null,
          preferences: {
            language: 'fr',
            notifications: true
          }
        });

        setSuccess({
          isNew: true,
          parentName: parentName,
          email: loginMethod === 'phone' ? null : primaryEmail,
          phone: parentPhone,
          tempPassword: tempPassword,
          loginIdentifier: loginMethod === 'phone' ? parentPhone : primaryEmail,
          childName: `${studentData.firstName} ${studentData.lastName}`
        });

        console.log(`
📧 EMAIL/SMS À ENVOYER AU PARENT :

Bonjour ${parentName},

Un compte parent a été créé pour suivre la scolarité de :
- ${studentData.firstName} ${studentData.lastName} (${universityId})

Identifiant : ${loginMethod === 'phone' ? parentPhone : primaryEmail}
Mot de passe temporaire : ${tempPassword}

Connectez-vous sur https://university-saas.com/login
Vous devrez changer votre mot de passe à la première connexion.
        `);
      }

    } catch (err) {
      console.error('Error creating/linking parent:', err);
      setError(err.message || 'Erreur lors de la création du compte parent');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      parentName: '',
      parentEmail: '',
      parentPhone: '',
      relationship: 'père'
    });
    setError('');
    setSuccess(null);
    setExistingParent(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Créer/Lier un Compte Parent</h2>
                <p className="text-indigo-100 text-sm mt-1">
                  Pour l'étudiant : {studentData.firstName} {studentData.lastName}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nom du parent */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <User className="inline h-4 w-4 mr-2" />
                  Nom complet du parent *
                </label>
                <input
                  type="text"
                  value={formData.parentName}
                  onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                  placeholder="Pierre Leroux"
                  required
                  disabled={loading}
                />
              </div>

              {/* Email (optionnel) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Mail className="inline h-4 w-4 mr-2" />
                  Email (optionnel)
                </label>
                <input
                  type="email"
                  value={formData.parentEmail}
                  onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                  placeholder="parent@example.com"
                  disabled={loading}
                />
                <p className="mt-2 text-xs text-gray-500">
                  Si le parent n'a pas d'email, laissez ce champ vide
                </p>
              </div>

              {/* Téléphone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Phone className="inline h-4 w-4 mr-2" />
                  Numéro de téléphone *
                </label>
                <input
                  type="tel"
                  value={formData.parentPhone}
                  onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                  placeholder="+33 6 12 34 56 78"
                  required
                  disabled={loading}
                />
                <p className="mt-2 text-xs text-gray-500">
                  Format international recommandé (ex: +33 6 12 34 56 78)
                </p>
              </div>

              {/* Relation */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Relation avec l'enfant *
                </label>
                <select
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                  required
                  disabled={loading}
                >
                  <option value="père">Père</option>
                  <option value="mère">Mère</option>
                  <option value="tuteur">Tuteur légal</option>
                </select>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                  <strong>ℹ️ Comment ça marche :</strong>
                  <br />
                  • Si ce parent existe déjà (même email ou téléphone), l'enfant sera ajouté à son compte
                  <br />
                  • Si c'est un nouveau parent, un mot de passe temporaire sera généré
                  <br />
                  • Les identifiants seront affichés dans la console (à copier pour le parent)
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? 'Traitement...' : 'Créer/Lier le compte'}
                </button>
              </div>
            </form>
          ) : (
            /* Success Message */
            <div className="space-y-6">
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 flex items-start gap-4">
                <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-green-900 mb-2">
                    {success.isNew ? '✅ Compte parent créé avec succès !' : '✅ Enfant ajouté au compte parent existant !'}
                  </h3>
                  <p className="text-green-800 mb-4">
                    {success.isNew
                      ? `Un nouveau compte a été créé pour ${success.parentName}`
                      : `L'enfant ${success.childName} a été ajouté au compte de ${success.parentName}`
                    }
                  </p>

                  {/* Identifiants à copier */}
                  <div className="bg-white border border-green-200 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-semibold text-gray-700 mb-3">
                      📋 Identifiants à communiquer au parent :
                    </p>

                    {success.email && (
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-600">Email :</span>
                        <code className="text-sm font-mono bg-white px-3 py-1 rounded border">
                          {success.email}
                        </code>
                      </div>
                    )}

                    {success.phone && (
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-600">Téléphone :</span>
                        <code className="text-sm font-mono bg-white px-3 py-1 rounded border">
                          {success.phone}
                        </code>
                      </div>
                    )}

                    {success.isNew && success.tempPassword && (
                      <>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-600">Identifiant de connexion :</span>
                          <code className="text-sm font-mono bg-white px-3 py-1 rounded border">
                            {success.loginIdentifier}
                          </code>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                          <span className="text-sm text-gray-600">Mot de passe temporaire :</span>
                          <code className="text-sm font-mono bg-white px-3 py-1 rounded border font-bold text-orange-600">
                            {success.tempPassword}
                          </code>
                        </div>
                      </>
                    )}
                  </div>

                  <p className="text-xs text-gray-600 mt-4">
                    💡 Ces identifiants ont également été affichés dans la console du navigateur
                    {success.isNew && ' • Le parent devra changer son mot de passe à la première connexion'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Terminé
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
