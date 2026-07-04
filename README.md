# 🎓 SaaS de Gestion Universitaire Multi-Tenant

## 📋 Vue d'ensemble
Application SaaS complète de gestion universitaire et d'e-learning, multi-tenant avec isolation stricte des données par université. Piloté entièrement par IA.

## 🏗️ Architecture Technique

### Stack Technologique
- **Frontend**: React 19.2 + Vite 8.1
- **Routing**: React Router DOM 7.18
- **Formulaires**: React Hook Form 7.80
- **Styling**: Tailwind CSS 4.3
- **Icons**: Lucide React 1.23
- **Backend**: Firebase (Authentication + Realtime Database)

### Sécurité Multi-Tenant
- Isolation stricte via `universityId`
- Règles de sécurité Firebase (database.rules.json)
- RBAC (Role-Based Access Control)

### Rôles Utilisateurs
1. **super_admin_plateforme** - Propriétaire du SaaS
2. **admin_universite** - Administrateur d'une université
3. **teacher** - Enseignant (peut avoir plusieurs classes)
4. **student** - Étudiant
5. **parent** - Parent/Tuteur (lié à un ou plusieurs enfants)

## 🎯 Modules à Implémenter

### 🌐 PARTIE 1: VITRINE & ONBOARDING
- [ ] **Landing Page Publique**
  - [ ] Hero Section avec CTA
  - [ ] Grille des fonctionnalités
  - [ ] Tableau des tarifs (Standard, Premium, Enterprise)
  - [ ] Témoignages / Social Proof
  - [ ] Footer avec liens

- [ ] **Module 13: Facturation SaaS**
  - [ ] Gestion des abonnements (Stripe Sandbox)
  - [ ] Dashboard Super-Admin Plateforme
  - [ ] Monitoring financier global
  - [ ] Suspension d'accès

- [ ] **Module 14: Onboarding Automatisé**
  - [ ] Tunnel d'inscription université
  - [ ] Génération identifiant unique/slug
  - [ ] Création premier admin_universite
  - [ ] Import CSV/Excel masse (profs/étudiants)

- [ ] **Module 15: Sécurité & Audit**
  - [ ] Logs d'audit traçables
  - [ ] Export RGPD (JSON)
  - [ ] Clôture année académique
  - [ ] Archivage automatique

### 🎓 PARTIE 2: MODULES MÉTIER ACADÉMIQUES

- [ ] **Module 1: Gestion des Étudiants**
  - [ ] Inscription/Réinscription
  - [ ] Génération matricule unique
  - [ ] Gestion statuts (Actif, Suspendu, Diplômé)
  - [ ] Historique parcours

- [ ] **Module 2: Gestion des Enseignants**
  - [ ] Profils de compétences
  - [ ] Affectation cours/classes
  - [ ] Suivi charges horaires

- [ ] **Module 3: Gestion Cours & Programmes**
  - [ ] Catalogue des cours
  - [ ] Coefficients et crédits ECTS
  - [ ] Syllabus détaillés

- [ ] **Module 4: Notes & Évaluations**
  - [ ] Types de contrôles (Devoirs, Examens, Projets)
  - [ ] Calcul moyennes pondérées
  - [ ] Génération bulletins automatiques
  - [ ] Classements

- [ ] **Module 5: Inscriptions & Réinscriptions**
  - [ ] Dépôt pièces justificatives
  - [ ] Validation administrative
  - [ ] Corrélation statut financier

- [ ] **Module 6: Gestion Financière Interne**
  - [ ] Configuration frais par filière
  - [ ] Suivi échéances/tranches
  - [ ] Édition reçus

- [ ] **Module 7: Bibliothèque & E-learning**
  - [ ] Dépôt supports (PDF, vidéos)
  - [ ] Suivi progression étudiants
  - [ ] Gestion emprunts/retours

- [ ] **Module 8: Notifications**
  - [ ] Annonces globales direction
  - [ ] Alertes financières auto
  - [ ] Notifications résultats

- [ ] **Module 9: Cours Vidéo en Direct (Live Streaming)** 🆕
  - [ ] Intégration Agora.io SDK
  - [ ] Interface cours en direct (vidéo/audio)
  - [ ] Système d'invitations (comme Google Meet)
  - [ ] Chat en temps réel pendant les cours
  - [ ] Partage d'écran professeur
  - [ ] Gestion participants (micro, caméra)
  - [ ] Enregistrement automatique des sessions
  - [ ] Consultation des cours enregistrés
  - [ ] Émojis réactions (lever la main, applaudir)

- [ ] **Module 10: Messagerie Instantanée Professionnelle** 🆕
  - [ ] **Professeur ↔ Étudiant**
    - [ ] Messagerie 1-to-1 (conversation privée)
    - [ ] Le prof voit l'identité exacte de l'étudiant (nom, classe, photo)
    - [ ] Historique des conversations par étudiant
    - [ ] Statut en ligne/hors ligne
    - [ ] Notifications temps réel
  - [ ] **Parent ↔ Professeur**
    - [ ] Le parent choisit le professeur dans une liste (profs de son enfant)
    - [ ] Le prof voit l'identité du parent (nom, enfant concerné, classe)
    - [ ] Contexte affiché : "Parent de [Nom Enfant] - Classe [L1 Info]"
    - [ ] Gestion multi-classes (un prof peut avoir plusieurs classes)
  - [ ] **Directeur (Admin Université) ↔ Professeur** 🆕
    - [ ] Le directeur peut contacter n'importe quel professeur
    - [ ] Messagerie + possibilité d'appel audio/vidéo instantané
    - [ ] Contexte : "Direction → Prof. [Nom]"
    - [ ] Pour discussions administratives/problèmes établissement
  - [ ] **Fonctionnalités communes**
    - [ ] Messages texte + pièces jointes (PDF, images)
    - [ ] Archivage des conversations
    - [ ] Recherche dans l'historique
    - [ ] Badge compteur messages non lus
    - [ ] Filtrage par classe pour les professeurs
    - [ ] Appels audio/vidéo instantanés depuis le chat

### 🖥️ PARTIE 3: DASHBOARDS UTILISATEURS

- [ ] **Dashboard Super-Admin Plateforme**
  - [ ] Liste toutes universités clientes
  - [ ] Analytics revenus
  - [ ] Gestion suspensions

- [ ] **Dashboard Admin Université**
  - [ ] Configuration filières
  - [ ] Validation inscriptions
  - [ ] Encaissement paiements
  - [ ] Édition relevés officiels
  - [ ] Clôture année

- [ ] **Dashboard Enseignant**
  - [ ] Vue classes/cours assignés
  - [ ] Saisie notes rapide
  - [ ] Publication devoirs
  - [ ] Dépôt ressources cours
  - [ ] Communication étudiants

- [ ] **Dashboard Étudiant**
  - [ ] Emploi du temps
  - [ ] Modules E-learning
  - [ ] Consultation notes/bulletins
  - [ ] Historique paiements
  - [ ] Export RGPD

- [ ] **Dashboard Parents**
  - [ ] Consultation notes enfant
  - [ ] Suivi absences
  - [ ] Alertes paiements
  - [ ] Communication admin

## 📂 Structure Firebase

```
/universities
  /$universityId
    /students
      /$studentId
        - parentEmails: ['parent@gmail.com']
        - parentPhones: ['+33612345678']
    /teachers
      - classes: ['class-1', 'class-2'] // Multi-classes
      - courses: ['math-101', 'phys-201']
    /courses
    /grades
    /payments
    /notifications
    /conversations // Messagerie
      /$conversationId
        - participants: ['teacher-uid', 'student-uid']
        - type: 'teacher-student' | 'teacher-parent' | 'director-teacher'
        - context: { studentId, className, parentId }
        - lastMessage: { text, timestamp, senderId }
        /messages
          /$messageId
            - senderId, text, timestamp, read, attachments
/users
  /$uid
    - universityId // null pour parents (multi-universités)
    - role
    - profile
    - classes: [] // Pour teachers
    
    // PARENTS (Multi-enfants / Multi-universités)
    - email: 'parent@gmail.com' OU '+33612345678@noemail.university-saas.com'
    - loginMethod: 'email' | 'phone'
    - phoneNumber: '+33612345678'
    - children: [
        {
          childId: 'student-abc123',
          universityId: 'univ-sorbonne-2026',
          childName: 'Sophie Leroux',
          relationship: 'père' | 'mère' | 'tuteur',
          addedBy: 'admin-uid',
          addedAt: timestamp
        }
      ]
    - mustChangePassword: true // Pour comptes créés par admin
```

## 🔐 Règles de Sécurité Firebase
À générer dans `database.rules.json` avec isolation stricte par `universityId`.

## 📊 État d'Avancement Actuel

### ✅ Fait
- [x] Initialisation projet React + Vite
- [x] Installation dépendances (Firebase, React Router, React Hook Form, Tailwind, Lucide)
- [x] Structure de base du projet
- [x] README.md complet créé
- [x] METHODOLOGY.md pour débutants créé (500+ lignes)
- [x] Système mémoire configuré
- [x] Module 9 (Cours vidéo live) ajouté au scope
- [x] **database.rules.json** créé (isolation multi-tenant stricte)
- [x] **firebase-schema.json** créé (structure complète 300+ lignes)
- [x] **PROMPTS.md** initialisé (3 prompts majeurs documentés)
- [x] Configuration Firebase (`src/config/firebase.js`)
- [x] `.env.example` créé
- [x] `.gitignore` mis à jour (protection credentials)
- [x] **FIREBASE_SETUP.md** créé (guide pas à pas)

### ✅ Phase 1 : Modélisation (COMPLÉTÉE) 
- [x] Configuration Firebase créée
- [x] database.rules.json déployé
- [x] firebase-schema.json validé
- [x] Premier super_admin créé
- [x] Connexion testée et validée

### ✅ PHASE 2 : Landing Page & Auth (COMPLÉTÉE)
- [x] **Landing Page Premium (VALIDÉE PAR UTILISATEUR)** ✨
  - [x] Hero Section avec animations
  - [x] 4 Stats cards
  - [x] Grille fonctionnalités (4 profils)
  - [x] Tableau tarifs (3 plans)
  - [x] Témoignages
  - [x] Footer structuré
  - [x] Navbar glass avec scroll effect
- [x] **Page de Connexion (FONCTIONNELLE)** ✅
  - [x] Firebase Auth avec validation
  - [x] Redirection automatique selon rôle
  - [x] Messages d'erreur en français
  - [x] Design cohérent avec Landing

### ✅ PHASE 3 : Dashboards (COMPLÉTÉE - 100%) 🎉
- [x] **Système d'authentification niveau PRODUCTION** ✅
  - [x] AuthContext centralisé (gestion globale de l'état auth)
  - [x] ProtectedRoute (protection par rôle, redirection automatique)
  - [x] PublicRoute (empêche accès login si connecté)
  - [x] Navbar dynamique Landing (boutons selon statut connexion)
  - [x] Déconnexion sécurisée avec cleanup
  - [x] Protection contre race conditions
- [x] **Dashboard Super Admin Plateforme** ✅ PRODUCTION-READY
  - [x] 4 Stats cards avec animations
  - [x] Tableau universités avec recherche/filtres
  - [x] Badges statut et plans
  - [x] Actions (Voir, Configurer)
  - [x] Auth via contexte
- [x] **Dashboard Admin Université** ✅ PRODUCTION-READY
  - [x] Stats université
  - [x] Inscriptions en attente
  - [x] Paiements en retard
  - [x] Actions rapides (créer étudiant, prof, cours)
  - [x] Auth via contexte
- [x] **Dashboard Enseignant** ✅ PRODUCTION-READY
  - [x] Stats (cours, étudiants, devoirs)
  - [x] Liste mes cours
  - [x] Saisie notes rapide
  - [x] Sessions live
  - [x] FAB "Créer session"
  - [x] Auth via contexte
- [x] **Dashboard Étudiant** ✅ PRODUCTION-READY
  - [x] Auth via contexte (refactorisé 2026-07-04 03:00)
  - [x] Realtime Database corrigé (2026-07-05 - bug Firestore résolu)
- [x] **Dashboard Parent** ✅ PRODUCTION-READY
  - [x] Auth via contexte (refactorisé 2026-07-04 03:00)
  - [x] Realtime Database corrigé (2026-07-05 - bug Firestore résolu)
- [x] **Règles Firebase sécurisées** - Déployées avec isolation stricte
- [x] **Comptes de test créés** - 4 comptes (admin, prof, étudiant, parent)

### ⏳ PHASE 4 : Modules Avancés (À VENIR)
- [ ] Tunnel d'onboarding université (5 étapes)
- [ ] Module cours vidéo live (Agora.io)
- [ ] Gestion complète des notes (calculs moyennes pondérées)
- [ ] Système de notifications en temps réel
- [ ] Module bibliothèque & E-learning
- [ ] Génération bulletins PDF automatiques

### ⏳ À Faire
- Tous les modules listés ci-dessus

## 📝 Notes de Développement
- **Approche**: 100% piloté par IA (pas de code manuel)
- **Méthodologie**: Itérative et modulaire
- **Phases**: 
  1. ✅ Modélisation données + règles sécurité
  2. ✅ Landing Page + Auth Production
  3. ✅ Dashboards + Système auth complet
  4. ⏳ Modules avancés (vidéo live, notifications, bulletins PDF)
  5. ⏳ Tests & Debug + Vidéo démo

## 📦 Livrables Finaux
1. ✅ Application SaaS fonctionnelle (70% complété)
2. ✅ database.rules.json (déployé et testé)
3. ⏳ PROMPTS.md (3/5 prompts documentés)
4. ⏳ Vidéo démo 3-5 min (Phase 5)
5. ✅ RAPPEL_SESSION.md (point de reprise détaillé)

## 🚀 Plans Tarifaires
- **Standard**: Limité en nombre d'étudiants
- **Premium**: Fonctionnalités avancées
- **Enterprise**: Sans limites + support dédié

---
**Dernière mise à jour**: 2026-07-05 15:30
**Status**: Phase 3 COMPLÉTÉE ✅ - JOUR 2 EN COURS (Système Parents Multi-enfants)
**Progression globale**: 70% complété
**Deadline projet**: 2026-07-12 (7 jours restants)
**Stratégie**: 5 modules 100% fonctionnels + 5 modules "En développement" bien présentés
**Voir**: 
- STRATEGIE_1_SEMAINE.md pour le planning détaillé
- PARENT_SYSTEM_SPEC.md pour l'architecture parents multi-enfants/multi-universités

## 🎯 Comptes de Test Disponibles

| Rôle | Email | Mot de passe | Status |
|------|-------|--------------|--------|
| Super Admin | Ton compte initial | Ton mot de passe | ✅ Fonctionnel |
| Admin Université | `admin@sorbonne.fr` | `Voir .env.local → TEST_ADMIN_PASSWORD` | ✅ Fonctionnel |
| Enseignant | `prof@sorbonne.fr` | `Voir .env.local → TEST_TEACHER_PASSWORD` | ✅ Fonctionnel |
| Étudiant | `etudiant@sorbonne.fr` | `Voir .env.local → TEST_STUDENT_PASSWORD` | ⚠️ En correction |
| Parent | `parent@sorbonne.fr` | `Voir .env.local → TEST_PARENT_PASSWORD` | ⚠️ En correction |

- [ ] **Module 11: Système de Rendez-vous Vidéo & Appels Multi-Participants** 🆕
  - [ ] **Prise de RDV Parent → Professeur**
    - [ ] Calendrier de disponibilités du professeur
    - [ ] Parent choisit date/heure + motif du RDV
    - [ ] Validation par le professeur (accepte/propose autre créneau)
    - [ ] Notifications 24h avant + 15 min avant
    - [ ] Bouton "Rejoindre l'appel vidéo" le jour J
  - [ ] **Appels Multi-Participants (jusqu'à 4 personnes)**
    - [ ] Parent 1 (mère) + Parent 2 (père) + Élève + Professeur
    - [ ] Le professeur peut inviter l'élève au call
    - [ ] Les 2 parents peuvent se connecter simultanément
    - [ ] Interface montrant les 4 vidéos en grille
    - [ ] Contrôles individuels (micro, caméra)
  - [ ] **Appels Directeur ↔ Professeur**
    - [ ] Appel instantané depuis la messagerie
    - [ ] RDV planifiés pour réunions administratives
    - [ ] Enregistrement optionnel (avec consentement)
  - [ ] **Gestion des RDV**
    - [ ] Historique des RDV passés
    - [ ] Annulation/Report (avec notification)
    - [ ] Notes post-RDV (privées pour le prof)
    - [ ] Durée configurable (15min, 30min, 1h)
    - [ ] Feedback optionnel après l'appel
  - [ ] **Technique**
    - [ ] Intégration Agora.io (même SDK que Module 9)
    - [ ] Appels 1-to-1 et multi-participants (max 4)
    - [ ] Qualité adaptative selon connexion
    - [ ] Test micro/caméra avant connexion
    - [ ] Chat textuel pendant l'appel (optionnel)
