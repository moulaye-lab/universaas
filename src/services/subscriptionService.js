/**
 * subscriptionService.js - Gestion des abonnements (paiement simulé)
 *
 * Fonctionnalités:
 * - Validation de paiement simulé
 * - Mise à jour du plan d'abonnement
 * - Vérification des limites selon le plan
 */

import { ref, update, get } from 'firebase/database';
import { database } from '../config/firebase';

// Définition des plans
export const PLANS = {
  basic: {
    name: 'Basic',
    price: 49,
    currency: '€',
    interval: 'mois',
    features: [
      'Jusqu\'à 100 étudiants',
      'Gestion des notes',
      'Emploi du temps',
      'Support email'
    ],
    limits: {
      students: 100,
      teachers: 10,
      courses: 50
    }
  },
  premium: {
    name: 'Premium',
    price: 99,
    currency: '€',
    interval: 'mois',
    features: [
      'Jusqu\'à 500 étudiants',
      'Toutes les fonctionnalités Basic',
      'Bibliothèque numérique',
      'Cours en direct',
      'Support prioritaire'
    ],
    limits: {
      students: 500,
      teachers: 50,
      courses: 200
    }
  },
  enterprise: {
    name: 'Enterprise',
    price: 249,
    currency: '€',
    interval: 'mois',
    features: [
      'Étudiants illimités',
      'Toutes les fonctionnalités Premium',
      'Assistant IA',
      'API personnalisée',
      'Support 24/7'
    ],
    limits: {
      students: 999999,
      teachers: 999999,
      courses: 999999
    }
  }
};

/**
 * Simuler un paiement (pas de vraie transaction)
 */
export async function simulatePayment({
  cardNumber,
  cardholderName,
  expiryMonth,
  expiryYear,
  cvv,
  amount
}) {
  // Validation basique
  if (!cardNumber || cardNumber.length !== 16) {
    throw new Error('Numéro de carte invalide');
  }

  if (!cvv || cvv.length !== 3) {
    throw new Error('CVV invalide');
  }

  const currentYear = new Date().getFullYear() % 100;
  const currentMonth = new Date().getMonth() + 1;

  if (parseInt(expiryYear) < currentYear ||
      (parseInt(expiryYear) === currentYear && parseInt(expiryMonth) < currentMonth)) {
    throw new Error('Carte expirée');
  }

  // Simuler un délai de traitement
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Carte de test qui échoue (pour démo)
  if (cardNumber === '0000000000000000') {
    throw new Error('Paiement refusé');
  }

  // Générer un ID de transaction fictif
  const transactionId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    success: true,
    transactionId,
    amount,
    timestamp: Date.now()
  };
}

/**
 * Activer un abonnement après paiement
 */
export async function activateSubscription(universityId, planId, paymentInfo) {
  try {
    const now = Date.now();
    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    const subscriptionData = {
      plan: planId,
      status: 'active',
      startDate: now,
      nextBillingDate: nextBillingDate.getTime(),
      lastPayment: {
        transactionId: paymentInfo.transactionId,
        amount: paymentInfo.amount,
        date: now
      },
      updatedAt: now
    };

    const universityRef = ref(database, `universities/${universityId}`);
    await update(universityRef, {
      subscriptionPlan: planId,
      subscriptionStatus: 'active', // ✅ Changer de 'trialing' à 'active'
      subscription: subscriptionData
    });

    return { success: true };
  } catch (error) {
    console.error('Error activating subscription:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Changer de plan (upgrade/downgrade)
 */
export async function changePlan(universityId, newPlanId) {
  try {
    const universityRef = ref(database, `universities/${universityId}`);
    const snapshot = await get(universityRef);

    if (!snapshot.exists()) {
      throw new Error('Université introuvable');
    }

    const universityData = snapshot.val();
    const currentPlan = universityData.subscriptionPlan || 'basic';

    const now = Date.now();
    const updates = {
      subscriptionPlan: newPlanId,
      'subscription/plan': newPlanId,
      'subscription/previousPlan': currentPlan,
      'subscription/planChangedAt': now,
      'subscription/updatedAt': now
    };

    await update(universityRef, updates);

    return { success: true };
  } catch (error) {
    console.error('Error changing plan:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Vérifier si une limite est atteinte
 */
export async function checkLimit(universityId, limitType) {
  try {
    const universityRef = ref(database, `universities/${universityId}`);
    const snapshot = await get(universityRef);

    if (!snapshot.exists()) {
      return { allowed: false, reason: 'Université introuvable' };
    }

    const universityData = snapshot.val();
    const currentPlan = universityData.subscriptionPlan || 'basic';
    const planLimits = PLANS[currentPlan]?.limits;

    if (!planLimits) {
      return { allowed: true }; // Pas de limite définie
    }

    const limit = planLimits[limitType];
    if (limit === Infinity) {
      return { allowed: true };
    }

    // Compter les entités actuelles
    let currentCount = 0;
    const collectionPath = `universities/${universityId}/${limitType}`;
    const collectionRef = ref(database, collectionPath);
    const collectionSnapshot = await get(collectionRef);

    if (collectionSnapshot.exists()) {
      currentCount = collectionSnapshot.size;
    }

    const allowed = currentCount < limit;

    return {
      allowed,
      current: currentCount,
      limit,
      remaining: limit - currentCount,
      planName: PLANS[currentPlan].name
    };
  } catch (error) {
    console.error('Error checking limit:', error);
    return { allowed: true }; // En cas d'erreur, autoriser (fail open)
  }
}

/**
 * Obtenir l'état de l'abonnement
 */
export async function getSubscriptionStatus(universityId) {
  try {
    const universityRef = ref(database, `universities/${universityId}`);
    const snapshot = await get(universityRef);

    if (!snapshot.exists()) {
      throw new Error('Université introuvable');
    }

    const universityData = snapshot.val();
    const planId = universityData.subscriptionPlan || 'basic';
    const subscription = universityData.subscription || {};

    return {
      success: true,
      planId,
      planDetails: PLANS[planId],
      subscription: {
        status: subscription.status || 'active',
        startDate: subscription.startDate,
        nextBillingDate: subscription.nextBillingDate,
        lastPayment: subscription.lastPayment
      }
    };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return { success: false, error: error.message };
  }
}

export default {
  PLANS,
  simulatePayment,
  activateSubscription,
  changePlan,
  checkLimit,
  getSubscriptionStatus
};
