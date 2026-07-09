/**
 * UniversitySettingsPage.jsx - Paramètres de l'université
 *
 * Fonctionnalités:
 * - Définir la devise unique de l'université
 * - Autres paramètres généraux
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import {
  ChevronLeft,
  Settings,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Save,
  Calendar,
  Hash,
  Mail,
  Phone,
  MapPin,
  Globe,
  CreditCard
} from 'lucide-react';

const CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'Dollar américain' },
  { code: 'GBP', symbol: '£', name: 'Livre sterling' },
  { code: 'CHF', symbol: 'CHF', name: 'Franc suisse' },
  { code: 'CAD', symbol: 'C$', name: 'Dollar canadien' },
  { code: 'XOF', symbol: 'CFA', name: 'Franc CFA (BCEAO)' },
  { code: 'XAF', symbol: 'FCFA', name: 'Franc CFA (BEAC)' },
  { code: 'MAD', symbol: 'DH', name: 'Dirham marocain' },
  { code: 'TND', symbol: 'DT', name: 'Dinar tunisien' },
  { code: 'DZD', symbol: 'DA', name: 'Dinar algérien' }
];

export default function UniversitySettingsPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [university, setUniversity] = useState(null);
  const [formData, setFormData] = useState({
    currency: 'EUR',
    currentAcademicYear: '',
    matriculePrefix: '',
    emailDomain: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    website: '',
    paymentGracePeriod: 7,
    lateFeePercentage: 0
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadUniversityData();
  }, [userProfile]);

  const loadUniversityData = async () => {
    if (!userProfile?.universityId) return;

    try {
      setLoading(true);
      const univRef = ref(database, `universities/${userProfile.universityId}`);
      const univSnap = await get(univRef);

      if (univSnap.exists()) {
        const univData = univSnap.val();
        setUniversity(univData);

        // Charger les paramètres existants
        const currentYear = new Date().getFullYear();
        setFormData({
          currency: univData.currency || 'EUR',
          currentAcademicYear: univData.currentAcademicYear || `${currentYear}-${currentYear + 1}`,
          matriculePrefix: univData.matriculePrefix || '',
          emailDomain: univData.emailDomain || '',
          contactEmail: univData.contactEmail || univData.email || '',
          contactPhone: univData.contactPhone || univData.phone || '',
          address: univData.address || '',
          website: univData.website || '',
          paymentGracePeriod: univData.paymentGracePeriod || 7,
          lateFeePercentage: univData.lateFeePercentage || 0
        });
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading university:', err);
      setError('Erreur lors du chargement des données');
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validations
    if (formData.emailDomain && !formData.emailDomain.includes('.')) {
      setError('Le domaine email doit être valide (ex: universite.edu)');
      return;
    }

    if (formData.contactEmail && !formData.contactEmail.includes('@')) {
      setError('L\'email de contact doit être valide');
      return;
    }

    if (formData.lateFeePercentage < 0 || formData.lateFeePercentage > 100) {
      setError('Le taux de pénalité doit être entre 0 et 100%');
      return;
    }

    if (!confirm('Confirmer la mise à jour des paramètres de l\'université ?')) {
      return;
    }

    try {
      setSaving(true);

      const univRef = ref(database, `universities/${userProfile.universityId}`);
      await update(univRef, {
        currency: formData.currency,
        currencySymbol: CURRENCIES[formData.currency]?.symbol || '€',
        currentAcademicYear: formData.currentAcademicYear,
        matriculePrefix: formData.matriculePrefix.toUpperCase(),
        emailDomain: formData.emailDomain.toLowerCase(),
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        address: formData.address,
        website: formData.website,
        paymentGracePeriod: parseInt(formData.paymentGracePeriod) || 7,
        lateFeePercentage: parseFloat(formData.lateFeePercentage) || 0,
        updatedAt: Date.now(),
        updatedBy: userProfile.displayName
      });

      setSuccess('✅ Paramètres mis à jour avec succès!');
      setSaving(false);

      // Recharger après 2 secondes
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Erreur lors de la sauvegarde: ' + err.message);
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-gray-900 text-xl">Chargement...</div>
      </div>
    );
  }

  const currentCurrency = CURRENCIES[formData.currency];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/dashboard/admin')}
              className="p-2 hover:bg-white rounded-xl transition shadow-sm"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Settings className="h-8 w-8 text-indigo-600" />
                Paramètres de l'Université
              </h1>
              <p className="text-gray-600 mt-1">{university?.name}</p>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <div className="glass rounded-2xl p-8">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Section Devise */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-bold text-gray-900">Devise de l'université</h2>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 mb-6 border-l-4 border-blue-500">
                <p className="text-sm text-gray-700">
                  <strong>Important:</strong> La devise définie ici sera utilisée partout dans l'application
                  (paiements, comptabilité, statistiques, etc.). Choisissez avec soin.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Devise actuelle
                  </label>
                  <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
                        {currentCurrency?.symbol}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-lg">{currentCurrency?.name}</p>
                        <p className="text-sm text-gray-600">Code: {currentCurrency?.code}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Changer de devise <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.currency}
                    onChange={(e) => handleChange('currency', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
                  >
                    {Object.values(CURRENCIES).map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.symbol} - {currency.name} ({currency.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section Année Académique */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">Année académique</h2>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Année en cours <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.currentAcademicYear}
                  onChange={(e) => handleChange('currentAcademicYear', e.target.value)}
                  placeholder="Ex: 2026-2027"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Format: AAAA-AAAA (ex: 2026-2027)</p>
              </div>
            </div>

            {/* Section Matricule */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Hash className="h-6 w-6 text-purple-600" />
                <h2 className="text-xl font-bold text-gray-900">Format des matricules</h2>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Préfixe du matricule
                </label>
                <input
                  type="text"
                  value={formData.matriculePrefix}
                  onChange={(e) => handleChange('matriculePrefix', e.target.value.toUpperCase())}
                  placeholder="Ex: UNIV, ETU, STD"
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Les matricules seront générés automatiquement: {formData.matriculePrefix || 'XXX'}-2026-001, {formData.matriculePrefix || 'XXX'}-2026-002, etc.
                </p>
              </div>
            </div>

            {/* Section Contact */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="h-6 w-6 text-orange-600" />
                <h2 className="text-xl font-bold text-gray-900">Informations de contact</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="h-4 w-4 inline mr-1" />
                    Email de contact
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => handleChange('contactEmail', e.target.value)}
                    placeholder="contact@universite.edu"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="h-4 w-4 inline mr-1" />
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => handleChange('contactPhone', e.target.value)}
                    placeholder="+33 1 23 45 67 89"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Adresse complète
                  </label>
                  <textarea
                    rows={3}
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="123 Rue de l'Université, 75000 Paris, France"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Globe className="h-4 w-4 inline mr-1" />
                    Site web
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    placeholder="https://www.universite.edu"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="h-4 w-4 inline mr-1" />
                    Domaine email institutionnel
                  </label>
                  <input
                    type="text"
                    value={formData.emailDomain}
                    onChange={(e) => handleChange('emailDomain', e.target.value.toLowerCase())}
                    placeholder="universite.edu"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent lowercase"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Les étudiants auront des emails: prenom.nom@{formData.emailDomain || 'universite.edu'}
                  </p>
                </div>
              </div>
            </div>

            {/* Section Règles de Paiement */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="h-6 w-6 text-red-600" />
                <h2 className="text-xl font-bold text-gray-900">Règles de paiement</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Délai de grâce (jours)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={formData.paymentGracePeriod}
                    onChange={(e) => handleChange('paymentGracePeriod', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Nombre de jours après la date d'échéance avant qu'un paiement soit considéré en retard
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pénalité de retard (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.lateFeePercentage}
                    onChange={(e) => handleChange('lateFeePercentage', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Pourcentage appliqué sur le montant en retard (0 = pas de pénalité)
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-start gap-2">
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{success}</p>
              </div>
            )}

            {/* Bouton */}
            <div className="pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save className="h-5 w-5" />
                {saving ? 'Sauvegarde...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </form>
        </div>

        {/* Info supplémentaire */}
        <div className="mt-6 bg-amber-50 rounded-2xl p-6 border-l-4 border-amber-500">
          <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            Note importante
          </h3>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>Tous les montants existants restent inchangés (pas de conversion automatique)</li>
            <li>Seule l'affichage du symbole de devise sera mis à jour</li>
            <li>Les nouveaux paiements et transactions utiliseront la nouvelle devise</li>
            <li>Il est recommandé de définir la devise dès le début et de ne plus la changer</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
