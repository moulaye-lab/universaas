# 🚀 SaaS de Gestion Universitaire & E-Learning Piloté par IA

> **Projet de Fin d'Études GoMyCode** - Conception, structuration et déploiement d'un SaaS multi-tenant production-ready

[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)](https://react.dev)
[![Firebase](https://img.shields.io/badge/Firebase-12.15-FFCA28?logo=firebase)](https://firebase.google.com)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?logo=vercel)](https://university-saas.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

🔗 **Application en production** : [university-saas.vercel.app](https://university-saas.vercel.app)

---

## 🎯 À propos de ce projet

Ce projet marque l'aboutissement de mon **Bootcamp GoMyCode Full-Stack Development**. Il consiste en la conception, la structuration et le déploiement d'un **SaaS (Software as a Service) complet**, multi-tenant et piloté par intelligence artificielle. 

L'application simule une plateforme commerciale prête pour le marché (*Production-Ready*) et démontre ma capacité à :
- Architecturer des applications web complexes et scalables
- Implémenter des fonctionnalités métier avancées
- Sécuriser et déployer des solutions en production
- Collaborer avec des agents IA de développement pour accélérer la livraison

---

## 🛠️ Architecture Technique & Sécurité

### Stack Technique

**Frontend**
- ⚛️ **React 19.2** avec **Vite** - Performance optimale et développement rapide
- 🎨 **TailwindCSS 3.4** - Design system moderne et responsive
- 🧭 **React Router 7** - Navigation SPA fluide
- 📊 **Recharts** - Visualisations de données interactives
- 📄 **jsPDF** - Génération de documents (bulletins, attestations)

**Backend & Infrastructure**
- 🔥 **Firebase Authentication** - Gestion sécurisée des utilisateurs
- 🗄️ **Firebase Realtime Database** - Base NoSQL temps réel
- 🔒 **Firebase Security Rules** - Validation serveur stricte (800+ lignes)
- ☁️ **Vercel** - Déploiement serverless en production
- 🤖 **Anthropic Claude 3.5** - Assistant IA intégré

### Principes Architecturaux

✅ **Multi-tenancy & Isolation Stricte**
- Cloisonnement logique total des données de chaque université
- Architecture NoSQL structurée avec `universityId` comme clé d'isolation
- Chaque tenant ne peut accéder qu'à ses propres données

✅ **Sécurité en Profondeur**
- Authentification Firebase avec validation email/téléphone
- Firebase Security Rules avec contrôle d'accès par rôle (RBAC)
- Validation des données côté client ET serveur
- Variables d'environnement sécurisées
- HTTPS obligatoire en production

✅ **Performance & Scalabilité**
- Pagination et lazy loading pour grandes datasets
- Index optimisés sur Firebase (`.indexOn`)
- Code splitting et optimisation des bundles
- Cache CDN via Vercel Edge Network

---

## 🧠 Compétences Acquises durant le Bootcamp

Ce projet de fin d'études m'a permis de consolider des compétences techniques et méthodologiques de haut niveau :

### 1️⃣ Méthodologie de Développement Moderne
- ✅ Utilisation avancée des **agents IA de développement** (Claude, Cursor, ChatGPT)
- ✅ Formulation de **prompts et requêtes complexes** pour accélérer le cycle de développement
- ✅ **Débogage assisté par IA** : résolution rapide de bugs critiques (Firebase Rules, routing, state management)
- ✅ Maintien de la **qualité du code** malgré l'accélération par IA

### 2️⃣ Architecture NoSQL & Modélisation
- ✅ Maîtrise des concepts de **dénormalisation de données**
- ✅ Gestion des relations par **identifiants uniques** (UIDs)
- ✅ Design de schémas Firebase optimisés pour la **lecture et l'écriture**
- ✅ Stratégies d'**indexation** pour éviter les scans complets

### 3️⃣ Sécurité & Gestion Cloud
- ✅ Configuration fine des **environnements de production** (.env, secrets)
- ✅ Déploiement **serverless** sur Vercel avec CI/CD automatisé
- ✅ Gestion des **clés API** et rotation de credentials (Firebase Service Accounts)
- ✅ Mise en place de **Firebase Security Rules** granulaires (validation par champ)

### 4️⃣ Résolution de Problèmes Métier Complexes
- ✅ Implémentation d'**algorithmes de calcul de moyennes pondérées** (notes)
- ✅ **Filtrage d'événements dynamique** par filière (calendrier académique)
- ✅ **Prévention des conflits** de plannings (détection de chevauchements)
- ✅ **Messagerie threadée** avec restrictions par rôle (comme Gmail)

### 5️⃣ Collaboration & Méthodologie Agile
- ✅ Découpage du projet en **modules indépendants** (gestion étudiants, comptabilité, messagerie)
- ✅ Itérations rapides avec **feedback loops** (tests manuels systématiques)
- ✅ Documentation technique rigoureuse (README, commentaires, Firebase Rules)
- ✅ Gestion de versions avec **Git** (branches, commits atomiques, messages clairs)

---

## ✨ Fonctionnalités Principales

### 🎓 Modules Académiques
- ✅ **Gestion Étudiants** : CRUD complet, matricule permanent unique, import CSV masse
- ✅ **Gestion Enseignants** : Profils, affectation cours, saisie notes/absences
- ✅ **Gestion Classes** : Emplois du temps, capacités, association étudiants/profs
- ✅ **Système de Notes** : Calcul moyennes pondérées, bulletins PDF, statistiques
- ✅ **Gestion Absences** : Pointage temps réel, suivi parents, exports

### 💰 Modules Financiers
- ✅ **Comptabilité** : Dashboard KPIs, journal trésorerie, exports Excel/PDF
- ✅ **Paiements Étudiants** : Plans personnalisés, échéances, relances automatiques
- ✅ **Recettes & Dépenses** : Catégorisation, ventilation par département

### 💬 Communication
- ✅ **Messagerie Interne** : Threading Gmail-style, envois groupés, filtres avancés
- ✅ **Notifications** : 9 types (messages, absences, notes...), temps réel
- ✅ **Restrictions** : Étudiants ne contactent que profs/admin/comptables

### 📚 Autres Modules
- ✅ **Bibliothèque** : Gestion prêts/retours, amendes, statistiques
- ✅ **Onboarding** : Tunnel inscription 4 étapes avec validation progressive
- ✅ **RBAC** : 5 rôles (Super Admin, Admin Université, Comptable, Enseignant, Étudiant, Parent)

---

## 🚀 Déploiement en Production

### URL de Production
🔗 [university-saas.vercel.app](https://university-saas.vercel.app)

### Comptes de Test

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| **🔥 Super Admin (SaaS Owner)** | superadmin@universaas.com | SuperAdmin2026! |
| **Admin Université** | newadmin@sorbonne.fr | Admin123456 |
| **Enseignant** | teacher.test@sorbonne.fr | Prof123456 |
| **Étudiant** | etudiant@sorbonne.fr | Student123456 |

> **⚠️ IMPORTANT pour le Super Admin :**  
> Lors de la **première connexion**, cliquer sur le bouton **"Synchroniser"** en haut du dashboard pour migrer les universités existantes dans `system_admin/tenants_management/`. Cela permet d'afficher correctement les stats et la liste des universités.

### Pipeline de Déploiement
1. **Push sur GitHub** (`preproduction` branch)
2. **Vercel CI/CD** : Build automatique avec variables d'environnement
3. **Déploiement** : CDN global, HTTPS, optimisations Edge
4. **Monitoring** : Logs temps réel, analytics Vercel

---

## 💻 Installation Locale

### Prérequis
- Node.js 18+
- npm ou yarn
- Compte Firebase (plan Blaze recommandé)

### Étapes

```bash
# 1. Cloner le repository
git clone https://github.com/moulaye-lab/universaas.git
cd universaas

# 2. Installer les dépendances
npm install

# 3. Configurer Firebase
cp .env.example .env.local
# Éditer .env.local avec vos credentials Firebase

# 4. Déployer les Firebase Rules
firebase login
firebase deploy --only database

# 5. Lancer en local
npm run dev
```

Ouvrir http://localhost:5173

---

## 📊 Métriques du Projet

- **~15,000+ lignes de code** JavaScript/JSX
- **80+ composants React** réutilisables
- **60+ pages** (routes)
- **15+ modules fonctionnels** complets
- **800+ lignes Firebase Rules** (validation serveur)
- **12+ services métier** (logique isolée)
- **3 semaines** de développement intensif

---

## 💼 Prêt pour une Nouvelle Étape Professionnelle

Ce Bootcamp m'a transformé. En concevant ce SaaS de bout en bout, j'ai acquis la **rigueur** et l'**autonomie** d'un **Ingénieur Logiciel Full-Stack**.

### Ce que je suis capable de faire aujourd'hui :
✅ **Intégrer une équipe technique agile** dès maintenant  
✅ **Concevoir des architectures** applicatives sécurisées et scalables  
✅ **Déployer en production** avec CI/CD et monitoring  
✅ **Collaborer avec des agents IA** pour maximiser la vélocité  
✅ **M'adapter rapidement** à de nouvelles technologies (frameworks de réflexion logicielle acquis)  
✅ **Résoudre des problèmes métier complexes** de manière autonome  

Je suis **prêt à relever de nouveaux défis professionnels** et à apporter une réelle valeur ajoutée à des projets d'envergure.

---

## 🔒 Sécurité & Conformité

### Firebase Security Rules
- ✅ Validation stricte des types et formats côté serveur
- ✅ Isolation par `universityId` sur chaque requête
- ✅ Contrôle d'accès par rôle (RBAC)
- ✅ Prévention des injections et XSS

### Bonnes Pratiques
- 🔑 Mots de passe minimum 8 caractères (Firebase Auth)
- 🚫 Sanitization avec DOMPurify
- 🔒 HTTPS obligatoire en production
- 📝 Pas de données sensibles en logs (production)
- ⚠️ Double validation client + serveur

---

## 📂 Structure du Projet

```
university-saas/
├── src/
│   ├── components/          # Composants réutilisables
│   ├── contexts/            # AuthContext (state global)
│   ├── hooks/               # Custom hooks (useMessages, useNotifications...)
│   ├── pages/               # Pages par rôle (admin, teacher, student...)
│   ├── services/            # Logique métier isolée
│   ├── utils/               # Utilitaires (PDF, matricule, date...)
│   └── config/              # Configuration Firebase
├── scripts/                 # Scripts de seed et maintenance
├── database.rules.json      # Firebase Security Rules
├── vercel.json              # Configuration déploiement
└── README.md
```

---

## 🗺️ Roadmap Futur

### Améliorations Prévues
- [ ] Module Examens en Ligne (quiz, QCM)
- [ ] Module Vidéo Live (Agora.io déjà configuré)
- [ ] PWA (Progressive Web App) avec mode offline
- [ ] Dark Mode
- [ ] Application Mobile (React Native)
- [ ] API REST publique pour intégrations tierces

---

## 🙏 Remerciements

- **GoMyCode** pour l'encadrement et la formation de qualité
- **Firebase** pour l'infrastructure cloud robuste
- **Anthropic Claude** pour l'assistance IA pendant le développement
- **La communauté open-source** pour les outils et librairies

---

## 📞 Contact

📧 **Email** : moulayef6@gmail.com  
🔗 **GitHub** : [moulaye-lab](https://github.com/moulaye-lab)  
🌐 **Production** : [university-saas.vercel.app](https://university-saas.vercel.app)

---

**⭐ Si ce projet vous plaît, n'hésitez pas à lui donner une étoile sur GitHub !**

---

*Développé avec ❤️ et beaucoup de ☕ dans le cadre du Bootcamp GoMyCode Full-Stack Development*
