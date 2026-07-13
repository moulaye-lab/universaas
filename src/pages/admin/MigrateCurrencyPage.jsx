/**
 * MigrateCurrencyPage.jsx - Migration pour ajouter currency aux universités existantes
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function MigrateCurrencyPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState('XOF');

  const currencies = [
    { code: 'EUR', name: 'Euro (€)' },
    { code: 'USD', name: 'Dollar américain ($)' },
    { code: 'GBP', name: 'Livre sterling (£)' },
    { code: 'XOF', name: 'Franc CFA BCEAO (CFA)' },
    { code: 'XAF', name: 'Franc CFA BEAC (FCFA)' },
    { code: 'MAD', name: 'Dirham marocain (DH)' },
    { code: 'CAD', name: 'Dollar canadien (C$)' },
    { code: 'CHF', name: 'Franc suisse (CHF)' }
  ];

  const handleMigrate = async () => {
    if (!userProfile?.universityId) {
      setResult({ success: false, message: 'Université non trouvée' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Vérifier si le champ existe déjà
      const currencyRef = ref(database, `universities/${userProfile.universityId}/info/currency`);
      const currencySnap = await get(currencyRef);

      if (currencySnap.exists()) {
        setResult({
          success: true,
          message: `✅ Le champ currency existe déjà : ${currencySnap.val()}`,
          alreadyExists: true
        });
        setLoading(false);
        return;
      }

      // Ajouter le champ currency
      const infoRef = ref(database, `universities/${userProfile.universityId}/info`);
      await update(infoRef, {
        currency: selectedCurrency,
        timezone: 'Europe/Paris', // Ajouter timezone aussi si manquant
        updatedAt: Date.now()
      });

      setResult({
        success: true,
        message: `✅ Migration réussie ! Devise configurée : ${selectedCurrency}`
      });

      // Rediriger après 2 secondes
      setTimeout(() => {
        navigate('/dashboard/admin');
      }, 2000);

    } catch (error) {
      console.error('Migration error:', error);
      setResult({
        success: false,
        message: `❌ Erreur : ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="glass rounded-3xl p-8">
          <h1 className="text-3xl font-black text-gray-900 mb-4">
            🔧 Migration Currency
          </h1>
          <p className="text-gray-600 mb-6">
            Ajouter le champ de devise à votre université pour activer la gestion multi-devises.
          </p>

          {/* Sélection de devise */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Sélectionnez votre devise
            </label>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
              disabled={loading}
            >
              {currencies.map(curr => (
                <option key={curr.code} value={curr.code}>
                  {curr.name}
                </option>
              ))}
            </select>
          </div>

          {/* Bouton de migration */}
          <button
            onClick={handleMigrate}
            disabled={loading}
            className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold text-lg hover:from-blue-600 hover:to-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '⏳ Migration en cours...' : '🚀 Lancer la migration'}
          </button>

          {/* Résultat */}
          {result && (
            <div className={`mt-6 p-4 rounded-xl border-2 ${
              result.success
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <p className="font-semibold">{result.message}</p>
              {result.success && !result.alreadyExists && (
                <p className="text-sm mt-2">
                  Redirection vers le dashboard dans 2 secondes...
                </p>
              )}
            </div>
          )}

          {/* Informations */}
          <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <h3 className="font-bold text-blue-900 mb-2">ℹ️ Informations</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Cette migration ajoute le champ <code className="bg-blue-100 px-1 rounded">currency</code> dans vos paramètres</li>
              <li>• Tous les montants s'afficheront dans la devise choisie</li>
              <li>• Vous pourrez changer la devise dans les Paramètres</li>
            </ul>
          </div>

          {/* Retour */}
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="mt-4 w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
            disabled={loading}
          >
            ← Retour au dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
