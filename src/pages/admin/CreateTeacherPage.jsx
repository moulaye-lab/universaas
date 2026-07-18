/**
 * Page de création d'un enseignant
 * Accessible uniquement par admin_universite
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ref, set, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { ArrowLeft, UserCheck, Mail, Phone, BookOpen, Building2, CheckCircle, AlertCircle, Loader, Wand2, RefreshCw } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';

export default function CreateTeacherPage() {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    department: '',
    specialization: '',
    assignedCourses: [],
    password: '12345678',
  });

  const departments = [
    'Mathématiques',
    'Informatique',
    'Physique',
    'Chimie',
    'Biologie',
    'Littérature',
    'Histoire',
    'Géographie',
    'Langues',
    'Économie',
    'Droit',
    'Médecine',
    'Ingénierie',
    'Arts',
    'Sport',
  ];

  const generateEmail = () => {
    if (!formData.firstName || !formData.lastName) {
      alert('Veuillez d\'abord renseigner le prénom et le nom');
      return;
    }
    const email = `${formData.firstName.toLowerCase()}.${formData.lastName.toLowerCase()}@${userProfile.universityId.replace('univ-', '').replace(/-\d{4}$/, '')}.fr`;
    setFormData({ ...formData, email });
  };

  const generatePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData({ ...formData, password });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validation
      if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
        throw new Error('Veuillez remplir tous les champs obligatoires');
      }

      if (formData.password.length < 8) {
        throw new Error('Le mot de passe doit contenir au moins 8 caractères');
      }

      // 1. Créer le compte via API REST Firebase (vérifie automatiquement si l'email existe)
      const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
      const createUserResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            returnSecureToken: false
          })
        }
      );

      if (!createUserResponse.ok) {
        const errorData = await createUserResponse.json();
        const errorMsg = errorData.error?.message || '';

        // Messages d'erreur en français
        if (errorMsg.includes('EMAIL_EXISTS')) {
          throw new Error('Cet email est déjà utilisé');
        } else if (errorMsg.includes('WEAK_PASSWORD')) {
          throw new Error('Le mot de passe est trop faible');
        } else if (errorMsg.includes('INVALID_EMAIL')) {
          throw new Error('L\'adresse email est invalide');
        }

        throw new Error('Erreur lors de la création du compte');
      }

      const userData = await createUserResponse.json();
      const teacherUid = userData.localId;
      let authAccountCreated = true;

      // 2. Créer le profil utilisateur
      try {
        const userProfileData = {
          email: formData.email,
          displayName: `${formData.firstName} ${formData.lastName}`,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: 'teacher',
          universityId: userProfile.universityId,
          profileId: teacherUid,
          loginMethod: 'email',
          mustChangePassword: true,
          temporaryPassword: formData.password,
          createdAt: Date.now(),
          createdBy: currentUser.uid,
        };

        // Ajouter phoneNumber seulement si non vide (éviter null qui échoue la validation)
        if (formData.phoneNumber && formData.phoneNumber.trim()) {
          userProfileData.phoneNumber = formData.phoneNumber.trim();
        }

        await set(ref(database, `users/${teacherUid}`), userProfileData);

        // 3. Créer le profil enseignant dans l'université
        const teacherData = {
          uid: teacherUid,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          department: formData.department,
          status: 'active',
          createdAt: Date.now(),
          createdBy: currentUser.uid,
        };

        // Ajouter champs optionnels seulement si non vides
        if (formData.phoneNumber && formData.phoneNumber.trim()) {
          teacherData.phoneNumber = formData.phoneNumber.trim();
        }
        if (formData.specialization && formData.specialization.trim()) {
          teacherData.specialization = formData.specialization.trim();
        }
        // Ne pas envoyer assignedCourses si tableau vide (Firebase convertit [] en null)
        // Sera ajouté plus tard lors de l'affectation des cours

        await set(ref(database, `universities/${userProfile.universityId}/teachers/${teacherUid}`), teacherData);

        // 4. Log d'audit
        await set(ref(database, `universities/${userProfile.universityId}/audit/${Date.now()}`), {
          action: 'teacher_created',
          userId: currentUser.uid,
          targetUserId: teacherUid,
          details: {
            teacherName: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            department: formData.department,
          },
          timestamp: Date.now(),
        });

        setSuccess(`✅ Enseignant ${formData.firstName} ${formData.lastName} créé avec succès !`);

        // Demander si l'admin veut créer un autre enseignant
        const createAnother = window.confirm(
          `✅ L'enseignant ${formData.firstName} ${formData.lastName} a été créé avec succès !\n\n` +
          `Voulez-vous créer un autre enseignant ?\n\n` +
          `• OUI → Rester sur cette page\n` +
          `• NON → Retour au dashboard`
        );

        if (createAnother) {
          // Reset formulaire (garder département pour faciliter la saisie)
          setFormData({
            firstName: '',
            lastName: '',
            email: '',
            phoneNumber: '',
            department: formData.department,
            specialization: '',
            assignedCourses: [],
            password: '12345678',
          });
          setSuccess('');
          setError('');
        } else {
          navigate('/dashboard/admin');
        }

      } catch (dbError) {
        console.error('❌ Erreur lors de la création du profil, rollback du compte Auth...', dbError);

        if (authAccountCreated && teacherUid) {
          try {
            const currentUserToken = await currentUser.getIdToken();
            const deleteResponse = await fetch(
              `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  idToken: currentUserToken,
                  localId: teacherUid
                })
              }
            );

            if (deleteResponse.ok) {
              console.log('✅ Compte orphelin supprimé avec succès:', teacherUid);
            } else {
              console.warn('⚠️ Impossible de supprimer le compte orphelin:', teacherUid, formData.email);
              console.warn('Action manuelle requise: Firebase Console > Authentication');
            }
          } catch (deleteError) {
            console.error('Erreur lors du rollback:', deleteError);
            console.warn('⚠️ Compte orphelin créé:', teacherUid, formData.email);
          }
        }

        throw new Error(`Échec de création: ${dbError.message}`);
      }

    } catch (error) {
      console.error('Error creating teacher:', error);
      setError(error.message || 'Erreur lors de la création de l\'enseignant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      {/* Header */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/10 border-b border-white/20 shadow-lg">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard/admin')}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-xl shadow-lg">
                  <UserCheck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Créer un Enseignant</h1>
                  <p className="text-sm text-indigo-200">Ajouter un nouveau professeur</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="backdrop-blur-xl bg-white/95 rounded-3xl shadow-2xl p-8">
          {/* Messages */}
          {error && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700 font-medium">{success}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section: Identité */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b-2 border-indigo-200 pb-2">
                <UserCheck className="h-5 w-5 text-indigo-600" />
                Informations personnelles
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Marie"
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Dupont"
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Email *
                  </label>
                  {formData.firstName && formData.lastName && (
                    <button
                      type="button"
                      onClick={generateEmail}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
                    >
                      <Wand2 className="h-3 w-3" />
                      Auto-générer
                    </button>
                  )}
                </div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="marie.dupont@universite.fr"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Téléphone (optionnel)
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="+33 6 12 34 56 78"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                />
              </div>
            </div>

            {/* Section: Académique */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b-2 border-indigo-200 pb-2">
                <BookOpen className="h-5 w-5 text-indigo-600" />
                Informations académiques
              </h3>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Département *
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                  required
                >
                  <option value="">Sélectionner un département</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Spécialisation (optionnel)
                </label>
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  placeholder="Ex: Analyse numérique, Intelligence artificielle..."
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                />
              </div>
            </div>

            {/* Section: Accès */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b-2 border-indigo-200 pb-2">
                <Mail className="h-5 w-5 text-indigo-600" />
                Accès au compte
              </h3>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Mot de passe temporaire *
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, password: '12345678' })}
                      className="text-xs text-amber-600 hover:text-amber-700 font-semibold"
                    >
                      Par défaut
                    </button>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Générer
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimum 8 caractères"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none font-mono"
                  minLength={8}
                  required
                />
                <p className="mt-2 text-xs text-amber-600">
                  💡 Par défaut : <span className="font-mono font-semibold">12345678</span>
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  L'enseignant devra changer ce mot de passe à la première connexion
                </p>
              </div>
            </div>

            {/* Résumé */}
            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4">
              <h4 className="font-bold text-indigo-900 mb-2">Récapitulatif</h4>
              <ul className="space-y-1 text-sm text-indigo-700">
                <li>• Nom complet: <span className="font-semibold">{formData.firstName} {formData.lastName || '...'}</span></li>
                <li>• Email: <span className="font-semibold">{formData.email || 'Non défini'}</span></li>
                <li>• Département: <span className="font-semibold">{formData.department || 'Non défini'}</span></li>
                <li>• Mot de passe: <span className="font-mono font-semibold">{formData.password}</span></li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard/admin')}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Créer l'enseignant
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
