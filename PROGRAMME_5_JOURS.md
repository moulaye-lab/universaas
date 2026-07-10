# 🚀 PROGRAMME INTENSIF 5 JOURS
## Implémentation Modules Critiques - Cahier des Charges

**Objectif**: Passer de 41% à 85%+ de complétion du cahier des charges  
**Durée**: 5 jours intensifs (8-10h/jour)  
**Date début**: 2026-07-11  
**Date fin**: 2026-07-15

---

## 📊 Vue d'Ensemble

| Jour | Module Principal | Taux Complétion Visé | Heures |
|------|------------------|----------------------|--------|
| **Jour 1** | Module 14: Onboarding | 41% → 50% | 8-10h |
| **Jour 2** | Module 13: Facturation SaaS | 50% → 60% | 8-10h |
| **Jour 3** | Notifications & Annonces | 60% → 70% | 8-10h |
| **Jour 4** | Bibliothèque & PDF | 70% → 80% | 8-10h |
| **Jour 5** | Compléments Métier | 80% → 85%+ | 8-10h |

---

## 🗓️ JOUR 1 - Module 14: Onboarding Automatisé

**Objectif**: Permettre à une nouvelle université de s'inscrire et d'importer ses données  
**Temps**: 8-10 heures

### 🌅 Matin (4-5h)

#### 1. Page Inscription Publique (2h)
**Fichier**: `src/pages/public/SignupPage.jsx`

**Tâches**:
- [ ] Route publique `/signup` dans App.jsx
- [ ] Design landing avec call-to-action
- [ ] Formulaire multi-étapes (Stepper):
  - Étape 1: Informations établissement (nom, pays, type, adresse)
  - Étape 2: Configuration identifiant unique (slug avec validation)
  - Étape 3: Compte administrateur (nom, email, password)
  - Étape 4: Configuration initiale (devise, fuseau horaire)
- [ ] Validation en temps réel (slug disponible)
- [ ] Progress bar entre étapes

**Composants à créer**:
```jsx
SignupPage.jsx
  ├── StepUniversityInfo.jsx
  ├── StepSlugConfig.jsx  
  ├── StepAdminAccount.jsx
  └── StepConfiguration.jsx
```

#### 2. Backend Onboarding (2-3h)
**Fichier**: `backend/routes/onboarding.js`

**Tâches**:
- [ ] Route POST `/api/onboarding/check-slug` (vérifier disponibilité)
- [ ] Route POST `/api/onboarding/create-university`
  - Génération universityId unique
  - Création entrée `universities/{universityId}`
  - Création compte admin via Firebase Auth API REST
  - Association admin à université
  - Configuration initiale (devise, timezone, année académique)
- [ ] Validation des données
- [ ] Gestion erreurs (slug déjà pris, email existant)
- [ ] Email de bienvenue automatique

**Structure Firebase**:
```json
{
  "universities": {
    "univ-{slug}-{timestamp}": {
      "name": "Université Paris",
      "slug": "paris",
      "country": "France",
      "createdAt": 1234567890,
      "status": "active",
      "settings": {
        "currency": "EUR",
        "timezone": "Europe/Paris"
      }
    }
  }
}
```

### 🌆 Après-midi (4-5h)

#### 3. Interface Import CSV (3h)
**Fichier**: `src/pages/admin/ImportDataPage.jsx`

**Tâches**:
- [ ] Onglets: Import Étudiants / Import Enseignants
- [ ] Zone drag & drop fichier CSV
- [ ] Bouton télécharger template CSV
- [ ] Prévisualisation données (tableau)
- [ ] Mapping colonnes automatique
- [ ] Validation format (emails valides, matricules uniques)
- [ ] Barre de progression upload
- [ ] Rapport d'import (succès/erreurs)

**Templates CSV à créer**:
```
students_template.csv:
firstName,lastName,email,matricule,level,class,department,fieldOfStudy,dateOfBirth

teachers_template.csv:
firstName,lastName,email,department,specialization,phone
```

#### 4. Backend Import CSV (1-2h)
**Fichier**: `backend/routes/import.js`

**Tâches**:
- [ ] Route POST `/api/import/students` (parse CSV)
- [ ] Route POST `/api/import/teachers`
- [ ] Parsing CSV avec `papaparse` ou `csv-parser`
- [ ] Validation ligne par ligne
- [ ] Création comptes Firebase Auth (batch)
- [ ] Création profils dans Firebase Database
- [ ] Gestion erreurs (ligne 45: email invalide)
- [ ] Retour JSON avec rapport détaillé

**Livrables Jour 1**:
- ✅ Page signup fonctionnelle
- ✅ Nouvelle université créée automatiquement
- ✅ Import 100+ étudiants en 1 clic
- ✅ Import enseignants en masse

---

## 🗓️ JOUR 2 - Module 13: Facturation SaaS

**Objectif**: Système d'abonnement avec Stripe Sandbox  
**Temps**: 8-10 heures

### 🌅 Matin (4-5h)

#### 1. Configuration Stripe (1h)
**Fichier**: `backend/services/stripeService.js`

**Tâches**:
- [ ] Créer compte Stripe test
- [ ] Obtenir clés API test (pk_test_..., sk_test_...)
- [ ] Ajouter dans `.env`: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`
- [ ] Installer package: `npm install stripe`
- [ ] Créer service Stripe avec méthodes:
  - `createCustomer(email, name)`
  - `createCheckoutSession(priceId, customerId)`
  - `cancelSubscription(subscriptionId)`

#### 2. Définition Plans (1h)
**Fichier**: `src/data/subscriptionPlans.js`

**Tâches**:
- [ ] Définir 3 plans:

```javascript
export const PLANS = {
  basic: {
    name: 'Basic',
    price: 49,
    currency: 'EUR',
    interval: 'month',
    stripePriceId: 'price_xxx', // À créer dans Stripe Dashboard
    features: {
      maxStudents: 100,
      maxTeachers: 10,
      storage: '10GB',
      aiEnabled: false,
      videoConference: false,
      support: 'email'
    }
  },
  pro: {
    name: 'Pro',
    price: 199,
    currency: 'EUR',
    interval: 'month',
    stripePriceId: 'price_yyy',
    features: {
      maxStudents: 1000,
      maxTeachers: 50,
      storage: '100GB',
      aiEnabled: true,
      videoConference: true,
      support: 'priority'
    }
  },
  enterprise: {
    name: 'Enterprise',
    price: 499,
    currency: 'EUR',
    interval: 'month',
    stripePriceId: 'price_zzz',
    features: {
      maxStudents: 'unlimited',
      maxTeachers: 'unlimited',
      storage: '1TB',
      aiEnabled: true,
      videoConference: true,
      support: 'phone'
    }
  }
};
```

#### 3. Intégration Paiement dans Signup (2-3h)
**Fichier**: `src/pages/public/SignupPage.jsx` (ajout étape)

**Tâches**:
- [ ] Ajouter Étape 5: Choix du plan
  - Cards avec features
  - Prix affiché
  - Bouton "Choisir ce plan"
- [ ] Ajouter Étape 6: Paiement Stripe
  - Intégrer Stripe Elements
  - Formulaire carte bancaire
  - Bouton "Payer et créer mon université"
- [ ] Redirection vers Stripe Checkout
- [ ] Page de succès après paiement

### 🌆 Après-midi (4-5h)

#### 4. Backend Gestion Abonnements (2h)
**Fichier**: `backend/routes/subscriptions.js`

**Tâches**:
- [ ] Route POST `/api/subscriptions/create-checkout`
  - Créer customer Stripe
  - Créer checkout session
  - Retourner URL checkout
- [ ] Route POST `/api/subscriptions/cancel`
- [ ] Route GET `/api/subscriptions/status/:universityId`

#### 5. Webhooks Stripe (2h)
**Fichier**: `backend/routes/stripe-webhooks.js`

**Tâches**:
- [ ] Route POST `/webhook/stripe`
- [ ] Vérification signature webhook
- [ ] Gestion événements:
  - `checkout.session.completed` → Activer université
  - `invoice.payment_succeeded` → Update subscription
  - `invoice.payment_failed` → Alerter admin
  - `customer.subscription.deleted` → Suspendre université
- [ ] Mise à jour statut dans Firebase:

```json
{
  "platform": {
    "subscriptions": {
      "univ-xxx": {
        "plan": "pro",
        "status": "active",
        "stripeCustomerId": "cus_xxx",
        "stripeSubscriptionId": "sub_xxx",
        "currentPeriodEnd": 1234567890
      }
    }
  }
}
```

#### 6. Dashboard Super Admin Basique (2-3h)
**Fichier**: `src/pages/super-admin/SuperAdminDashboard.jsx`

**Tâches**:
- [ ] Route `/super-admin` (protégée role super_admin_plateforme)
- [ ] Métriques globales:
  - Nombre total universités
  - Revenus mensuels (MRR)
  - Universités actives/suspendues
- [ ] Liste universités:
  - Nom, slug, plan, statut, date création
  - Bouton "Suspendre" / "Réactiver"
- [ ] Graphique revenus (Chart.js)

**Livrables Jour 2**:
- ✅ Paiement Stripe fonctionnel
- ✅ 3 plans d'abonnement configurés
- ✅ Webhooks Stripe opérationnels
- ✅ Dashboard super admin basique

---

## 🗓️ JOUR 3 - Système de Notifications

**Objectif**: Communication automatique avec utilisateurs  
**Temps**: 8-10 heures

### 🌅 Matin (4-5h)

#### 1. Centre de Notifications (2h)
**Fichier**: `src/components/NotificationCenter.jsx`

**Tâches**:
- [ ] Composant global (dans Header)
- [ ] Icône cloche avec badge (nb non-lues)
- [ ] Dropdown avec liste notifications
- [ ] Types de notifications:
  - 📝 Nouvelle note publiée
  - 💰 Échéance paiement proche
  - 📢 Annonce administrative
  - ✅ Validation inscription
  - ⚠️ Alerte absence
- [ ] Marquer comme lu
- [ ] Lien vers ressource concernée
- [ ] Pagination (20 dernières)

**Structure Firebase**:
```json
{
  "notifications": {
    "$userId": {
      "$notificationId": {
        "type": "grade_published",
        "title": "Nouvelle note disponible",
        "message": "Note de Mathématiques publiée: 15/20",
        "read": false,
        "createdAt": 1234567890,
        "data": {
          "gradeId": "grade-xxx",
          "courseId": "course-yyy"
        }
      }
    }
  }
}
```

#### 2. Service Notifications (2-3h)
**Fichier**: `src/services/notificationService.js` + `backend/services/notificationService.js`

**Tâches Backend**:
- [ ] Fonction `createNotification(userId, type, data)`
- [ ] Fonction `notifyGradePublished(studentId, gradeData)`
- [ ] Fonction `notifyPaymentDue(studentId, installmentData)`
- [ ] Fonction `notifyAnnouncement(universityId, message)`
- [ ] Intégrer dans les événements:
  - Après création note → notifier étudiant + parent
  - 7 jours avant échéance → notifier étudiant
  - Nouvelle annonce → notifier tous users

**Tâches Frontend**:
- [ ] Hook `useNotifications()` (écoute temps réel)
- [ ] Fonction `markAsRead(notificationId)`
- [ ] Son de notification (optionnel)

### 🌆 Après-midi (4-5h)

#### 3. Emails Automatiques (2h)
**Fichier**: `backend/services/emailService.js`

**Tâches**:
- [ ] Configurer service email (SendGrid/Mailgun/Nodemailer)
- [ ] Templates HTML emails:
  - Bienvenue nouvel utilisateur
  - Note publiée
  - Échéance paiement
  - Validation inscription
- [ ] Fonction `sendEmail(to, subject, template, data)`
- [ ] Intégrer avec notificationService

#### 4. Annonces Globales (2-3h)
**Fichier**: `src/pages/admin/AnnouncementsPage.jsx`

**Tâches**:
- [ ] Interface création annonce (admin uniquement)
- [ ] Formulaire:
  - Titre
  - Message (rich text avec ReactQuill)
  - Type (info, urgent, événement)
  - Destinataires (tous, étudiants, enseignants, parents)
  - Date expiration (optionnel)
- [ ] Liste annonces avec filtres
- [ ] Modification/suppression
- [ ] Envoi notification + email automatique

**Structure Firebase**:
```json
{
  "universities": {
    "$universityId": {
      "announcements": {
        "$announcementId": {
          "title": "Fermeture exceptionnelle",
          "message": "L'université sera fermée...",
          "type": "urgent",
          "recipients": ["student", "teacher"],
          "createdBy": "admin-uid",
          "createdAt": 1234567890,
          "expiresAt": 1234599999
        }
      }
    }
  }
}
```

#### 5. Affichage Annonces (1h)
**Fichier**: `src/components/AnnouncementBanner.jsx`

**Tâches**:
- [ ] Banner en haut des dashboards
- [ ] Afficher annonces non expirées
- [ ] Style selon type (info=bleu, urgent=rouge)
- [ ] Bouton fermer (masquer)
- [ ] Auto-refresh toutes les 30s

**Livrables Jour 3**:
- ✅ Centre notifications fonctionnel
- ✅ Emails automatiques configurés
- ✅ Annonces globales opérationnelles
- ✅ Notifications temps réel

---

## 🗓️ JOUR 4 - Bibliothèque & Documents PDF

**Objectif**: E-learning + Documents officiels  
**Temps**: 8-10 heures

### 🌅 Matin (4-5h)

#### 1. Page Bibliothèque (2h)
**Fichier**: `src/pages/library/LibraryPage.jsx`

**Tâches**:
- [ ] Route `/library` (accessible tous rôles)
- [ ] Liste ressources avec filtres:
  - Par type (PDF, vidéo, lien)
  - Par cours
  - Par département
  - Recherche textuelle
- [ ] Cards ressources:
  - Titre, description, miniature
  - Type de ressource (icône)
  - Cours associé
  - Date ajout
  - Boutons: Télécharger/Voir/Ouvrir lien
- [ ] Vue grid/liste
- [ ] Pagination

#### 2. Upload Ressources (2-3h)
**Fichier**: `src/pages/admin/UploadResourcePage.jsx`

**Tâches**:
- [ ] Formulaire upload (admin/enseignant uniquement)
- [ ] Champs:
  - Titre, description
  - Type (PDF, vidéo, lien externe)
  - Cours associé (select)
  - Département
  - Tags
  - Fichier (drag & drop, max 50MB)
- [ ] Upload vers Firebase Storage
- [ ] Progress bar upload
- [ ] Génération miniature auto (PDF → image première page)
- [ ] Validation format (PDF, MP4, liens https://)

**Backend Firebase Storage**:
```
storage/
  universities/{universityId}/
    library/
      {resourceId}.pdf
      thumbnails/{resourceId}.jpg
```

### 🌆 Après-midi (4-5h)

#### 3. Génération Bulletins PDF (3h)
**Fichier**: `backend/services/pdfService.js`

**Tâches**:
- [ ] Installer `pdfkit` ou `puppeteer`
- [ ] Template bulletin de notes:
  - Header avec logo université
  - Infos étudiant (nom, matricule, classe, niveau)
  - Tableau notes par matière:
    - Nom cours
    - Coefficient
    - Note/20
    - Moyenne classe
  - Calcul moyennes:
    - Par matière
    - Générale (MGA)
  - Footer: Date génération, signature digitale
  - Mention (Très bien, Bien, Assez bien, Passable)
- [ ] Route GET `/api/pdf/bulletin/:studentId/:semester`
- [ ] Cache PDF généré (régénérer si nouvelles notes)

**Design PDF**:
```
┌─────────────────────────────────────┐
│  [LOGO]    UNIVERSITÉ PARIS         │
│         BULLETIN DE NOTES           │
│      Semestre 1 - 2025/2026         │
├─────────────────────────────────────┤
│  Étudiant: Jean DUPONT              │
│  Matricule: STU-2025-0001           │
│  Classe: L1 Informatique            │
├─────────────────────────────────────┤
│  Matière         | Coef | Note | Moy│
│  ────────────────|──────|──────|────│
│  Mathématiques   |  3   | 15/20| 12 │
│  Informatique    |  4   | 17/20| 14 │
│  Anglais         |  2   | 13/20| 11 │
├─────────────────────────────────────┤
│  Moyenne Générale: 15.2/20          │
│  Mention: Bien                      │
│  Rang: 5/45                         │
└─────────────────────────────────────┘
```

#### 4. Génération Reçus Paiement (1-2h)
**Fichier**: `backend/services/pdfService.js` (ajouter)

**Tâches**:
- [ ] Template reçu de paiement:
  - Header université + logo
  - N° reçu unique
  - Date paiement
  - Infos étudiant
  - Montant payé
  - Mode paiement
  - Reste à payer
  - Signature
- [ ] Route GET `/api/pdf/receipt/:paymentId`
- [ ] Bouton "Télécharger reçu" dans MyPaymentsPage

#### 5. Intégration dans UI (1h)
**Tâches**:
- [ ] Bouton "Télécharger bulletin" dans GradesDashboardPage
- [ ] Bouton "Télécharger reçu" dans MyPaymentsPage
- [ ] Loader pendant génération PDF
- [ ] Ouvrir PDF dans nouvel onglet

**Livrables Jour 4**:
- ✅ Bibliothèque avec upload PDF/vidéos
- ✅ Bulletins de notes PDF automatiques
- ✅ Reçus de paiement PDF officiels
- ✅ Download ressources pédagogiques

---

## 🗓️ JOUR 5 - Compléments Métier

**Objectif**: Finaliser fonctionnalités métier critiques  
**Temps**: 8-10 heures

### 🌅 Matin (4-5h)

#### 1. Calcul MGA & Classements (2h)
**Fichier**: `src/utils/gradeCalculations.js`

**Tâches**:
- [ ] Fonction `calculateMGA(studentId, semester, academicYear)`
  - Récupérer toutes les notes du semestre
  - Appliquer coefficients
  - Calculer moyenne pondérée globale
  - Retourner MGA arrondie
- [ ] Fonction `calculateClassRankings(classId, semester)`
  - Calculer MGA pour tous étudiants
  - Trier par MGA décroissant
  - Retourner array avec rang
- [ ] Fonction `getMention(mga)`
  - >= 16: "Très bien"
  - >= 14: "Bien"
  - >= 12: "Assez bien"
  - >= 10: "Passable"
  - < 10: "Insuffisant"

**Affichage**:
- [ ] Ajouter MGA dans GradesDashboardPage
- [ ] Ajouter rang dans bulletin PDF
- [ ] Page classement classe (admin/enseignant)

#### 2. Charges Horaires Enseignants (2-3h)
**Fichier**: `src/pages/admin/TeacherWorkloadPage.jsx`

**Tâches**:
- [ ] Tableau enseignants avec:
  - Nom enseignant
  - Département
  - Nombre de cours assignés
  - Heures totales semaine (calculées depuis emplois du temps)
  - Charge (Faible <10h, Normale 10-20h, Élevée >20h)
- [ ] Filtres par département
- [ ] Export Excel
- [ ] Graphique distribution charges

**Backend**:
- [ ] Fonction `calculateTeacherWorkload(teacherId, semester)`
- [ ] Compter heures depuis `liveSessions` + emplois du temps

### 🌆 Après-midi (4-5h)

#### 3. Workflow Inscriptions Complet (2h)
**Fichier**: `src/pages/admin/ValidateInscriptionPage.jsx`

**Tâches**:
- [ ] Upload pièces justificatives dans CreateStudentPage:
  - Photo identité
  - CNI/Passeport
  - Diplômes antérieurs
  - Certificat de scolarité
- [ ] Storage Firebase pour documents
- [ ] Page validation admin:
  - Liste étudiants status="pending"
  - Voir pièces uploadées
  - Commenter (documents manquants)
  - Boutons: Valider / Rejeter
- [ ] Vérification statut financier:
  - Si plan paiement existe → OK
  - Sinon → bloquer validation
- [ ] Notification étudiant après validation

#### 4. Statut "Diplômé" & Réinscription (1-2h)
**Tâches**:
- [ ] Ajouter statut "graduated" aux students
- [ ] Page clôture année:
  - Calculer MGA finale année
  - Si MGA >= 10 → passer niveau supérieur
  - Si niveau = M2 ou D3 → status = "graduated"
  - Générer relevé de notes final
- [ ] Workflow réinscription:
  - Bouton "Réinscrire pour 2026/2027"
  - Copier données étudiant
  - Reset notes/absences
  - Nouveau plan paiement
  - Email confirmation

#### 5. Syllabus Cours (1-2h)
**Fichier**: `src/pages/admin/CourseSyllabusPage.jsx`

**Tâches**:
- [ ] Ajouter onglet "Syllabus" dans CourseDetailsPage
- [ ] Rich text editor (ReactQuill)
- [ ] Sections:
  - Objectifs d'apprentissage
  - Programme détaillé (chapitres)
  - Prérequis
  - Bibliographie recommandée
  - Modalités évaluation
- [ ] Sauvegarde Firebase
- [ ] Vue publique pour étudiants

**Livrables Jour 5**:
- ✅ MGA calculée automatiquement
- ✅ Classements étudiants
- ✅ Charges horaires enseignants
- ✅ Workflow inscriptions complet avec documents
- ✅ Statut diplômé et réinscription
- ✅ Syllabus cours détaillés

---

## 📊 Résultats Attendus Fin 5 Jours

### Taux de Complétion

| Module | Avant | Après | Gain |
|--------|-------|-------|------|
| 1. Étudiants | 50% | 90% | +40% |
| 2. Enseignants | 50% | 90% | +40% |
| 3. Cours | 67% | 95% | +28% |
| 4. Notes | 40% | 90% | +50% |
| 5. Inscriptions | 20% | 85% | +65% |
| 6. Financier | 75% | 95% | +20% |
| 7. Bibliothèque | 0% | 80% | +80% |
| 8. Notifications | 0% | 90% | +90% |
| **Module 13 (SaaS)** | 0% | 85% | +85% |
| **Module 14 (Onboarding)** | 0% | 90% | +90% |
| **GLOBAL** | **41%** | **87%** | **+46%** |

### Nouveaux Modules Opérationnels

✅ **Module 13 - Facturation SaaS**
- Plans d'abonnement (Basic, Pro, Enterprise)
- Paiement Stripe intégré
- Webhooks fonctionnels
- Dashboard super admin

✅ **Module 14 - Onboarding**
- Inscription self-service
- Import CSV masse
- Génération automatique université

✅ **Système Notifications**
- Centre notifications temps réel
- Emails automatiques
- Annonces globales

✅ **Bibliothèque Numérique**
- Upload/Download ressources
- PDF + vidéos + liens
- Organisation par cours

✅ **Documents Officiels**
- Bulletins PDF automatiques
- Reçus paiement PDF
- Logo université intégré

✅ **Compléments Métier**
- MGA et classements
- Charges horaires enseignants
- Workflow inscriptions complet
- Statut diplômé
- Syllabus cours

---

## 🎯 Organisation du Travail

### Méthodologie
- **Sprints de 2h** avec pause 15min
- **Commits réguliers** après chaque fonctionnalité
- **Tests manuels** après chaque module
- **Documentation** en parallèle

### Outils
- VS Code + extensions
- Firebase Console ouvert
- Stripe Dashboard test
- Postman pour tester API
- Git avec branches par jour

### Communication
- Point début journée (objectifs)
- Point fin journée (livrables)
- Blocages signalés immédiatement

---

## 📋 Checklist Pré-Démarrage

### Environnement
- [ ] Node.js à jour (v18+)
- [ ] Dépendances installées (`npm install`)
- [ ] Backend opérationnel
- [ ] Firebase configuré
- [ ] Variables d'environnement OK

### Outils à installer
- [ ] `npm install stripe` (backend)
- [ ] `npm install papaparse` (parsing CSV)
- [ ] `npm install pdfkit` (génération PDF)
- [ ] `npm install react-quill` (rich text editor)
- [ ] `npm install chart.js react-chartjs-2` (graphiques)
- [ ] `npm install nodemailer` ou SendGrid (emails)

### Comptes à créer
- [ ] Compte Stripe test (stripe.com)
- [ ] Service email (SendGrid gratuit ou Mailgun)

---

## 🚀 Go/No-Go

**Prêt à démarrer?**
- ✅ Planning détaillé défini
- ✅ Objectifs clairs par jour
- ✅ Priorisation respecte cahier des charges
- ✅ Estimation réaliste (5 jours intensifs)

**Commençons par le Jour 1 - Module 14: Onboarding?** 

Dites "GO" et je commence immédiatement avec la page SignupPage.jsx! 🚀
