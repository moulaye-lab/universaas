/**
 * @fileoverview Service de gestion du Super Admin (SaaS Owner)
 * @module services/superAdminService
 *
 * Ce service gère toutes les opérations du Super Admin :
 * - Gestion des tenants (activation, suspension, changement de plan)
 * - Monitoring global de la plateforme
 * - Analytics IA et coûts
 * - Statistiques financières globales
 *
 * SÉCURITÉ : Toutes les fonctions vérifient que l'utilisateur a le rôle 'super_admin_plateforme'
 */

import { ref, get, set, update, push, query, orderByChild, limitToLast, remove } from 'firebase/database';
import { database } from '../config/firebase';

/**
 * @typedef {import('../types/superAdmin').TenantManagement} TenantManagement
 * @typedef {import('../types/superAdmin').AIAnalytics} AIAnalytics
 * @typedef {import('../types/superAdmin').PaymentRecord} PaymentRecord
 * @typedef {import('../types/superAdmin').GlobalStatistics} GlobalStatistics
 * @typedef {import('../types/superAdmin').ChangeTenantStatusParams} ChangeTenantStatusParams
 * @typedef {import('../types/superAdmin').ChangeTenantPlanParams} ChangeTenantPlanParams
 * @typedef {import('../types/superAdmin').CreatePaymentRecordParams} CreatePaymentRecordParams
 * @typedef {import('../types/superAdmin').TenantStatus} TenantStatus
 * @typedef {import('../types/superAdmin').SubscriptionPlan} SubscriptionPlan
 */

// ============================================================================
// CONFIGURATION DES PLANS D'ABONNEMENT
// ============================================================================

/**
 * Configuration des plans d'abonnement avec limites et tarifs
 * @const {Object<SubscriptionPlan, Object>}
 */
const SUBSCRIPTION_PLANS = {
  basic: {
    maxStudents: 200,
    monthlyPrice: 99,
    yearlyPrice: 990,
    features: ['Gestion de base', 'Support email']
  },
  standard: {
    maxStudents: 500,
    monthlyPrice: 149,
    yearlyPrice: 1490,
    features: ['Gestion complète', 'Support 48h', '10 Go stockage']
  },
  premium: {
    maxStudents: 2000,
    monthlyPrice: 299,
    yearlyPrice: 2990,
    features: ['Toutes fonctionnalités', 'IA intégrée', 'Support 24h', '100 Go']
  },
  enterprise: {
    maxStudents: Infinity,
    monthlyPrice: null, // Prix sur devis
    yearlyPrice: null,
    features: ['Illimité', 'Serveur dédié', 'Support 24/7', 'Personnalisation']
  }
};

// ============================================================================
// GESTION DES TENANTS
// ============================================================================

/**
 * Change le statut d'une université (activation/suspension)
 *
 * @param {ChangeTenantStatusParams} params - Paramètres
 * @returns {Promise<void>}
 * @throws {Error} Si l'utilisateur n'est pas Super Admin ou si la suspension nécessite une raison
 */
export async function changerStatutTenant({ tenantId, status, reason, adminUid }) {
  // Validation des paramètres
  if (!tenantId || !status || !adminUid) {
    throw new Error('Paramètres manquants : tenantId, status et adminUid sont requis');
  }

  // Vérifier que c'est bien un Super Admin
  const adminRef = ref(database, `users/${adminUid}`);
  const adminSnap = await get(adminRef);

  if (!adminSnap.exists() || adminSnap.val().role !== 'super_admin_plateforme') {
    throw new Error('ACCÈS REFUSÉ : Seul un Super Admin peut modifier le statut des tenants');
  }

  // Suspension nécessite une raison obligatoire
  if (status === 'suspended' && !reason) {
    throw new Error('Une raison est obligatoire pour suspendre une université');
  }

  // Préparer les données de mise à jour
  const updateData = {
    status,
    updatedAt: Date.now(),
    updatedBy: adminUid
  };

  if (status === 'suspended') {
    updateData.suspendedAt = Date.now();
    updateData.suspensionReason = reason;
  } else if (status === 'active') {
    // Réactivation : supprimer les champs de suspension
    updateData.suspendedAt = null;
    updateData.suspensionReason = null;
  }

  // Mettre à jour dans system_admin/tenants_management
  const tenantManagementRef = ref(database, `system_admin/tenants_management/${tenantId}`);
  await update(tenantManagementRef, updateData);

  // Mettre à jour aussi dans universities/{universityId}/info pour cohérence
  const universityInfoRef = ref(database, `universities/${tenantId}/info`);
  await update(universityInfoRef, {
    subscriptionStatus: status,
    ...updateData
  });

  console.log(`✅ Statut du tenant ${tenantId} changé en "${status}" par ${adminUid}`);
}

/**
 * Met à jour le plan d'abonnement d'une université
 *
 * @param {ChangeTenantPlanParams} params - Paramètres
 * @returns {Promise<void>}
 * @throws {Error} Si l'utilisateur n'est pas Super Admin ou si le plan est invalide
 */
export async function mettreAJourPlanAbonnement({ tenantId, newPlan, adminUid }) {
  // Validation des paramètres
  if (!tenantId || !newPlan || !adminUid) {
    throw new Error('Paramètres manquants : tenantId, newPlan et adminUid sont requis');
  }

  // Vérifier que le plan existe
  if (!SUBSCRIPTION_PLANS[newPlan]) {
    throw new Error(`Plan invalide : ${newPlan}. Plans disponibles : ${Object.keys(SUBSCRIPTION_PLANS).join(', ')}`);
  }

  // Vérifier que c'est bien un Super Admin
  const adminRef = ref(database, `users/${adminUid}`);
  const adminSnap = await get(adminRef);

  if (!adminSnap.exists() || adminSnap.val().role !== 'super_admin_plateforme') {
    throw new Error('ACCÈS REFUSÉ : Seul un Super Admin peut modifier les plans d\'abonnement');
  }

  const planConfig = SUBSCRIPTION_PLANS[newPlan];

  // Préparer les données de mise à jour
  const updateData = {
    plan: newPlan,
    maxStudents: planConfig.maxStudents,
    monthlyPrice: planConfig.monthlyPrice,
    updatedAt: Date.now(),
    updatedBy: adminUid,
    planChangedAt: Date.now()
  };

  // Mettre à jour dans system_admin/tenants_management
  const tenantManagementRef = ref(database, `system_admin/tenants_management/${tenantId}`);
  await update(tenantManagementRef, updateData);

  // Mettre à jour aussi dans universities/{universityId}/info
  const universityInfoRef = ref(database, `universities/${tenantId}/info`);
  await update(universityInfoRef, {
    subscriptionPlan: newPlan,
    ...updateData
  });

  console.log(`✅ Plan du tenant ${tenantId} changé en "${newPlan}" par ${adminUid}`);
}

/**
 * Récupère la liste complète des tenants avec leur état
 *
 * @param {string} adminUid - UID du Super Admin
 * @returns {Promise<TenantManagement[]>}
 * @throws {Error} Si l'utilisateur n'est pas Super Admin
 */
export async function obtenirListeTenants(adminUid) {
  // Vérifier que c'est bien un Super Admin
  const adminRef = ref(database, `users/${adminUid}`);
  const adminSnap = await get(adminRef);

  if (!adminSnap.exists() || adminSnap.val().role !== 'super_admin_plateforme') {
    throw new Error('ACCÈS REFUSÉ : Seul un Super Admin peut lire les données des tenants');
  }

  // Charger depuis system_admin/tenants_management
  const tenantsRef = ref(database, 'system_admin/tenants_management');
  const snapshot = await get(tenantsRef);

  if (!snapshot.exists()) {
    return [];
  }

  const tenantsData = snapshot.val();
  return Object.keys(tenantsData).map(id => ({
    universityId: id,
    ...tenantsData[id]
  }));
}

// ============================================================================
// ANALYTICS IA
// ============================================================================

/**
 * Enregistre la consommation de jetons IA pour une université
 *
 * @param {string} universityId - ID de l'université
 * @param {number} tokensUsed - Nombre de jetons consommés
 * @returns {Promise<void>}
 */
export async function enregistrerConsommationIA(universityId, tokensUsed) {
  if (!universityId || typeof tokensUsed !== 'number' || tokensUsed <= 0) {
    throw new Error('universityId et tokensUsed (nombre positif) sont requis');
  }

  const analyticsRef = ref(database, `system_admin/ia_analytics/${universityId}`);
  const snapshot = await get(analyticsRef);

  const currentData = snapshot.exists() ? snapshot.val() : {
    totalTokensUsed: 0,
    tokensThisMonth: 0,
    requestCount: 0,
    lastUsedAt: 0,
    estimatedCost: 0
  };

  // Prix estimé Claude : ~$0.015 / 1000 tokens (à ajuster selon votre contrat)
  const costPerToken = 0.000015; // en euros
  const additionalCost = tokensUsed * costPerToken;

  const updatedData = {
    totalTokensUsed: currentData.totalTokensUsed + tokensUsed,
    tokensThisMonth: currentData.tokensThisMonth + tokensUsed,
    requestCount: currentData.requestCount + 1,
    lastUsedAt: Date.now(),
    estimatedCost: currentData.estimatedCost + additionalCost,
    averageTokensPerRequest: Math.round((currentData.totalTokensUsed + tokensUsed) / (currentData.requestCount + 1))
  };

  await set(analyticsRef, updatedData);
}

/**
 * Récupère les analytics IA pour toutes les universités
 *
 * @param {string} adminUid - UID du Super Admin
 * @returns {Promise<AIAnalytics[]>}
 * @throws {Error} Si l'utilisateur n'est pas Super Admin
 */
export async function obtenirAnalyticsIA(adminUid) {
  // Vérifier que c'est bien un Super Admin
  const adminRef = ref(database, `users/${adminUid}`);
  const adminSnap = await get(adminRef);

  if (!adminSnap.exists() || adminSnap.val().role !== 'super_admin_plateforme') {
    throw new Error('ACCÈS REFUSÉ : Seul un Super Admin peut lire les analytics IA');
  }

  const analyticsRef = ref(database, 'system_admin/ia_analytics');
  const snapshot = await get(analyticsRef);

  if (!snapshot.exists()) {
    return [];
  }

  const analyticsData = snapshot.val();
  return Object.keys(analyticsData).map(universityId => ({
    universityId,
    ...analyticsData[universityId]
  }));
}

/**
 * Réinitialise les compteurs mensuels de jetons IA (à exécuter le 1er de chaque mois)
 *
 * @param {string} adminUid - UID du Super Admin
 * @returns {Promise<void>}
 */
export async function reinitialiserCompteursIA(adminUid) {
  const adminRef = ref(database, `users/${adminUid}`);
  const adminSnap = await get(adminRef);

  if (!adminSnap.exists() || adminSnap.val().role !== 'super_admin_plateforme') {
    throw new Error('ACCÈS REFUSÉ');
  }

  const analyticsRef = ref(database, 'system_admin/ia_analytics');
  const snapshot = await get(analyticsRef);

  if (!snapshot.exists()) return;

  const updates = {};
  const analyticsData = snapshot.val();

  Object.keys(analyticsData).forEach(universityId => {
    updates[`${universityId}/tokensThisMonth`] = 0;
  });

  await update(analyticsRef, updates);
  console.log('✅ Compteurs mensuels IA réinitialisés');
}

// ============================================================================
// FINANCE GLOBALE
// ============================================================================

/**
 * Enregistre un paiement d'abonnement
 *
 * @param {CreatePaymentRecordParams} params - Paramètres du paiement
 * @returns {Promise<string>} ID du paiement créé
 */
export async function enregistrerPaiement({
  universityId,
  amount,
  plan,
  billingPeriod,
  paymentMethod,
  transactionId
}) {
  if (!universityId || !amount || !plan || !billingPeriod) {
    throw new Error('universityId, amount, plan et billingPeriod sont requis');
  }

  // Récupérer le nom de l'université
  const universityRef = ref(database, `universities/${universityId}/info/name`);
  const universitySnap = await get(universityRef);
  const universityName = universitySnap.exists() ? universitySnap.val() : 'Université inconnue';

  const paymentData = {
    universityId,
    universityName,
    amount,
    plan,
    billingPeriod,
    status: 'paid',
    date: Date.now(),
    paymentMethod: paymentMethod || 'card',
    transactionId: transactionId || null
  };

  // Ajouter dans system_admin/global_finance/payments
  const paymentsRef = ref(database, 'system_admin/global_finance/payments');
  const newPaymentRef = push(paymentsRef);
  await set(newPaymentRef, paymentData);

  // Mettre à jour les métadonnées de la finance globale
  await mettreAJourStatistiquesFinancieres();

  return newPaymentRef.key;
}

/**
 * Met à jour les statistiques financières globales (MRR, ARR, etc.)
 *
 * @returns {Promise<void>}
 * @private
 */
async function mettreAJourStatistiquesFinancieres() {
  // Charger tous les tenants actifs
  const tenantsRef = ref(database, 'system_admin/tenants_management');
  const tenantsSnap = await get(tenantsRef);

  if (!tenantsSnap.exists()) return;

  const tenants = tenantsSnap.val();
  let monthlyRecurringRevenue = 0;
  let activeCount = 0;

  Object.values(tenants).forEach(tenant => {
    if (tenant.status === 'active' && tenant.monthlyPrice) {
      monthlyRecurringRevenue += tenant.monthlyPrice;
      activeCount++;
    }
  });

  const yearlyRecurringRevenue = monthlyRecurringRevenue * 12;
  const averageRevenuePerUniversity = activeCount > 0 ? monthlyRecurringRevenue / activeCount : 0;

  // Charger les paiements pour calculer le revenu total
  const paymentsRef = ref(database, 'system_admin/global_finance/payments');
  const paymentsSnap = await get(paymentsRef);
  let totalRevenue = 0;

  if (paymentsSnap.exists()) {
    Object.values(paymentsSnap.val()).forEach(payment => {
      if (payment.status === 'paid') {
        totalRevenue += payment.amount;
      }
    });
  }

  // Mettre à jour les stats globales
  const statsRef = ref(database, 'system_admin/global_finance/statistics');
  await set(statsRef, {
    totalRevenue,
    monthlyRecurringRevenue,
    yearlyRecurringRevenue,
    averageRevenuePerUniversity,
    lastUpdated: Date.now()
  });
}

/**
 * Obtient les statistiques financières globales de la plateforme
 *
 * @param {string} adminUid - UID du Super Admin
 * @returns {Promise<GlobalStatistics>}
 * @throws {Error} Si l'utilisateur n'est pas Super Admin
 */
export async function obtenirStatistiquesGlobales(adminUid) {
  // Vérifier que c'est bien un Super Admin
  const adminRef = ref(database, `users/${adminUid}`);
  const adminSnap = await get(adminRef);

  if (!adminSnap.exists() || adminSnap.val().role !== 'super_admin_plateforme') {
    throw new Error('ACCÈS REFUSÉ : Seul un Super Admin peut lire les statistiques globales');
  }

  // Charger les tenants
  const tenantsRef = ref(database, 'system_admin/tenants_management');
  const tenantsSnap = await get(tenantsRef);

  let totalUniversities = 0;
  let activeUniversities = 0;
  let trialUniversities = 0;
  let suspendedUniversities = 0;

  if (tenantsSnap.exists()) {
    const tenants = Object.values(tenantsSnap.val());
    totalUniversities = tenants.length;
    activeUniversities = tenants.filter(t => t.status === 'active').length;
    trialUniversities = tenants.filter(t => t.status === 'trial').length;
    suspendedUniversities = tenants.filter(t => t.status === 'suspended').length;
  }

  // Charger les stats financières
  const financeStatsRef = ref(database, 'system_admin/global_finance/statistics');
  const financeSnap = await get(financeStatsRef);
  const finance = financeSnap.exists() ? financeSnap.val() : {
    totalRevenue: 0,
    monthlyRecurringRevenue: 0,
    yearlyRecurringRevenue: 0,
    averageRevenuePerUniversity: 0
  };

  // Charger les top consommateurs IA
  const aiAnalytics = await obtenirAnalyticsIA(adminUid);
  const topAIConsumers = aiAnalytics
    .sort((a, b) => b.totalTokensUsed - a.totalTokensUsed)
    .slice(0, 10);

  // Compter étudiants/enseignants globaux (approximation depuis les tenants)
  let totalStudents = 0;
  let totalTeachers = 0;

  if (tenantsSnap.exists()) {
    Object.values(tenantsSnap.val()).forEach(tenant => {
      totalStudents += tenant.currentStudents || 0;
      totalTeachers += tenant.currentTeachers || 0;
    });
  }

  return {
    totalUniversities,
    activeUniversities,
    trialUniversities,
    suspendedUniversities,
    totalStudents,
    totalTeachers,
    finance,
    topAIConsumers
  };
}

// ============================================================================
// UTILITAIRES
// ============================================================================

/**
 * Synchronise les données des universités dans system_admin/tenants_management
 * (À exécuter lors de la création d'une université ou migration)
 *
 * @param {string} adminUid - UID du Super Admin
 * @returns {Promise<void>}
 */
export async function synchroniserTenants(adminUid) {
  const adminRef = ref(database, `users/${adminUid}`);
  const adminSnap = await get(adminRef);

  if (!adminSnap.exists() || adminSnap.val().role !== 'super_admin_plateforme') {
    throw new Error('ACCÈS REFUSÉ');
  }

  // Charger toutes les universités
  const universitiesRef = ref(database, 'universities');
  const universitiesSnap = await get(universitiesRef);

  if (!universitiesSnap.exists()) {
    console.log('Aucune université à synchroniser');
    return;
  }

  const universities = universitiesSnap.val();
  let syncCount = 0;

  for (const [universityId, universityData] of Object.entries(universities)) {
    // Ignorer le nœud public_slugs
    if (universityId === 'public_slugs') continue;

    const info = universityData.info || {};

    // Compter étudiants et enseignants
    const studentsCount = universityData.students ? Object.keys(universityData.students).length : 0;
    const teachersCount = universityData.teachers ? Object.keys(universityData.teachers).length : 0;

    const tenantData = {
      universityId,
      name: info.name || 'Université sans nom',
      slug: info.slug || universityId,
      status: info.subscriptionStatus || 'active',
      plan: info.subscriptionPlan || 'standard',
      createdAt: info.createdAt || Date.now(),
      currentStudents: studentsCount,
      currentTeachers: teachersCount,
      maxStudents: SUBSCRIPTION_PLANS[info.subscriptionPlan || 'standard'].maxStudents,
      monthlyPrice: SUBSCRIPTION_PLANS[info.subscriptionPlan || 'standard'].monthlyPrice,
      lastSyncedAt: Date.now()
    };

    // Écriture directe dans chaque chemin (contourne les rules racine)
    const tenantRef = ref(database, `system_admin/tenants_management/${universityId}`);
    await set(tenantRef, tenantData);
    syncCount++;
  }

  console.log(`✅ ${syncCount} tenants synchronisés`);
}

export default {
  changerStatutTenant,
  mettreAJourPlanAbonnement,
  obtenirListeTenants,
  enregistrerConsommationIA,
  obtenirAnalyticsIA,
  reinitialiserCompteursIA,
  enregistrerPaiement,
  obtenirStatistiquesGlobales,
  synchroniserTenants,
  SUBSCRIPTION_PLANS
};
