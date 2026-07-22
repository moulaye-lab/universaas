/**
 * useSubscription.js - Hook pour gérer l'abonnement et le trial
 *
 * Fonctionnalités:
 * - Vérifier si le trial est actif ou expiré
 * - Calculer les jours restants
 * - Bloquer l'accès si abonnement expiré
 * - Afficher les alertes de renouvellement
 */

import { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '../config/firebase';

/**
 * Hook pour gérer l'abonnement d'une université
 * @param {string} universityId - ID de l'université
 * @returns {Object} - Infos d'abonnement et helpers
 */
export function useSubscription(universityId) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!universityId) {
      setLoading(false);
      return;
    }

    const loadSubscription = async () => {
      try {
        const universityRef = ref(database, `universities/${universityId}`);
        const snapshot = await get(universityRef);

        if (!snapshot.exists()) {
          console.error('❌ useSubscription: Université non trouvée', universityId);
          setError('Université non trouvée');
          setLoading(false);
          return;
        }

        const universityData = snapshot.val();
        // console.log('✅ useSubscription: Données université chargées', {
        //   subscriptionPlan: universityData.subscriptionPlan,
        //   subscriptionStatus: universityData.subscriptionStatus,
        //   trialEndsAt: universityData.trialEndsAt,
        //   trialStartedAt: universityData.trialStartedAt
        // });

        // Données d'abonnement
        const subscriptionData = {
          plan: universityData.subscriptionPlan || 'trial',
          status: universityData.subscriptionStatus || 'trialing',
          trialStartedAt: universityData.trialStartedAt,
          trialEndsAt: universityData.trialEndsAt,
          trialDays: universityData.trialDays || 14,
          createdAt: universityData.createdAt
        };

        // Calculer l'état actuel
        const now = Date.now();
        const isTrialing = subscriptionData.status === 'trialing';

        // Si trialEndsAt n'existe pas, le créer (14 jours après création)
        if (!subscriptionData.trialEndsAt && subscriptionData.createdAt) {
          subscriptionData.trialEndsAt = subscriptionData.createdAt + (subscriptionData.trialDays * 24 * 60 * 60 * 1000);
        }

        const trialExpired = isTrialing && subscriptionData.trialEndsAt && now > subscriptionData.trialEndsAt;
        const daysRemaining = (isTrialing && subscriptionData.trialEndsAt)
          ? Math.max(0, Math.ceil((subscriptionData.trialEndsAt - now) / (1000 * 60 * 60 * 24)))
          : 0;

        // Déterminer si l'accès est bloqué
        const isBlocked = trialExpired ||
                         subscriptionData.status === 'expired' ||
                         subscriptionData.status === 'canceled';

        // TOUJOURS afficher le banner pendant le trial (pour pousser à souscrire)
        // Et aussi si le compte est bloqué
        const showAlert = isTrialing || isBlocked;

        // Urgence de l'alerte (progressif)
        const alertLevel = isBlocked
          ? 'critical'         // Rouge - bloqué
          : daysRemaining === 0
          ? 'critical'         // Rouge - dernier jour
          : daysRemaining === 1
          ? 'urgent'           // Orange - moins de 24h
          : daysRemaining <= 3
          ? 'warning'          // Jaune - 2-3 jours
          : daysRemaining <= 7
          ? 'info'             // Bleu clair - 4-7 jours
          : 'success';         // Vert - 8-14 jours (début)

        const finalSubscription = {
          ...subscriptionData,
          isTrialing,
          trialExpired,
          daysRemaining,
          isBlocked,
          showAlert,
          alertLevel,
          isPaid: subscriptionData.status === 'active' && subscriptionData.plan !== 'trial',
          canUpgrade: !isBlocked && subscriptionData.plan !== 'enterprise'
        };

        // console.log('📊 useSubscription: État calculé', {
        //   isTrialing,
        //   trialExpired,
        //   daysRemaining,
        //   isBlocked,
        //   showAlert,
        //   alertLevel
        // });

        setSubscription(finalSubscription);
        setLoading(false);
      } catch (err) {
        console.error('Error loading subscription:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadSubscription();
  }, [universityId]);

  return {
    subscription,
    loading,
    error
  };
}

/**
 * Obtenir le message d'alerte selon le statut
 */
export function getSubscriptionAlertMessage(subscription) {
  if (!subscription) return null;

  if (subscription.isBlocked) {
    return {
      title: '🚨 Accès bloqué',
      message: 'Votre période d\'essai est terminée. Souscrivez à un plan pour continuer.',
      cta: 'Choisir un plan'
    };
  }

  if (subscription.daysRemaining === 0) {
    return {
      title: '⚠️ Dernier jour !',
      message: 'Votre essai gratuit se termine aujourd\'hui. Ne perdez pas vos données !',
      cta: 'Souscrire maintenant'
    };
  }

  if (subscription.daysRemaining === 1) {
    return {
      title: '⏰ Plus que 24h',
      message: `Il vous reste 1 jour d'essai gratuit.`,
      cta: 'Voir les offres'
    };
  }

  if (subscription.daysRemaining <= 3) {
    return {
      title: '💡 Essai bientôt terminé',
      message: `Plus que ${subscription.daysRemaining} jours d'essai gratuit.`,
      cta: 'Découvrir les plans'
    };
  }

  if (subscription.daysRemaining <= 7) {
    return {
      title: '⏰ 1 semaine d\'essai restante',
      message: `Profitez encore de ${subscription.daysRemaining} jours gratuits avant de choisir votre plan.`,
      cta: 'Voir les offres'
    };
  }

  // Début du trial (8-14 jours)
  return {
    title: '🎉 Bienvenue sur votre essai gratuit !',
    message: `Vous avez ${subscription.daysRemaining} jours pour tester toutes les fonctionnalités. Découvrez nos plans pour continuer après l'essai.`,
    cta: 'Découvrir les plans'
  };
}

/**
 * Obtenir les couleurs selon le niveau d'alerte
 */
export function getAlertColors(alertLevel) {
  switch (alertLevel) {
    case 'critical':
      return {
        bg: 'bg-red-500',
        border: 'border-red-600',
        text: 'text-white',
        button: 'bg-white text-red-600 hover:bg-red-50'
      };
    case 'urgent':
      return {
        bg: 'bg-orange-500',
        border: 'border-orange-600',
        text: 'text-white',
        button: 'bg-white text-orange-600 hover:bg-orange-50'
      };
    case 'warning':
      return {
        bg: 'bg-yellow-500',
        border: 'border-yellow-600',
        text: 'text-gray-900',
        button: 'bg-gray-900 text-white hover:bg-gray-800'
      };
    case 'success':
      return {
        bg: 'bg-gradient-to-r from-green-500 to-emerald-600',
        border: 'border-green-600',
        text: 'text-white',
        button: 'bg-white text-green-600 hover:bg-green-50'
      };
    default:
      return {
        bg: 'bg-blue-500',
        border: 'border-blue-600',
        text: 'text-white',
        button: 'bg-white text-blue-600 hover:bg-blue-50'
      };
  }
}
