/**
 * @fileoverview Types et interfaces pour le module Super Admin
 * @module types/superAdmin
 *
 * Ce fichier définit les types stricts utilisés dans tout le module Super Admin.
 * Utilise JSDoc pour le typage strict (équivalent TypeScript en JS).
 */

/**
 * @typedef {'basic' | 'standard' | 'premium' | 'enterprise'} SubscriptionPlan
 * @description Plans d'abonnement disponibles pour les universités
 */

/**
 * @typedef {'active' | 'trial' | 'suspended' | 'cancelled'} TenantStatus
 * @description États possibles d'une université cliente
 */

/**
 * @typedef {Object} TenantManagement
 * @property {string} universityId - ID unique de l'université
 * @property {string} name - Nom de l'université
 * @property {string} slug - Slug URL unique
 * @property {TenantStatus} status - Statut actuel
 * @property {SubscriptionPlan} plan - Plan d'abonnement
 * @property {number} createdAt - Timestamp de création
 * @property {number} [suspendedAt] - Timestamp de suspension (si suspendu)
 * @property {string} [suspensionReason] - Raison de la suspension
 * @property {number} currentStudents - Nombre d'étudiants actuels
 * @property {number} maxStudents - Limite d'étudiants selon le plan
 * @property {number} monthlyPrice - Prix mensuel en euros
 * @property {number} [lastPaymentDate] - Date du dernier paiement
 * @property {number} [nextBillingDate] - Date de la prochaine facturation
 * @property {number} [trialEndsAt] - Date de fin d'essai (si en période d'essai)
 */

/**
 * @typedef {Object} AIAnalytics
 * @property {string} universityId - ID de l'université
 * @property {number} totalTokensUsed - Total de jetons consommés
 * @property {number} tokensThisMonth - Jetons utilisés ce mois
 * @property {number} lastUsedAt - Timestamp dernière utilisation
 * @property {number} estimatedCost - Coût estimé en euros
 * @property {number} requestCount - Nombre de requêtes IA
 * @property {number} averageTokensPerRequest - Moyenne jetons par requête
 */

/**
 * @typedef {Object} PaymentRecord
 * @property {string} id - ID unique du paiement
 * @property {string} universityId - ID de l'université
 * @property {string} universityName - Nom de l'université
 * @property {number} amount - Montant en euros
 * @property {SubscriptionPlan} plan - Plan payé
 * @property {'monthly' | 'yearly'} billingPeriod - Période de facturation
 * @property {'pending' | 'paid' | 'failed' | 'refunded'} status - Statut du paiement
 * @property {number} date - Timestamp du paiement
 * @property {string} [paymentMethod] - Méthode de paiement (card, bank, etc.)
 * @property {string} [transactionId] - ID de transaction externe
 * @property {string} [invoiceUrl] - URL de la facture PDF
 */

/**
 * @typedef {Object} GlobalFinance
 * @property {number} totalRevenue - Revenu total all-time
 * @property {number} monthlyRecurringRevenue - MRR actuel
 * @property {number} yearlyRecurringRevenue - ARR actuel
 * @property {number} averageRevenuePerUniversity - ARPU moyen
 * @property {number} churnRate - Taux de désabonnement (%)
 * @property {number} growthRate - Taux de croissance MRR (%)
 * @property {PaymentRecord[]} recentPayments - Derniers paiements
 */

/**
 * @typedef {Object} GlobalStatistics
 * @property {number} totalUniversities - Nombre total d'universités
 * @property {number} activeUniversities - Universités actives
 * @property {number} trialUniversities - Universités en essai
 * @property {number} suspendedUniversities - Universités suspendues
 * @property {number} totalStudents - Total étudiants tous tenants
 * @property {number} totalTeachers - Total enseignants tous tenants
 * @property {GlobalFinance} finance - Données financières globales
 * @property {AIAnalytics[]} topAIConsumers - Top 10 universités consommatrices IA
 */

/**
 * @typedef {Object} ChangeTenantStatusParams
 * @property {string} tenantId - ID de l'université
 * @property {TenantStatus} status - Nouveau statut
 * @property {string} [reason] - Raison du changement (requis si suspension)
 * @property {string} adminUid - UID du super admin effectuant l'action
 */

/**
 * @typedef {Object} ChangeTenantPlanParams
 * @property {string} tenantId - ID de l'université
 * @property {SubscriptionPlan} newPlan - Nouveau plan
 * @property {string} adminUid - UID du super admin effectuant l'action
 */

/**
 * @typedef {Object} CreatePaymentRecordParams
 * @property {string} universityId - ID de l'université
 * @property {number} amount - Montant payé
 * @property {SubscriptionPlan} plan - Plan payé
 * @property {'monthly' | 'yearly'} billingPeriod - Période
 * @property {string} [paymentMethod] - Méthode de paiement
 * @property {string} [transactionId] - ID transaction externe
 */

// Export vide pour que ce fichier soit reconnu comme module ES6
export {};
