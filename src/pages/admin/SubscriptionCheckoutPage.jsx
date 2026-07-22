/**
 * SubscriptionCheckoutPage.jsx - Page de paiement simulé
 *
 * Fonctionnalités:
 * - Formulaire de carte bancaire simulé
 * - Validation du paiement
 * - Activation de l'abonnement
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  PLANS,
  simulatePayment,
  activateSubscription
} from '../../services/subscriptionService';
import {
  CreditCard,
  Lock,
  ArrowLeft,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function SubscriptionCheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile } = useAuth();

  const planId = location.state?.planId || 'basic';
  const plan = PLANS[planId];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    cardNumber: '',
    cardholderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Format automatique du numéro de carte
    if (name === 'cardNumber') {
      const cleaned = value.replace(/\D/g, '').slice(0, 16);
      setFormData({ ...formData, [name]: cleaned });
      return;
    }

    // Limiter CVV à 3 chiffres
    if (name === 'cvv') {
      const cleaned = value.replace(/\D/g, '').slice(0, 3);
      setFormData({ ...formData, [name]: cleaned });
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Simuler le paiement
      const paymentResult = await simulatePayment({
        ...formData,
        amount: plan.price
      });

      // Activer l'abonnement
      const activationResult = await activateSubscription(
        userProfile.universityId,
        planId,
        paymentResult
      );

      if (activationResult.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/admin/subscription');
        }, 2000);
      } else {
        setError(activationResult.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (number) => {
    return number.replace(/(\d{4})/g, '$1 ').trim();
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl p-12 shadow-2xl text-center max-w-md">
          <CheckCircle className="h-20 w-20 text-green-600 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Paiement réussi !
          </h1>
          <p className="text-gray-600 mb-2">
            Votre abonnement <strong>{plan.name}</strong> est maintenant actif.
          </p>
          <p className="text-sm text-gray-500">
            Redirection en cours...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/50 rounded-lg transition"
          >
            <ArrowLeft className="h-6 w-6 text-gray-700" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Paiement sécurisé</h1>
            <p className="text-gray-600">Abonnement {plan.name}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Résumé de la commande */}
          <div className="bg-white rounded-2xl p-8 shadow-lg h-fit">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Résumé de la commande
            </h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Plan</span>
                <span className="font-semibold text-gray-900">{plan.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Période</span>
                <span className="text-gray-900">1 {plan.interval}</span>
              </div>
              <div className="border-t pt-4 flex justify-between text-xl">
                <span className="font-bold text-gray-900">Total</span>
                <span className="font-bold text-blue-600">
                  {plan.price}{plan.currency}/{plan.interval}
                </span>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Inclus dans ce plan :</h3>
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Lock className="h-4 w-4" />
              <span>Paiement 100% sécurisé (Mode simulation)</span>
            </div>
          </div>

          {/* Formulaire de paiement */}
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="flex items-center gap-2 mb-6">
              <CreditCard className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">
                Informations de paiement
              </h2>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Numéro de carte
                </label>
                <input
                  type="text"
                  name="cardNumber"
                  value={formatCardNumber(formData.cardNumber)}
                  onChange={handleInputChange}
                  placeholder="1234 5678 9012 3456"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Test: 4242424242424242 (succès) | 0000000000000000 (échec)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Titulaire de la carte
                </label>
                <input
                  type="text"
                  name="cardholderName"
                  value={formData.cardholderName}
                  onChange={handleInputChange}
                  placeholder="Jean Dupont"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Mois
                  </label>
                  <select
                    name="expiryMonth"
                    value={formData.expiryMonth}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">MM</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month.toString().padStart(2, '0')}>
                        {month.toString().padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Année
                  </label>
                  <select
                    name="expiryYear"
                    value={formData.expiryYear}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">AA</option>
                    {Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() % 100) + i).map(year => (
                      <option key={year} value={year.toString().padStart(2, '0')}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    CVV
                  </label>
                  <input
                    type="text"
                    name="cvv"
                    value={formData.cvv}
                    onChange={handleInputChange}
                    placeholder="123"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    Traitement...
                  </span>
                ) : (
                  `Payer ${plan.price}${plan.currency}`
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
