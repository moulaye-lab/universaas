/**
 * Modal de création d'une nouvelle université
 * Utilisé par le Super Admin
 */

import { useState, useEffect } from 'react';
import { X, Building2, Mail, Lock, CreditCard, AlertCircle, CheckCircle, Loader, RefreshCw, Wand2 } from 'lucide-react';
import { ref, set, get } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

export default function CreateUniversityModal({ isOpen, onClose, onSuccess }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
  const [formData, setFormData] = useState({
    universityName: '',
    adminEmail: '',
    adminPassword: '12345678', // Mot de passe par défaut
    adminFirstName: '',
    adminLastName: '',
    subscriptionPlan: 'standard',
    maxStudents: 500,
    currency: 'EUR',
    timezone: 'Europe/Paris',
  });

  // Auto-générer prénom/nom admin basé sur le nom de l'université
  const generateAdminNames = () => {
    if (!formData.universityName) return;
    const slug = generateSlug(formData.universityName).replace('univ-', '').replace(/-\d{4}$/, '');
    const capitalizedName = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
    setFormData({
      ...formData,
      adminFirstName: 'Admin',
      adminLastName: capitalizedName,
    });
  };

  // Générer un mot de passe aléatoire sécurisé
  const generatePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  // Auto-générer suggestions email basées sur le nom de l'université
  const getEmailSuggestions = () => {
    if (!formData.universityName) return [];
    const slug = generateSlug(formData.universityName).replace('univ-', '').replace(/-\d{4}$/, '');
    return [
      `admin@${slug}.fr`,
      `contact@${slug}.edu`,
      `direction@${slug}.fr`,
      `secretariat@${slug}.edu`,
    ];
  };

  if (!isOpen) return null;

  const generateSlug = (name) => {
    return 'univ-' + name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Retirer accents
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 30) + '-' + new Date().getFullYear();
  };

  const getPlanPrice = (plan, currency = 'EUR') => {
    const basePrices = {
      standard: 149,
      premium: 299,
      enterprise: 599
    };

    const basePrice = basePrices[plan] || 149;

    // Taux de conversion approximatifs (EUR comme base)
    const conversionRates = {
      EUR: 1,
      USD: 1.08,
      GBP: 0.86,
      MAD: 10.8,
      XOF: 655,
      CAD: 1.47,
      CHF: 0.95
    };

    const convertedPrice = Math.round(basePrice * (conversionRates[currency] || 1));
    return convertedPrice;
  };

  const getCurrencySymbol = (currency) => {
    const symbols = {
      EUR: '€',
      USD: '$',
      GBP: '£',
      MAD: 'DH',
      XOF: 'CFA',
      CAD: '$',
      CHF: 'Fr'
    };
    return symbols[currency] || currency;
  };

  const getPlanMaxStudents = (plan) => {
    const limits = {
      standard: 500,
      premium: 2000,
      enterprise: 10000
    };
    return limits[plan] || 500;
  };

  const handlePlanChange = (plan) => {
    setFormData({
      ...formData,
      subscriptionPlan: plan,
      maxStudents: getPlanMaxStudents(plan)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validation
      if (!formData.universityName || !formData.adminEmail || !formData.adminPassword) {
        throw new Error('Veuillez remplir tous les champs obligatoires');
      }

      if (formData.adminPassword.length < 8) {
        throw new Error('Le mot de passe doit contenir au moins 8 caractères');
      }

      // Générer l'ID unique de l'université
      const universitySlug = generateSlug(formData.universityName);
      const universityId = universitySlug;

      // Vérifier que l'université n'existe pas déjà
      const universityRef = ref(database, `universities/${universityId}`);
      const universitySnap = await get(universityRef);

      if (universitySnap.exists()) {
        throw new Error('Une université avec ce nom existe déjà. Veuillez choisir un autre nom.');
      }

      // 1. Créer l'utilisateur via API REST Firebase (ne déconnecte pas le super admin)
      const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
      const createUserResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.adminEmail,
            password: formData.adminPassword,
            returnSecureToken: false
          })
        }
      );

      if (!createUserResponse.ok) {
        const errorData = await createUserResponse.json();
        throw new Error(errorData.error?.message || 'Erreur lors de la création du compte admin');
      }

      const userData = await createUserResponse.json();
      const adminUid = userData.localId;

      // 4. Créer le profil utilisateur admin
      await set(ref(database, `users/${adminUid}`), {
        email: formData.adminEmail,
        displayName: `${formData.adminFirstName} ${formData.adminLastName}`,
        firstName: formData.adminFirstName,
        lastName: formData.adminLastName,
        role: 'admin_universite',
        universityId: universityId,
        profileId: adminUid,
        loginMethod: 'email',
        mustChangePassword: true, // Admin devra changer son mot de passe
        temporaryPassword: formData.adminPassword, // Stocké temporairement pour l'admin
        createdAt: Date.now(),
        createdBy: currentUser?.uid,
      });

      // 5. Créer la structure complète de l'université
      const universityData = {
        info: {
          name: formData.universityName,
          slug: universitySlug,
          adminId: adminUid,
          adminEmail: formData.adminEmail,
          subscriptionPlan: formData.subscriptionPlan,
          subscriptionStatus: 'active',
          maxStudents: formData.maxStudents,
          currentStudents: 0,
          price: getPlanPrice(formData.subscriptionPlan, formData.currency),
          currency: formData.currency,
          timezone: formData.timezone,
          createdAt: Date.now(),
          createdBy: currentUser?.uid,
          trialEndsAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 jours
        },
        students: {
          // Vide au départ
          _placeholder: true
        },
        teachers: {
          // Vide au départ
          _placeholder: true
        },
        courses: {
          // Vide au départ
          _placeholder: true
        },
        grades: {
          // Vide au départ
          _placeholder: true
        },
        payments: {
          // Vide au départ
          _placeholder: true
        },
        liveSessions: {
          // Vide au départ
          _placeholder: true
        },
        library: {
          // Vide au départ
          _placeholder: true
        },
        notifications: {
          // Notification de bienvenue
          welcome: {
            title: 'Bienvenue sur UniverSaaS !',
            message: `Votre université ${formData.universityName} a été créée avec succès. Commencez par créer des enseignants et des étudiants.`,
            type: 'info',
            createdAt: Date.now(),
            read: false,
          }
        },
        audit: {
          // Premier log d'audit
          [Date.now()]: {
            action: 'university_created',
            userId: currentUser?.uid,
            details: {
              universityName: formData.universityName,
              adminEmail: formData.adminEmail,
              plan: formData.subscriptionPlan,
            },
            timestamp: Date.now(),
          }
        }
      };

      await set(ref(database, `universities/${universityId}`), universityData);

      // 6. Mettre à jour les stats de la plateforme
      const platformRef = ref(database, 'platform/analytics');
      const platformSnap = await get(platformRef);
      let platformStats = platformSnap.exists() ? platformSnap.val() : {
        totalUniversities: 0,
        activeUniversities: 0,
        totalStudents: 0,
        totalTeachers: 0,
        monthlyRevenue: 0,
        yearlyRevenue: 0,
        growthRate: 0,
      };

      platformStats.totalUniversities = (platformStats.totalUniversities || 0) + 1;
      platformStats.activeUniversities = (platformStats.activeUniversities || 0) + 1;
      // Convertir en EUR pour les stats globales de la plateforme
      const priceInEUR = getPlanPrice(formData.subscriptionPlan, 'EUR');
      platformStats.monthlyRevenue = (platformStats.monthlyRevenue || 0) + priceInEUR;
      platformStats.yearlyRevenue = (platformStats.yearlyRevenue || 0) + (priceInEUR * 12);

      await set(platformRef, platformStats);

      // Succès
      onSuccess({
        universityId,
        universityName: formData.universityName,
        adminEmail: formData.adminEmail,
      });

      // Reset form
      setFormData({
        universityName: '',
        adminEmail: '',
        adminPassword: '12345678',
        adminFirstName: '',
        adminLastName: '',
        subscriptionPlan: 'standard',
        maxStudents: 500,
        currency: 'EUR',
        timezone: 'Europe/Paris',
      });

      onClose();

    } catch (error) {
      console.error('Error creating university:', error);
      setError(error.message || 'Erreur lors de la création de l\'université');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-xl">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Nouvelle Université</h2>
                <p className="text-indigo-100 text-sm">Créer une nouvelle institution cliente</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* Section: Université */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-indigo-600" />
              Informations de l'université
            </h3>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nom de l'université *
              </label>
              <input
                type="text"
                value={formData.universityName}
                onChange={(e) => setFormData({ ...formData, universityName: e.target.value })}
                placeholder="Ex: Université Sorbonne Paris"
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                required
              />
              {formData.universityName && (
                <p className="mt-2 text-sm text-gray-600">
                  ID généré: <span className="font-mono font-semibold text-indigo-600">{generateSlug(formData.universityName)}</span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Devise *
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                  required
                >
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="USD">USD ($) - Dollar US</option>
                  <option value="GBP">GBP (£) - Livre Sterling</option>
                  <option value="MAD">MAD (DH) - Dirham Marocain</option>
                  <option value="XOF">XOF (CFA) - Franc CFA</option>
                  <option value="CAD">CAD ($) - Dollar Canadien</option>
                  <option value="CHF">CHF (Fr) - Franc Suisse</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fuseau horaire *
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                  required
                >
                  <option value="Europe/Paris">Europe/Paris (GMT+1)</option>
                  <option value="Europe/London">Europe/London (GMT+0)</option>
                  <option value="America/New_York">America/New_York (GMT-5)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (GMT-8)</option>
                  <option value="Africa/Casablanca">Africa/Casablanca (GMT+0)</option>
                  <option value="Africa/Abidjan">Africa/Abidjan (GMT+0)</option>
                  <option value="Africa/Dakar">Africa/Dakar (GMT+0)</option>
                  <option value="America/Montreal">America/Montreal (GMT-5)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Administrateur */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Mail className="h-5 w-5 text-indigo-600" />
              Compte administrateur
            </h3>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Prénom et Nom de l'admin *
                </label>
                {formData.universityName && (
                  <button
                    type="button"
                    onClick={generateAdminNames}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
                  >
                    <Wand2 className="h-3 w-3" />
                    Auto-générer
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  value={formData.adminFirstName}
                  onChange={(e) => setFormData({ ...formData, adminFirstName: e.target.value })}
                  placeholder="Admin"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                  required
                />
                <input
                  type="text"
                  value={formData.adminLastName}
                  onChange={(e) => setFormData({ ...formData, adminLastName: e.target.value })}
                  placeholder="Université"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                  required
                />
              </div>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Email administrateur *
                </label>
                {formData.universityName && (
                  <button
                    type="button"
                    onClick={() => setShowEmailSuggestions(!showEmailSuggestions)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
                  >
                    <Wand2 className="h-3 w-3" />
                    Suggestions
                  </button>
                )}
              </div>
              <input
                type="email"
                value={formData.adminEmail}
                onChange={(e) => {
                  setFormData({ ...formData, adminEmail: e.target.value });
                  setShowEmailSuggestions(false);
                }}
                placeholder="admin@universite.fr"
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                required
              />
              {showEmailSuggestions && formData.universityName && (
                <div className="absolute z-10 mt-2 w-full bg-white border-2 border-indigo-200 rounded-xl shadow-lg overflow-hidden">
                  {getEmailSuggestions().map((email, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, adminEmail: email });
                        setShowEmailSuggestions(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors text-sm font-medium text-gray-700 hover:text-indigo-700"
                    >
                      {email}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Mot de passe temporaire *
                </label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, adminPassword: generatePassword() })}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Générer
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.adminPassword}
                  onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                  placeholder="Minimum 8 caractères"
                  className="flex-1 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none font-mono"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, adminPassword: '12345678' })}
                  className="px-4 py-3 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl font-semibold text-sm transition-colors"
                >
                  Par défaut
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-600">
                💡 Par défaut : <span className="font-mono font-semibold">12345678</span> (simple pour les tests)
              </p>
              <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                <Lock className="h-3 w-3" />
                L'admin devra changer ce mot de passe à la première connexion
              </p>
            </div>
          </div>

          {/* Section: Plan d'abonnement */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-600" />
              Plan d'abonnement
            </h3>

            <div className="grid grid-cols-3 gap-4">
              {/* Standard */}
              <button
                type="button"
                onClick={() => handlePlanChange('standard')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  formData.subscriptionPlan === 'standard'
                    ? 'border-indigo-500 bg-indigo-50 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-bold text-gray-900">Standard</p>
                <p className="text-2xl font-black text-indigo-600 my-2">
                  {getPlanPrice('standard', formData.currency)}{getCurrencySymbol(formData.currency)}
                </p>
                <p className="text-xs text-gray-600">/mois</p>
                <p className="text-xs text-gray-600 mt-2">500 étudiants max</p>
              </button>

              {/* Premium */}
              <button
                type="button"
                onClick={() => handlePlanChange('premium')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  formData.subscriptionPlan === 'premium'
                    ? 'border-purple-500 bg-purple-50 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-bold text-gray-900">Premium</p>
                <p className="text-2xl font-black text-purple-600 my-2">
                  {getPlanPrice('premium', formData.currency)}{getCurrencySymbol(formData.currency)}
                </p>
                <p className="text-xs text-gray-600">/mois</p>
                <p className="text-xs text-gray-600 mt-2">2000 étudiants max</p>
              </button>

              {/* Enterprise */}
              <button
                type="button"
                onClick={() => handlePlanChange('enterprise')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  formData.subscriptionPlan === 'enterprise'
                    ? 'border-pink-500 bg-pink-50 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-bold text-gray-900">Enterprise</p>
                <p className="text-2xl font-black text-pink-600 my-2">
                  {getPlanPrice('enterprise', formData.currency)}{getCurrencySymbol(formData.currency)}
                </p>
                <p className="text-xs text-gray-600">/mois</p>
                <p className="text-xs text-gray-600 mt-2">10000+ étudiants</p>
              </button>
            </div>
          </div>

          {/* Résumé */}
          <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4">
            <h4 className="font-bold text-indigo-900 mb-2">Récapitulatif</h4>
            <ul className="space-y-1 text-sm text-indigo-700">
              <li>• Université: <span className="font-semibold">{formData.universityName || 'Non défini'}</span></li>
              <li>• Admin: <span className="font-semibold">{formData.adminEmail || 'Non défini'}</span></li>
              <li>• Plan: <span className="font-semibold capitalize">{formData.subscriptionPlan}</span> ({getPlanPrice(formData.subscriptionPlan, formData.currency)}{getCurrencySymbol(formData.currency)}/mois)</li>
              <li>• Capacité: <span className="font-semibold">{formData.maxStudents} étudiants</span></li>
              <li>• Devise: <span className="font-semibold">{formData.currency}</span></li>
              <li>• Fuseau: <span className="font-semibold">{formData.timezone}</span></li>
              <li>• Période d'essai: <span className="font-semibold">30 jours gratuits</span></li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t-2 border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Créer l'université
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
