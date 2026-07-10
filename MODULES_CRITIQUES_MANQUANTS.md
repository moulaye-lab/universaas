# 🚨 MODULES CRITIQUES MANQUANTS - SaaS Core

## ❌ Module 13 : Facturation SaaS & Abonnements (0% fait)

### Ce qui doit être implémenté:

#### 1. Gestion des Abonnements
- [ ] **Plans d'abonnement** (Basic, Pro, Enterprise)
  - Définition des plans avec limites (nb users, storage, features)
  - Prix mensuels/annuels
  - Périodes d'essai gratuit
  
- [ ] **Intégration Stripe Sandbox**
  - Configuration Stripe API
  - Création checkout sessions
  - Webhooks Stripe (payment success, failed, subscription updated)
  - Gestion des invoices
  - Cartes de test pour démo

#### 2. Dashboard Super-Admin Plateforme
- [ ] **Vue globale financière**
  - Revenus totaux (MRR - Monthly Recurring Revenue)
  - ARR (Annual Recurring Revenue)
  - Churn rate (taux de désabonnement)
  - Graphiques évolution revenus
  
- [ ] **Liste universités clientes**
  - Tableau avec toutes les universités
  - Statut abonnement (active, trial, suspended, cancelled)
  - Date création, renouvellement
  - Plan actuel
  - Revenus par université
  
- [ ] **Actions administratives**
  - Suspendre accès université (défaut paiement)
  - Réactiver université
  - Changer plan d'abonnement
  - Voir logs paiements
  - Contacter admin université

#### 3. Monitoring & Analytics
- [ ] Dashboard métriques SaaS:
  - Nombre total d'universités
  - Universités actives vs suspendues
  - Nouveaux clients ce mois
  - Clients perdus (churn)
  - Revenus par plan
  - Taux de conversion essai → payant

---

## ❌ Module 14 : Onboarding Automatisé (0% fait)

### Ce qui doit être implémenté:

#### 1. Tunnel d'inscription Self-Service
- [ ] **Page publique d'inscription** (`/signup`)
  - Formulaire multi-étapes:
    - Étape 1: Informations établissement (nom, pays, type)
    - Étape 2: Configuration identifiant unique/slug
    - Étape 3: Compte premier admin (nom, email, password)
    - Étape 4: Choix du plan (Basic/Pro/Enterprise)
    - Étape 5: Paiement Stripe
    - Étape 6: Confirmation et redirection
    
- [ ] **Génération automatique**
  - Création université dans Firebase
  - Génération universityId unique
  - Création compte admin_universite
  - Configuration initiale (devise, fuseau horaire)
  - Email de bienvenue
  
- [ ] **Configuration Slug/Sous-domaine**
  - Vérification disponibilité slug
  - Format: `slug.universaas.com` ou `/u/slug`
  - Validation caractères autorisés
  - Unicité garantie

#### 2. Importation de Masse
- [ ] **Interface d'import CSV/Excel**
  - Page dédiée pour admin_universite
  - Upload fichier (drag & drop)
  - Prévisualisation données
  - Mapping colonnes
  - Validation format
  
- [ ] **Import Enseignants**
  - Template CSV fourni
  - Colonnes: firstName, lastName, email, department, specialization
  - Création comptes automatique
  - Envoi emails avec credentials
  - Gestion erreurs (email déjà utilisé, etc.)
  
- [ ] **Import Étudiants**
  - Template CSV fourni
  - Colonnes: firstName, lastName, email, matricule, level, class, department, fieldOfStudy
  - Génération matricules si manquants
  - Création comptes automatique
  - Affectation aux classes
  - Rapport d'import (succès/erreurs)

#### 3. Configuration Initiale Automatique
- [ ] Données de démo optionnelles
- [ ] Configuration devise par défaut
- [ ] Configuration année académique
- [ ] Création classes/niveaux de base
- [ ] Départements standards

---

## 📋 Architecture Technique Nécessaire

### Backend à créer:
```
backend/
├── routes/
│   ├── saas/
│   │   ├── subscriptions.js      # Gestion abonnements
│   │   ├── stripe-webhooks.js    # Webhooks Stripe
│   │   ├── onboarding.js          # Inscription universités
│   │   └── import.js              # Import masse CSV
│   └── super-admin/
│       ├── dashboard.js           # Métriques globales
│       ├── universities.js        # CRUD universités
│       └── billing.js             # Facturation
├── services/
│   ├── stripeService.js           # Logique Stripe
│   ├── onboardingService.js       # Logique onboarding
│   └── importService.js           # Parsing CSV/Excel
└── middleware/
    └── superAdminAuth.js          # Auth super admin
```

### Frontend à créer:
```
src/
├── pages/
│   ├── public/
│   │   └── SignupPage.jsx         # Tunnel inscription
│   ├── super-admin/
│   │   ├── DashboardPage.jsx      # Dashboard global
│   │   ├── UniversitiesListPage.jsx
│   │   ├── UniversityDetailsPage.jsx
│   │   └── RevenueAnalyticsPage.jsx
│   └── admin/
│       └── ImportDataPage.jsx     # Import CSV
└── components/
    ├── signup/
    │   ├── StepInformations.jsx
    │   ├── StepSlug.jsx
    │   ├── StepAdmin.jsx
    │   ├── StepPlan.jsx
    │   └── StepPayment.jsx
    └── import/
        ├── CSVUploader.jsx
        ├── DataPreview.jsx
        └── ImportReport.jsx
```

### Firebase Structure à ajouter:
```json
{
  "platform": {
    "subscriptions": {
      "$universityId": {
        "plan": "pro",
        "status": "active",
        "stripeCustomerId": "cus_xxx",
        "stripeSubscriptionId": "sub_xxx",
        "currentPeriodStart": 1234567890,
        "currentPeriodEnd": 1234567890,
        "cancelAtPeriodEnd": false,
        "trialEnd": null
      }
    },
    "plans": {
      "basic": {
        "name": "Basic",
        "price": 49,
        "currency": "EUR",
        "features": {
          "maxStudents": 100,
          "maxTeachers": 10,
          "storage": "10GB",
          "aiEnabled": false
        }
      },
      "pro": {
        "name": "Pro",
        "price": 199,
        "features": {
          "maxStudents": 1000,
          "maxTeachers": 50,
          "storage": "100GB",
          "aiEnabled": true
        }
      }
    },
    "analytics": {
      "revenue": {
        "mrr": 5000,
        "arr": 60000,
        "churnRate": 2.5
      },
      "universities": {
        "total": 25,
        "active": 23,
        "trial": 2,
        "suspended": 0
      }
    }
  }
}
```

---

## 🎯 Plan d'Implémentation

### Phase 1: Module 14 - Onboarding (2-3 jours)
**Pourquoi d'abord?** Il faut pouvoir créer des universités avant de les facturer.

**Jour 1:**
- [ ] Page signup publique (tunnel multi-étapes)
- [ ] Génération université + admin automatique
- [ ] Configuration slug unique

**Jour 2:**
- [ ] Interface import CSV (enseignants + étudiants)
- [ ] Parsing et validation fichiers
- [ ] Création comptes en masse

**Jour 3:**
- [ ] Gestion erreurs et rapports
- [ ] Templates CSV à télécharger
- [ ] Tests complets

### Phase 2: Module 13 - Facturation SaaS (3-4 jours)

**Jour 1:**
- [ ] Configuration Stripe Sandbox
- [ ] Définition des plans (Basic/Pro/Enterprise)
- [ ] Structure Firebase pour abonnements

**Jour 2:**
- [ ] Intégration paiement dans onboarding
- [ ] Webhooks Stripe (success, failed)
- [ ] Gestion des invoices

**Jour 3:**
- [ ] Dashboard Super Admin (liste universités)
- [ ] Métriques financières (MRR, ARR, churn)
- [ ] Suspension/réactivation accès

**Jour 4:**
- [ ] Analytics avancés
- [ ] Tests paiements avec cartes test
- [ ] Documentation

---

## ⚠️ Points Critiques

### Sécurité:
- ✅ Validation slug (caractères autorisés)
- ✅ Vérification unicité email admin
- ✅ Webhooks Stripe authentifiés (signature)
- ✅ Rate limiting sur création universités
- ✅ Validation fichiers CSV (XSS, injection)

### Performance:
- ✅ Import asynchrone (background jobs)
- ✅ Progress bar pour imports longs
- ✅ Limitation taille fichiers CSV (max 10MB)
- ✅ Batch creation (par paquets de 100)

### UX:
- ✅ Feedback clair à chaque étape
- ✅ Possibilité de revenir en arrière
- ✅ Sauvegarde automatique progression
- ✅ Templates CSV avec exemples
- ✅ Messages d'erreur explicites

---

## 📊 Estimation Effort

| Module | Complexité | Temps Estimé | Priorité |
|--------|------------|--------------|----------|
| Module 14: Onboarding | Moyenne | 2-3 jours | 🔴🔴🔴 |
| Module 13: Facturation | Haute | 3-4 jours | 🔴🔴 |
| **TOTAL** | | **5-7 jours** | |

---

## 🚀 Démarrer Maintenant?

**Je recommande de commencer par:**
1. **Module 14 (Onboarding)** d'abord
   - Plus simple
   - Permet de tester création d'universités
   - Bloque Module 13
   
2. **Module 13 (Facturation)** ensuite
   - Dépend du Module 14
   - Plus complexe (intégration Stripe)
   - Finalise le modèle SaaS

**Voulez-vous que je commence par le Module 14 - Onboarding automatisé?**
