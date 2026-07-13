# 🎓 UniversaSaaS - Plateforme de Gestion Universitaire Multi-tenant

> Projet de fin d'études GoMyCode - Solution SaaS complète pour la gestion d'établissements d'enseignement supérieur

[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)](https://react.dev)
[![Firebase](https://img.shields.io/badge/Firebase-12.15-FFCA28?logo=firebase)](https://firebase.google.com)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📋 Table des matières

- [Vue d'ensemble](#-vue-densemble)
- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Utilisation](#-utilisation)
- [Comptes de test](#-comptes-de-test)
- [Structure du projet](#-structure-du-projet)
- [Sécurité](#-sécurité)
- [Problèmes connus](#-problèmes-connus)
- [Roadmap](#-roadmap)

---

## 🎯 Vue d'ensemble

**UniversaSaaS** est une plateforme SaaS (Software as a Service) multi-tenant permettant à plusieurs universités de gérer leurs opérations académiques, financières et administratives de manière isolée et sécurisée.

### Caractéristiques principales

- 🏢 **Multi-tenant** : Isolation complète des données par université
- 🔐 **RBAC** : 5 rôles utilisateurs avec permissions granulaires
- 📱 **Responsive** : Interface moderne et adaptative
- 🔄 **Temps réel** : Synchronisation instantanée via Firebase Realtime Database
- 🌍 **Internationalisation** : Support multi-devises et fuseaux horaires
- 📊 **Analytics** : Tableaux de bord et statistiques avancées

---

## ✨ Fonctionnalités

### 🎓 Modules Académiques

#### ✅ Gestion des Étudiants
- CRUD complet avec validation
- Matricule permanent unique (format: `UNI-YYYY-NNNN`)
- Profils détaillés (infos personnelles, académiques, financières)
- Import CSV en masse
- Historique d'absences et notes
- Association aux parents

#### ✅ Gestion des Enseignants
- CRUD avec spécialités et départements
- Affectation de cours et salles
- Emploi du temps personnalisé
- Saisie de notes et présences
- Profil public

#### ✅ Gestion des Classes
- Création et configuration (niveaux, filières, capacités)
- Association étudiants/enseignants/cours
- Emploi du temps hebdomadaire
- Gestion des salles

#### ✅ Gestion des Cours
- Catalogue de cours avec crédits ECTS
- Affectation enseignants et planification
- Matériel pédagogique (futur)

#### ✅ Système de Notes
- Saisie par enseignant avec validation
- Calcul automatique des moyennes pondérées
- Coefficients par matière
- Statistiques de classe (min/max/moyenne)
- Export PDF des bulletins
- Dashboard étudiant et parent temps réel

#### ✅ Gestion des Absences
- Pointage par enseignant (présent/absent/retard/excusé)
- Suivi en temps réel pour étudiants et parents
- Statistiques d'assiduité
- Filtres par période et statut

### 💰 Modules Financiers

#### ✅ Comptabilité
- Dashboard comptable avec KPIs
- Journal de trésorerie (recettes/dépenses)
- Catégorisation des transactions
- Exports Excel et PDF
- Graphiques d'évolution

#### ✅ Gestion des Paiements Étudiants
- Plans de paiement personnalisés
- Suivi des échéances et relances automatiques
- Historique de paiements
- Statuts (en attente/payé/en retard)
- Attestations de paiement

#### ✅ Recettes & Dépenses
- Enregistrement avec catégories
- Justificatifs (références)
- Ventilation par département
- Rapports mensuels/annuels

### 💬 Communication

#### ✅ Messagerie Interne
- Envoi individuel, groupé et broadcast
- Filtres avancés (rôle, recherche)
- Threading (conversations Gmail-style)
- Messages envoyés/reçus
- Système de batches pour envois massifs
- Notifications temps réel
- Marquage lu/non lu
- **Restrictions** : Étudiants ne peuvent contacter que profs/admin/comptables

#### ✅ Notifications
- 9 types : messages, absences, notes, paiements, etc.
- Badge en temps réel
- Centre de notifications avec filtres
- Actions rapides (marquer lu, supprimer)

### 👥 Gestion des Utilisateurs

#### ✅ Rôles et Permissions (RBAC)

| Rôle | Accès |
|------|-------|
| **Super Admin** | Gestion multi-universités, configuration globale |
| **Admin Université** | Gestion complète de son établissement |
| **Comptable** | Finance, paiements, trésorerie |
| **Enseignant** | Notes, absences, emploi du temps, messages |
| **Étudiant** | Consultation notes/absences/paiements, messages restreints |
| **Parent** | Suivi enfants (notes/absences/paiements) |

#### ✅ Onboarding & Import
- **Tunnel d'inscription** : 4 étapes (établissement, slug, admin, config)
- **Import CSV** : Étudiants et enseignants en masse
- **Création parents** : Association automatique aux enfants

---

## 🏗️ Architecture

### Stack Technique

**Frontend**
- ⚛️ React 19.2 + Vite
- 🎨 TailwindCSS 3.4
- 🧭 React Router 7
- 🎯 Lucide Icons
- 📊 Recharts (graphiques)
- 📄 jsPDF (exports PDF)

**Backend & Infrastructure**
- 🔥 Firebase Authentication (email/password)
- 🗄️ Firebase Realtime Database (NoSQL)
- 📦 Firebase Storage (fichiers - futur)
- 🔒 Firebase Security Rules (validation serveur)

### Modèle de Données Multi-tenant

```
/
├── users/                          # Profils utilisateurs globaux
│   └── {uid}/
│       ├── email, displayName, role
│       ├── universityId            # Référence université
│       └── ...
│
├── universities/                   # Données isolées par université
│   └── {universityId}/
│       ├── adminId, name, slug
│       ├── students/
│       │   └── {studentId}/
│       ├── teachers/
│       │   └── {teachId}/
│       ├── classes/
│       │   └── {classId}/
│       ├── courses/
│       ├── grades/                 # Notes
│       ├── attendances/            # Absences
│       ├── payments/               # Paiements
│       ├── revenues/               # Recettes
│       ├── expenses/               # Dépenses
│       ├── messages/               # Messagerie
│       ├── messageBatches/         # Campagnes
│       └── notifications/
│
└── platformConfig/                 # Configuration globale
```

**Principes clés** :
- ✅ **Isolation stricte** : Chaque université ne peut accéder qu'à ses données
- ✅ **Validation Firebase Rules** : Contrôle d'accès côté serveur
- ✅ **Index optimisés** : Performances sur grandes bases

---

## 🚀 Installation

### Prérequis

- Node.js 18+ et npm
- Compte Firebase (plan Blaze recommandé pour production)
- Git

### Étapes

```bash
# 1. Cloner le repository
git clone https://github.com/votre-username/university-saas.git
cd university-saas

# 2. Installer les dépendances
npm install

# 3. Copier et configurer les variables d'environnement
cp .env.example .env.local
# Éditer .env.local avec vos credentials Firebase

# 4. Déployer les Firebase Rules
firebase login
firebase deploy --only database

# 5. Lancer le serveur de développement
npm run dev
```

Ouvrir http://localhost:5173

---

## ⚙️ Configuration

### Variables d'environnement (`.env.local`)

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Environment
VITE_APP_ENV=development

# Mots de passe par défaut (DEV UNIQUEMENT)
TEST_ADMIN_PASSWORD=Admin123456
TEST_TEACHER_PASSWORD=Prof123456
TEST_STUDENT_PASSWORD=Student123456
TEST_PARENT_PASSWORD=Parent123456
```

### Firebase Rules

Les règles de sécurité sont dans `database.rules.json`. **Déployer après chaque modification** :

```bash
firebase deploy --only database
```

---

## 📖 Utilisation

### Comptes de test

| Rôle | Email | Mot de passe | UniversityId |
|------|-------|--------------|--------------|
| **Admin** | newadmin@sorbonne.fr | Admin123456 | univ-sorbonne-2026 |
| **Enseignant** | teacher.test@sorbonne.fr | Prof123456 | univ-sorbonne-2026 |
| **Étudiant** | etudiant@sorbonne.fr | Student123456 | univ-sorbonne-2026 |

### Scripts utiles

```bash
# Seed database avec données de test
npm run seed

# Créer des comptes de test
npm run create-accounts

# Créer parent avec plusieurs enfants
npm run create-parent-multi

# Build production
npm run build

# Preview production
npm run preview
```

### Première connexion

1. **Inscription** : Aller sur `/signup`
   - Étape 1 : Infos établissement
   - Étape 2 : Slug unique (URL)
   - Étape 3 : Compte admin
   - Étape 4 : Configuration initiale

2. **Import de données** : `/admin/import`
   - Télécharger template CSV
   - Drag & drop du fichier
   - Validation et import

3. **Configuration** : `/admin/settings`
   - Année académique
   - Devise, fuseau horaire
   - Logo et branding

---

## 📂 Structure du projet

```
university-saas/
├── public/                         # Assets statiques
├── src/
│   ├── components/                 # Composants réutilisables
│   │   ├── signup/                 # Étapes inscription
│   │   ├── Header.jsx
│   │   ├── Layout.jsx
│   │   └── ...
│   ├── contexts/                   # Context API
│   │   └── AuthContext.jsx        # Authentification globale
│   ├── hooks/                      # Hooks personnalisés
│   │   ├── useMessages.js
│   │   ├── useNotifications.js
│   │   └── ...
│   ├── pages/                      # Pages (routes)
│   │   ├── admin/                  # Pages admin université
│   │   ├── dashboards/             # Dashboards par rôle
│   │   ├── messages/               # Messagerie
│   │   ├── parent/                 # Pages parent
│   │   ├── public/                 # Pages publiques
│   │   ├── student/                # Pages étudiant
│   │   ├── teacher/                # Pages enseignant
│   │   └── ...
│   ├── services/                   # Logique métier
│   │   ├── messageService.js
│   │   ├── notificationService.js
│   │   ├── studentService.js
│   │   └── ...
│   ├── utils/                      # Utilitaires
│   │   ├── matriculeGenerator.js
│   │   ├── pdfGenerator.js
│   │   └── ...
│   ├── config/
│   │   └── firebase.js             # Init Firebase
│   ├── App.jsx                     # Router principal
│   └── main.jsx                    # Point d'entrée
├── scripts/                        # Scripts Node.js
│   ├── seedDatabase.mjs
│   └── createTestAccounts.mjs
├── database.rules.json             # Firebase Security Rules
├── .env.local                      # Variables d'environnement
├── package.json
└── README.md
```

---

## 🔒 Sécurité

### Firebase Security Rules

**Principes** :
- ✅ **Lecture** : Utilisateur ne lit que ses données ou celles de son université
- ✅ **Écriture** : Validation stricte des champs requis
- ✅ **Isolation** : `universityId` vérifié sur chaque requête
- ✅ **Validation** : Types, longueurs, formats côté serveur

**Exemples** :

```json
// Messages : Seuls expéditeur/destinataire peuvent lire
"messages": {
  "$messageId": {
    ".read": "auth != null && (data.child('from').val() === auth.uid || data.child('to').val() === auth.uid)",
    ".write": "auth != null && ((newData.child('from').val() === auth.uid) || (data.child('to').val() === auth.uid)) && root.child('users').child(auth.uid).child('universityId').val() === $universityId"
  }
}

// Étudiants : Lecture par université, écriture admin uniquement
"students": {
  ".read": "auth != null && root.child('users').child(auth.uid).child('universityId').val() === $universityId",
  ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin_universite'"
}
```

### Bonnes pratiques

- 🔑 **Mots de passe** : Minimum 8 caractères, Firebase Auth
- 🚫 **XSS** : Sanitization avec DOMPurify
- 🔒 **HTTPS** : Obligatoire en production
- 📝 **Logs** : Pas de données sensibles en console (production)
- ⚠️ **Validation** : Double validation (client + Firebase Rules)

---

## 🐛 Problèmes connus

### Messagerie
- ❌ **Bouton "Répondre"** : Le destinataire n'est pas toujours présélectionné automatiquement
  - **Cause** : Multiples UIDs en doublon dans certaines collections (étudiants/enseignants)
  - **Workaround** : Sélectionner manuellement le destinataire
  - **Fix prévu** : Script de nettoyage des UIDs en doublon

### Performances
- ⚠️ **Chargement initial** : Peut être lent avec >1000 étudiants
  - **Mitigation** : Pagination à implémenter
  
### UI/UX
- 📱 **Mobile** : Quelques ajustements responsive à peaufiner
- 🎨 **Dark mode** : Pas encore implémenté

---

## 🗺️ Roadmap

### Court terme (Sprint actuel)
- [x] Messagerie avec threading
- [x] Restrictions destinataires étudiants
- [x] Import CSV étudiants/enseignants
- [ ] Correction UIDs en doublon (script automatique)
- [ ] Présélection destinataire dans "Répondre"
- [ ] Tests end-to-end messagerie

### Moyen terme
- [ ] Module Bibliothèque (gestion prêts/retours)
- [ ] Module Événements & Calendrier académique
- [ ] Module Ressources pédagogiques (docs, vidéos)
- [ ] Assistant IA intégré (déjà en base, à activer)
- [ ] Dark mode
- [ ] PWA (Progressive Web App)

### Long terme
- [ ] Module Vidéo Live (Agora.io déjà configuré)
- [ ] Module Examens en ligne
- [ ] Application mobile (React Native)
- [ ] API REST publique
- [ ] Webhooks pour intégrations tierces
- [ ] Multi-langue (i18n)

---

## 📊 Statistiques du projet

- **Lignes de code** : ~15,000+
- **Composants React** : 80+
- **Pages** : 60+
- **Services** : 12+
- **Firebase Rules** : 800+ lignes
- **Modules fonctionnels** : 15+

---

## 🤝 Contribution

Ce projet est développé dans le cadre d'un projet de fin d'études. Les contributions sont actuellement limitées à l'équipe du projet.

---

## 📄 License

MIT License - Voir [LICENSE](LICENSE) pour plus de détails.

---

## 👨‍💻 Auteur

**Projet de fin d'études GoMyCode**

Développé avec ❤️ et beaucoup de ☕

---

## 🙏 Remerciements

- GoMyCode pour l'encadrement
- Firebase pour l'infrastructure
- React & Vite pour les outils de développement
- La communauté open-source

---

## 📞 Support

Pour toute question ou problème :
- 📧 Email : [votre-email]
- 🐛 Issues : [GitHub Issues](https://github.com/votre-username/university-saas/issues)
- 📖 Documentation : [Wiki](https://github.com/votre-username/university-saas/wiki)

---

**⭐ Si ce projet vous plaît, n'hésitez pas à lui donner une étoile !**
