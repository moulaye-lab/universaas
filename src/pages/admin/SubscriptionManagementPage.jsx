/**
 * SubscriptionManagementPage.jsx - Gestion de l'abonnement
 *
 * Fonctionnalités:
 * - Voir le plan actuel
 * - Changer de plan (upgrade/downgrade)
 * - Historique des paiements
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  PLANS,
  getSubscriptionStatus,
  changePlan
} from '../../services/subscriptionService';
import {
  CreditCard,
  ArrowLeft,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Calendar,
  TrendingUp
} from 'lucide-react';

export default function SubscriptionManagementPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    if (!userProfile?.universityId) return;

    setLoading(true);
    try {
      const result = await getSubscriptionStatus(userProfile.universityId);
      if (result.success) {
        setCurrentPlan(result.planId);
        setSubscription(result.subscription);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = (planId) => {
    navigate('/admin/subscription/checkout', { state: { planId } });
  };

  const handleChangePlan = async (newPlanId) => {
    if (!confirm(`Voulez-vous vraiment changer vers le plan ${PLANS[newPlanId].name} ?`)) {
      return;
    }

    const result = await changePlan(userProfile.universityId, newPlanId);
    if (result.success) {
      alert('✅ Plan modifié avec succès !');
      loadSubscription();
    } else {
      alert('❌ Erreur: ' + result.error);
    }
  };

  const getPlanComparison = (planId) => {
    const planKeys = Object.keys(PLANS);
    const currentIndex = planKeys.indexOf(currentPlan);
    const targetIndex = planKeys.indexOf(planId);

    if (targetIndex > currentIndex) return 'upgrade';
    if (targetIndex < currentIndex) return 'downgrade';
    return 'current';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-8">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="p-2 hover:bg-white/50 rounded-lg transition"
          >
            <ArrowLeft className="h-6 w-6 text-gray-700" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-blue-600" />
              Gestion de l'abonnement
            </h1>
            <p className="text-gray-600 mt-1">Gérez votre plan et vos paiements</p>
          </div>
        </div>

        {/* Plan actuel */}
        <div className="bg-white rounded-2xl p-8 shadow-lg mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Plan actuel</h2>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-3xl font-bold text-blue-600">
                  {PLANS[currentPlan]?.name}
                </h3>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full">
                  Actif
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-4">
                {PLANS[currentPlan]?.price}{PLANS[currentPlan]?.currency}
                <span className="text-lg font-normal text-gray-600">
                  /{PLANS[currentPlan]?.interval}
                </span>
              </p>

              {subscription?.nextBillingDate && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Prochain paiement le{' '}
                    {new Date(subscription.nextBillingDate).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-blue-50 rounded-xl p-6 max-w-xs">
              <h4 className="font-semibold text-gray-900 mb-3">Fonctionnalités incluses :</h4>
              <ul className="space-y-2">
                {PLANS[currentPlan]?.features.map((feature, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Tous les plans */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Changer de plan</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {Object.entries(PLANS).map(([planId, plan]) => {
              const comparison = getPlanComparison(planId);
              const isCurrent = comparison === 'current';

              return (
                <div
                  key={planId}
                  className={`bg-white rounded-2xl p-6 shadow-lg border-2 transition ${
                    isCurrent
                      ? 'border-blue-600'
                      : 'border-transparent hover:border-blue-300'
                  }`}
                >
                  {isCurrent && (
                    <div className="mb-4">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                        PLAN ACTUEL
                      </span>
                    </div>
                  )}

                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-3xl font-bold text-blue-600 mb-6">
                    {plan.price}{plan.currency}
                    <span className="text-lg font-normal text-gray-600">/{plan.interval}</span>
                  </p>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {!isCurrent && (
                    <button
                      onClick={() =>
                        comparison === 'upgrade'
                          ? handleUpgrade(planId)
                          : handleChangePlan(planId)
                      }
                      className={`w-full py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
                        comparison === 'upgrade'
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {comparison === 'upgrade' ? (
                        <>
                          <ArrowUp className="h-5 w-5" />
                          Upgrader
                        </>
                      ) : (
                        <>
                          <ArrowDown className="h-5 w-5" />
                          Downgrader
                        </>
                      )}
                    </button>
                  )}

                  {isCurrent && (
                    <div className="w-full py-3 text-center text-sm text-gray-500 font-medium">
                      Plan en cours d'utilisation
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Historique des paiements */}
        {subscription?.lastPayment && (
          <div className="mt-8 bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              Dernier paiement
            </h2>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm text-gray-600">Transaction ID</p>
                <p className="font-mono text-sm text-gray-900">
                  {subscription.lastPayment.transactionId}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Montant</p>
                <p className="text-lg font-bold text-gray-900">
                  {subscription.lastPayment.amount}€
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Date</p>
                <p className="text-sm text-gray-900">
                  {new Date(subscription.lastPayment.date).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
