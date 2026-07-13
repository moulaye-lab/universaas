/**
 * SubscriptionPlansPage.jsx - Page de choix du plan d'abonnement
 *
 * Permet à l'admin de:
 * - Voir les différents plans (Standard, Premium, Enterprise)
 * - Comparer les fonctionnalités
 * - Souscrire à un plan
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import Layout from '../../components/Layout';
import {
  Check,
  Sparkles,
  Zap,
  Crown,
  Loader,
  ArrowLeft,
  TrendingUp
} from 'lucide-react';

export default function SubscriptionPlansPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { subscription, loading: subLoading } = useSubscription(userProfile?.universityId);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  const plans = [
    {
      id: 'standard',
      name: 'Standard',
      price: 149,
      priceYearly: 1490,
      icon: Zap,
      color: 'blue',
      maxStudents: 500,
      popular: false,
      features: [
        'Jusqu\'à 500 étudiants',
        'Gestion complète étudiants & enseignants',
        'Système de notes & évaluations',
        'Gestion financière & paiements',
        'Absences et présences',
        'Messagerie interne',
        'Notifications en temps réel',
        'Tableaux de bord analytics',
        'Import/Export CSV',
        'Support email 48h',
        'Sauvegarde automatique',
        '10 Go de stockage'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 299,
      priceYearly: 2990,
      icon: Sparkles,
      color: 'purple',
      maxStudents: 2000,
      popular: true,
      features: [
        'Jusqu\'à 2000 étudiants',
        'Toutes les fonctionnalités Standard',
        'Assistant IA intégré',
        'Analytics avancées',
        'Emploi du temps intelligent',
        'API REST personnalisée',
        'Webhooks',
        'Import/Export illimité',
        'Multi-campus',
        'Support prioritaire 24h',
        'Formation équipe incluse',
        '100 Go de stockage',
        'Rapports personnalisés',
        'Intégrations tierces'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Sur devis',
      priceYearly: null,
      icon: Crown,
      color: 'amber',
      maxStudents: '∞',
      popular: false,
      features: [
        'Étudiants illimités',
        'Toutes les fonctionnalités Premium',
        'Serveur dédié',
        'Personnalisation complète (branding)',
        'SSO / LDAP / Active Directory',
        'SLA 99.9% garanti',
        'Gestionnaire de compte dédié',
        'Support 24/7 avec hotline',
        'Migration de données assistée',
        'Développement sur mesure',
        'Formation sur site',
        'Stockage illimité',
        'Conformité RGPD avancée',
        'Audit de sécurité annuel'
      ]
    }
  ];

  const handleSelectPlan = async (planId) => {
    if (planId === 'enterprise') {
      // Rediriger vers contact
      window.location.href = 'mailto:sales@universaas.com?subject=Demande Enterprise';
      return;
    }

    setSelectedPlan(planId);
    setLoading(true);

    try {
      // TODO: Intégrer Stripe/PayPal pour le paiement
      // Pour l'instant, simuler la souscription
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Rediriger vers page de paiement (à implémenter)
      navigate(`/admin/subscription/checkout?plan=${planId}`);
    } catch (error) {
      console.error('Error selecting plan:', error);
      alert('Erreur lors de la sélection du plan');
    } finally {
      setLoading(false);
    }
  };

  const getPlanColors = (color) => {
    const colors = {
      blue: {
        bg: 'from-blue-500 to-indigo-600',
        border: 'border-blue-500',
        button: 'bg-blue-600 hover:bg-blue-700',
        icon: 'bg-blue-100 text-blue-600'
      },
      purple: {
        bg: 'from-purple-500 to-pink-600',
        border: 'border-purple-500',
        button: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-xl',
        icon: 'bg-purple-100 text-purple-600'
      },
      amber: {
        bg: 'from-amber-500 to-orange-600',
        border: 'border-amber-500',
        button: 'bg-amber-600 hover:bg-amber-700',
        icon: 'bg-amber-100 text-amber-600'
      }
    };
    return colors[color] || colors.blue;
  };

  if (subLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <button
              onClick={() => navigate('/dashboard/admin')}
              className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-2 mx-auto"
            >
              <ArrowLeft className="h-5 w-5" />
              Retour au dashboard
            </button>

            {subscription?.isTrialing && (
              <div className="inline-block bg-indigo-100 text-indigo-800 px-4 py-2 rounded-full font-semibold mb-4">
                {subscription.daysRemaining > 0
                  ? `${subscription.daysRemaining} jour${subscription.daysRemaining > 1 ? 's' : ''} d'essai restant${subscription.daysRemaining > 1 ? 's' : ''}`
                  : 'Dernier jour d\'essai !'}
              </div>
            )}

            <h1 className="text-5xl font-black text-gray-900 mb-4">
              Choisissez votre plan
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Débloquez tout le potentiel de votre plateforme de gestion universitaire.
              Changez de plan à tout moment.
            </p>

            {/* Savings Badge */}
            <div className="mt-6 flex items-center justify-center gap-2 text-green-700">
              <TrendingUp className="h-5 w-5" />
              <span className="font-semibold">Économisez jusqu'à 17% avec la facturation annuelle</span>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {plans.map((plan) => {
              const colors = getPlanColors(plan.color);
              const Icon = plan.icon;
              const isSelected = selectedPlan === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden ${
                    plan.popular ? 'ring-4 ring-purple-500 scale-105' : ''
                  }`}
                >
                  {/* Popular Badge */}
                  {plan.popular && (
                    <div className="absolute top-0 right-0">
                      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-bl-2xl font-bold shadow-lg flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Le plus populaire
                      </div>
                    </div>
                  )}

                  <div className="p-8">
                    {/* Icon & Name */}
                    <div className="mb-6">
                      <div className={`${colors.icon} w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg`}>
                        <Icon className="h-8 w-8" />
                      </div>
                      <h3 className="text-3xl font-black text-gray-900">{plan.name}</h3>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      {typeof plan.price === 'number' ? (
                        <>
                          <div className="flex items-baseline gap-2">
                            <span className={`text-5xl font-black bg-gradient-to-r ${colors.bg} bg-clip-text text-transparent`}>
                              {plan.price}€
                            </span>
                            <span className="text-xl text-gray-600">/mois</span>
                          </div>
                          <p className="text-sm text-gray-500 mt-2">
                            ou {plan.priceYearly}€/an (2 mois gratuits)
                          </p>
                        </>
                      ) : (
                        <span className={`text-4xl font-black bg-gradient-to-r ${colors.bg} bg-clip-text text-transparent`}>
                          {plan.price}
                        </span>
                      )}
                      <p className="text-gray-600 font-semibold mt-2">
                        Jusqu'à <span className={`bg-gradient-to-r ${colors.bg} bg-clip-text text-transparent font-black`}>
                          {plan.maxStudents}
                        </span> étudiants
                      </p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm">
                          <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <button
                      onClick={() => handleSelectPlan(plan.id)}
                      disabled={loading && isSelected}
                      className={`w-full ${colors.button} text-white py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg disabled:opacity-50 flex items-center justify-center gap-2`}
                    >
                      {loading && isSelected ? (
                        <>
                          <Loader className="h-5 w-5 animate-spin" />
                          Chargement...
                        </>
                      ) : plan.id === 'enterprise' ? (
                        'Nous contacter'
                      ) : (
                        `Choisir ${plan.name}`
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FAQ / Reassurance */}
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              🔒 Paiement 100% sécurisé
            </h3>
            <p className="text-gray-600 mb-6">
              Vos données bancaires sont protégées avec un chiffrement de niveau bancaire.
              Vous pouvez annuler à tout moment, sans frais.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                Essai gratuit 14 jours
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                Pas d'engagement
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                Annulation en 1 clic
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                Support inclus
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
