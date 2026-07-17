# 🔧 Implémentation Module Super Admin - État des Lieux

## ✅ Ce qui est déjà fait

### 1. Structure de données Firebase (`system_admin`)
✅ **Créé** : Fichier `src/types/superAdmin.js` avec tous les types JSDoc stricts
- `TenantManagement` - État des universités clientes
- `AIAnalytics` - Suivi consommation jetons IA
- `PaymentRecord` - Historique paiements
- `GlobalStatistics` - Stats globales plateforme

### 2. Service métier complet (`src/services/superAdminService.js`)
✅ **Implémenté** toutes les fonctions principales :

**Gestion Tenants:**
- `changerStatutTenant()` - Suspend/Active une université
- `mettreAJourPlanAbonnement()` - Change le plan (basic/standard/premium/enterprise)
- `obtenirListeTenants()` - Liste toutes les universités

**Analytics IA:**
- `enregistrerConsommationIA()` - Enregistre les tokens consommés
- `obtenirAnalyticsIA()` - Récupère tous les analytics IA
- `reinitialiserCompteursIA()` - Reset mensuel automatique

**Finance Globale:**
- `enregistrerPaiement()` - Enregistre un paiement d'abonnement
- `obtenirStatistiquesGlobales()` - KPIs globaux (MRR, ARR, churn, etc.)

**Utilitaires:**
- `synchroniserTenants()` - Synchronise les universités existantes dans system_admin

### 3. Firebase Security Rules
✅ **Ajouté** nœud complet `system_admin` avec :
- Lecture/Écriture UNIQUEMENT pour `super_admin_plateforme`
- Validation stricte de tous les champs (types, formats, longueurs)
- 3 sous-nœuds : `tenants_management`, `ia_analytics`, `global_finance`

## ⚠️ Ce qui reste à faire

### 1. Intégration dans `SuperAdminDashboard.jsx`

**Imports à ajouter :**
```javascript
import { changerStatutTenant, mettreAJourPlanAbonnement, obtenirStatistiquesGlobales, synchroniserTenants } from '../services/superAdminService';
import { Ban, RefreshCw } from 'lucide-react';
```

**Remplacer les boutons actions (ligne 419-428) :**
```javascript
<td className="py-4 px-4">
  <div className="flex items-center justify-end gap-2">
    {/* Bouton Suspendre/Activer */}
    {uni.subscriptionStatus === 'active' ? (
      <button 
        onClick={() => handleSuspendTenant(uni.id)}
        className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
        title="Suspendre l'accès"
      >
        <Ban className="h-5 w-5" />
      </button>
    ) : uni.subscriptionStatus === 'suspended' ? (
      <button 
        onClick={() => handleActivateTenant(uni.id)}
        className="p-2 hover:bg-green-50 rounded-lg transition-colors text-green-600"
        title="Réactiver l'accès"
      >
        <CheckCircle className="h-5 w-5" />
      </button>
    ) : null}
    
    {/* Bouton Changer Plan */}
    <button 
      onClick={() => handleChangePlan(uni.id, uni.subscriptionPlan)}
      className="p-2 hover:bg-indigo-50 rounded-lg transition-colors text-indigo-600"
      title="Modifier le plan"
    >
      <Settings className="h-5 w-5" />
    </button>
    
    {/* Menu Plus d'options */}
    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600">
      <MoreVertical className="h-5 w-5" />
    </button>
  </div>
</td>
```

**Ajouter les handlers (après line 135) :**
```javascript
const handleSuspendTenant = async (tenantId) => {
  const reason = prompt('Raison de la suspension (obligatoire) :');
  if (!reason || reason.trim() === '') {
    alert('La raison de suspension est obligatoire');
    return;
  }

  if (!confirm(`Êtes-vous sûr de vouloir suspendre cette université ?\nRaison : ${reason}`)) {
    return;
  }

  try {
    await changerStatutTenant({
      tenantId,
      status: 'suspended',
      reason: reason.trim(),
      adminUid: userProfile.uid
    });
    alert('Université suspendue avec succès');
    loadDashboardData(); // Recharger
  } catch (error) {
    console.error(error);
    alert('Erreur : ' + error.message);
  }
};

const handleActivateTenant = async (tenantId) => {
  if (!confirm('Êtes-vous sûr de vouloir réactiver cette université ?')) {
    return;
  }

  try {
    await changerStatutTenant({
      tenantId,
      status: 'active',
      adminUid: userProfile.uid
    });
    alert('Université réactivée avec succès');
    loadDashboardData();
  } catch (error) {
    console.error(error);
    alert('Erreur : ' + error.message);
  }
};

const handleChangePlan = async (tenantId, currentPlan) => {
  const newPlan = prompt(`Plan actuel : ${currentPlan}\nNouveau plan (basic, standard, premium, enterprise) :`);
  
  if (!newPlan) return;

  const validPlans = ['basic', 'standard', 'premium', 'enterprise'];
  if (!validPlans.includes(newPlan.toLowerCase())) {
    alert('Plan invalide. Choisissez parmi : basic, standard, premium, enterprise');
    return;
  }

  if (!confirm(`Changer le plan de ${currentPlan} vers ${newPlan} ?`)) {
    return;
  }

  try {
    await mettreAJourPlanAbonnement({
      tenantId,
      newPlan: newPlan.toLowerCase(),
      adminUid: userProfile.uid
    });
    alert('Plan mis à jour avec succès');
    loadDashboardData();
  } catch (error) {
    console.error(error);
    alert('Erreur : ' + error.message);
  }
};
```

**Ajouter bouton Sync dans le header (ligne 332 après le bouton "Nouvelle université") :**
```javascript
<button
  onClick={handleSyncTenants}
  className="bg-white border-2 border-indigo-300 text-indigo-600 px-4 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all flex items-center gap-2"
>
  <RefreshCw className="h-5 w-5" />
  Synchroniser
</button>
```

**Handler pour Sync :**
```javascript
const handleSyncTenants = async () => {
  if (!confirm('Synchroniser toutes les universités dans system_admin ? Cette opération peut prendre quelques secondes.')) {
    return;
  }

  try {
    await synchroniserTenants(userProfile.uid);
    alert('Synchronisation terminée avec succès');
    loadDashboardData();
  } catch (error) {
    console.error(error);
    alert('Erreur : ' + error.message);
  }
};
```

### 2. Charger les vraies stats depuis `system_admin`

**Modifier `loadDashboardData()` (ligne 65) :**
```javascript
const loadDashboardData = async () => {
  try {
    if (userProfile?.role !== 'super_admin_plateforme') {
      console.error('Accès refusé : rôle incorrect');
      setLoading(false);
      return;
    }

    // Charger les stats RÉELLES depuis system_admin
    const globalStats = await obtenirStatistiquesGlobales(userProfile.uid);
    
    setStats({
      totalUniversities: globalStats.totalUniversities,
      activeUniversities: globalStats.activeUniversities,
      totalStudents: globalStats.totalStudents,
      totalTeachers: globalStats.totalTeachers,
      monthlyRevenue: globalStats.finance.monthlyRecurringRevenue,
      yearlyRevenue: globalStats.finance.yearlyRecurringRevenue,
      growthRate: 15.2, // À calculer si besoin
    });

    // Charger les universités DEPUIS system_admin (pas universities/)
    const universitiesList = await obtenirListeTenants(userProfile.uid);
    universitiesList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    setUniversities(universitiesList);

    setLoading(false);
  } catch (error) {
    console.error('Error loading dashboard:', error);
    alert('Erreur de chargement: ' + error.message);
    setLoading(false);
  }
};
```

### 3. Déployer les Firebase Rules

**Commandes à exécuter :**
```bash
# Se connecter à Firebase (si pas déjà fait)
firebase login

# Déployer uniquement les rules
firebase deploy --only database

# Vérifier que ça a bien marché
firebase database:get / --project university-saas-7b31e
```

### 4. Première synchronisation (migration)

**Depuis la console Super Admin, exécuter UNE FOIS :**
```javascript
// Bouton "Synchroniser" dans l'UI
// OU depuis la console navigateur :
import { synchroniserTenants } from './services/superAdminService';
await synchroniserTenants('UID_DU_SUPER_ADMIN');
```

Cela va créer le nœud `system_admin/tenants_management/` avec toutes les universités existantes.

## 📊 Utilisation du Module IA Analytics

**Quand un utilisateur utilise l'IA, appeler :**
```javascript
import { enregistrerConsommationIA } from '../services/superAdminService';

// Dans aiService.js par exemple
const response = await anthropic.sendMessage(...);
const tokensUsed = response.usage.total_tokens;

await enregistrerConsommationIA(universityId, tokensUsed);
```

**Voir les top consommateurs IA :**
```javascript
const stats = await obtenirStatistiquesGlobales(adminUid);
console.log(stats.topAIConsumers); // Top 10 universités
```

**Reset mensuel automatique (cron à mettre en place) :**
```javascript
// À exécuter le 1er de chaque mois
await reinitialiserCompteursIA(adminUid);
```

## 📈 Utilisation Finance Globale

**Enregistrer un paiement (webhook Stripe par exemple) :**
```javascript
import { enregistrerPaiement } from '../services/superAdminService';

await enregistrerPaiement({
  universityId: 'univ-sorbonne-2026',
  amount: 149,
  plan: 'standard',
  billingPeriod: 'monthly',
  paymentMethod: 'card',
  transactionId: 'pi_1234567890'
});
```

**Les stats financières sont mises à jour automatiquement.**

## 🚀 Ordre d'exécution pour terminer

1. ✅ Déployer les Firebase Rules : `firebase deploy --only database`
2. ✅ Modifier `SuperAdminDashboard.jsx` avec les handlers
3. ✅ Tester en local (npm run dev)
4. ✅ Exécuter synchroniserTenants() UNE FOIS
5. ✅ Tester suspension/activation
6. ✅ Tester changement de plan
7. ✅ Commit + Push + Deploy Vercel

## ⚠️ Notes de Sécurité

- Toutes les fonctions vérifient que l'utilisateur est `super_admin_plateforme`
- Les Firebase Rules empêchent TOTALEMENT l'accès au nœud `system_admin` sauf pour le Super Admin
- Même les admins d'université ne peuvent PAS lire/écrire dans `system_admin`
- Les Custom Claims ne sont PAS nécessaires (on utilise le rôle stocké dans `users/{uid}/role`)

## 📝 TODO Optionnel (Améliorations Futures)

- [ ] Modal élégante pour suspension (au lieu de prompt())
- [ ] Modal pour changement de plan avec preview des limites
- [ ] Graphiques de revenus (Recharts)
- [ ] Export CSV des paiements
- [ ] Tableau de bord analytics IA détaillé
- [ ] Webhooks Stripe automatiques
- [ ] Cron automatique pour reset mensuel IA
- [ ] Notifications email aux universités suspendues
