/**
 * data/subscriptionPlans.js - Définition des plans d'abonnement
 */

export const PLANS = {
  trial: {
    id: 'trial',
    name: 'Essai Gratuit',
    price: 0,
    currency: 'EUR',
    interval: 'month',
    stripePriceId: null,
    duration: 30, // 30 jours
    features: {
      maxStudents: 50,
      maxTeachers: 5,
      maxClasses: 5,
      storage: '1GB',
      aiEnabled: false,
      videoConference: false,
      multiCampus: false,
      customDomain: false,
      apiAccess: false,
      support: 'email',
      priority: 1
    },
    description: '30 jours pour tester la plateforme',
    popular: false
  },

  basic: {
    id: 'basic',
    name: 'Basic',
    price: 49,
    currency: 'EUR',
    interval: 'month',
    stripePriceId: process.env.VITE_STRIPE_PRICE_BASIC || 'price_basic_test',
    features: {
      maxStudents: 200,
      maxTeachers: 15,
      maxClasses: 20,
      storage: '10GB',
      aiEnabled: false,
      videoConference: false,
      multiCampus: false,
      customDomain: false,
      apiAccess: false,
      support: 'email',
      priority: 2
    },
    description: 'Idéal pour les petites institutions',
    popular: false
  },

  pro: {
    id: 'pro',
    name: 'Professional',
    price: 199,
    currency: 'EUR',
    interval: 'month',
    stripePriceId: process.env.VITE_STRIPE_PRICE_PRO || 'price_pro_test',
    features: {
      maxStudents: 1000,
      maxTeachers: 50,
      maxClasses: 100,
      storage: '100GB',
      aiEnabled: true,
      videoConference: true,
      multiCampus: false,
      customDomain: false,
      apiAccess: true,
      support: 'priority',
      priority: 3
    },
    description: 'Pour les universités en croissance',
    popular: true
  },

  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 499,
    currency: 'EUR',
    interval: 'month',
    stripePriceId: process.env.VITE_STRIPE_PRICE_ENTERPRISE || 'price_enterprise_test',
    features: {
      maxStudents: 'unlimited',
      maxTeachers: 'unlimited',
      maxClasses: 'unlimited',
      storage: '1TB',
      aiEnabled: true,
      videoConference: true,
      multiCampus: true,
      customDomain: true,
      apiAccess: true,
      whiteLabel: true,
      dedicatedSupport: true,
      sla: '99.9%',
      support: 'dedicated',
      priority: 4
    },
    description: 'Solution complète pour grandes institutions',
    popular: false
  }
};

/**
 * Récupérer un plan par son ID
 */
export function getPlanById(planId) {
  return PLANS[planId] || null;
}

/**
 * Récupérer tous les plans
 */
export function getAllPlans() {
  return Object.values(PLANS);
}

/**
 * Récupérer les plans payants uniquement
 */
export function getPaidPlans() {
  return Object.values(PLANS).filter(plan => plan.price > 0);
}

/**
 * Vérifier si une université peut effectuer une action selon son plan
 */
export function checkPlanLimit(currentPlan, resource, currentCount) {
  const plan = getPlanById(currentPlan);

  if (!plan) return false;

  const resourceMap = {
    students: 'maxStudents',
    teachers: 'maxTeachers',
    classes: 'maxClasses'
  };

  const featureKey = resourceMap[resource];
  if (!featureKey) return true;

  const limit = plan.features[featureKey];

  if (limit === 'unlimited') return true;

  return currentCount < limit;
}

/**
 * Obtenir le message d'erreur pour limite atteinte
 */
export function getLimitMessage(currentPlan, resource) {
  const plan = getPlanById(currentPlan);

  if (!plan) return 'Plan non trouvé';

  const resourceMap = {
    students: 'maxStudents',
    teachers: 'maxTeachers',
    classes: 'maxClasses'
  };

  const featureKey = resourceMap[resource];
  const limit = plan.features[featureKey];

  const resourceNames = {
    students: 'étudiants',
    teachers: 'enseignants',
    classes: 'classes'
  };

  return `Limite de ${limit} ${resourceNames[resource]} atteinte pour le plan ${plan.name}. Veuillez mettre à niveau votre abonnement.`;
}

/**
 * Comparer deux plans
 */
export function comparePlans(planId1, planId2) {
  const plan1 = getPlanById(planId1);
  const plan2 = getPlanById(planId2);

  if (!plan1 || !plan2) return 0;

  return plan1.features.priority - plan2.features.priority;
}

/**
 * Vérifier si c'est un upgrade
 */
export function isUpgrade(currentPlanId, newPlanId) {
  return comparePlans(currentPlanId, newPlanId) < 0;
}

/**
 * Vérifier si c'est un downgrade
 */
export function isDowngrade(currentPlanId, newPlanId) {
  return comparePlans(currentPlanId, newPlanId) > 0;
}
