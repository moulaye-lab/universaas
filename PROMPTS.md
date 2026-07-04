# 📝 PROMPTS.md - Journal des Prompts Majeurs

## Vue d'ensemble
Ce document recense les prompts les plus complexes et structurants utilisés pour développer ce SaaS universitaire. Chaque prompt est documenté avec son contexte, son objectif et son résultat.

---

## 🔐 PROMPT #1 : Génération des Règles de Sécurité Multi-Tenant Firebase

### Contexte
Premier prompt critique du projet. Il fallait générer les règles de sécurité Firebase qui assurent une isolation stricte entre les universités (tenants) tout en permettant un RBAC granulaire à 5 niveaux de rôles.

### Prompt Utilisé
```
Génère un fichier database.rules.json complet pour Firebase Realtime Database avec les contraintes suivantes:

1. ISOLATION MULTI-TENANT STRICTE:
   - Chaque université identifiée par $universityId doit être totalement isolée
   - Un utilisateur ne peut accéder QUE aux données de son université (vérification via users/$uid/universityId)
   - Exception unique: le rôle super_admin_plateforme peut tout voir

2. RBAC À 5 RÔLES:
   - super_admin_plateforme: accès total à toutes les universités + données /platform
   - admin_universite: lecture/écriture complète dans son université
   - teacher: lecture universelle dans son université, écriture limitée à grades et courses
   - student: lecture de ses propres données (grades, payments) + lecture générale des courses
   - parent: lecture des données de son enfant (grades, payments, notifications)

3. COLLECTIONS À SÉCURISER:
   /universities/$universityId/
     - info (lecture: tous, écriture: admin uniquement)
     - students (lecture: tous de l'université, écriture: admin)
     - teachers (lecture: tous de l'université, écriture: admin)
     - courses (lecture: tous, écriture: admin + teachers)
     - grades/$studentId (lecture: étudiant concerné + profs + parents, écriture: profs + admin)
     - payments/$studentId (lecture: étudiant + admin + parents, écriture: admin uniquement)
     - liveSessions (lecture: tous, écriture: teachers + admin)
     - notifications (lecture: tous, écriture: admin + teachers)
     - library (lecture: tous, écriture: teachers + admin)
     - audit (lecture: admin uniquement, écriture: tous pour logging)

4. COLLECTIONS GLOBALES:
   /users/$uid (lecture: propriétaire uniquement, écriture: propriétaire + admins)
   /platform (lecture/écriture: super_admin_plateforme uniquement)

Utilise la syntaxe Firebase Realtime Database Rules avec root.child() pour les vérifications.
```

### Résultat
✅ Fichier `database.rules.json` créé avec isolation étanche validée
✅ Règles testables via Firebase Emulator
✅ Protection contre les fuites de données inter-universités garantie au niveau base de données

### Leçons Apprises
- Firebase Rules est le premier rempart de sécurité (jamais se fier uniquement au code frontend)
- L'utilisation de `root.child('users').child(auth.uid).child('universityId').val()` permet de valider l'appartenance à un tenant
- Importance de documenter chaque règle pour faciliter les audits de sécurité

---

## 📊 PROMPT #2 : Génération du Schéma de Données JSON Complet

### Contexte
Création d'un schéma de données exhaustif et production-ready pour une application SaaS universitaire avec 9 modules métier + module vidéo live. Le schéma devait être auto-documenté et servir de référence unique pour tout le développement.

### Prompt Utilisé
```
Crée un fichier firebase-schema.json ultra-détaillé qui documente l'intégralité de la structure de données Firebase Realtime Database pour un SaaS universitaire multi-tenant.

STRUCTURE REQUISE:
1. Format JSON avec description, version, lastUpdated
2. Pour chaque nœud de données, spécifier:
   - type (object, string, number, array, enum, timestamp)
   - description claire
   - properties avec types détaillés
   - exemples de valeurs
   - contraintes (nullable, required, enum values)

MODULES À COUVRIR (9 modules métier):
- Module 1: Gestion étudiants (matricule auto, statuts, parcours historique)
- Module 2: Gestion enseignants (compétences, affectations, charges horaires)
- Module 3: Gestion cours (catalogue, ECTS, coefficients, syllabus)
- Module 4: Notes & évaluations (types: devoirs, examens, projets, calculs moyennes pondérées)
- Module 5: Inscriptions (pièces justificatives, validation admin)
- Module 6: Gestion financière (frais scolarité, échéances, tranches, reçus)
- Module 7: Bibliothèque & E-learning (ressources PDF/vidéo, emprunts, progression)
- Module 8: Notifications (annonces, alertes financières, résultats)
- Module 9: Cours vidéo live (Agora.io, invitations, enregistrements, chat, participants)

COLLECTIONS PRINCIPALES:
/universities/$universityId/
  - info (données université, abonnement, limites)
  - students (profils complets avec documents)
  - teachers (profils, spécialisations)
  - courses (programme académique complet)
  - grades (structure complexe par étudiant/cours avec types d'évaluations)
  - payments (gestion financière avec installments)
  - liveSessions (cours vidéo en direct - intégration Agora.io)
  - notifications (système de notifications ciblées)
  - library (ressources pédagogiques)
  - audit (logs RGPD-compliant)
  - fieldsOfStudy (filières avec configuration complète)

/users/$uid (profils utilisateurs multi-rôles)
/platform (données SaaS global: subscriptions, analytics, pricingPlans)

EXIGENCES QUALITÉ:
- Nommage cohérent (camelCase)
- Timestamps en millisecondes
- Status/enums clairement définis
- Relations entre collections documentées (foreign keys simulées)
- Prêt pour la production
```

### Résultat
✅ Fichier `firebase-schema.json` de 300+ lignes créé
✅ Structure complète des 9 modules documentée
✅ Types, enums et contraintes explicites pour chaque champ
✅ Référence unique pour toute l'équipe de développement

### Leçons Apprises
- Un schéma bien documenté = 50% du travail de dev en moins (plus de débats sur la structure)
- Firebase NoSQL nécessite une réflexion approfondie sur les relations (pas de JOINs)
- Documenter les enums évite les bugs de typos ('actif' vs 'active')

---

## 🎓 PROMPT #3 : Création du Guide Méthodologique pour Débutant

### Contexte
Projet de fin d'études : l'utilisateur doit comprendre PROFONDÉMENT chaque aspect technique pour défendre son projet devant un jury. Besoin d'un guide exhaustif expliquant l'architecture, les concepts clés (multi-tenancy, RBAC, WebRTC) avec pédagogie et exemples concrets.

### Prompt Utilisé
```
Crée un fichier METHODOLOGY.md complet (format Markdown) qui explique à un étudiant débutant en développement web TOUS les aspects techniques de ce projet SaaS universitaire.

STRUCTURE DU DOCUMENT:
1. Vue d'ensemble du projet (qu'est-ce qu'un SaaS ?)
2. Architecture technique expliquée (chaque techno avec analogies simples)
3. Concepts clés détaillés:
   - Multi-tenancy (analogie de l'immeuble)
   - RBAC avec les 5 rôles (qui peut faire quoi ?)
   - WebRTC et cours vidéo live (comment ça marche sous le capot ?)
4. Structure Firebase avec exemples de données réelles
5. Flux de données typiques avec code commenté (ex: prof publie note, étudiant reçoit notification)
6. Phases de développement avec timeline
7. Conseils pour réussir la soutenance

STYLE REQUIS:
- Pédagogique (comme un cours de fac)
- Exemples de code commentés ligne par ligne
- Analogies du quotidien (Netflix, Google Meet, appartements)
- Français simple, pas de jargon non expliqué
- Formatage Markdown avec émojis pour clarté visuelle
- Inclure des schémas ASCII art si utile

SECTIONS CRITIQUES:
- Expliquer "Pourquoi Firebase et pas MySQL ?" (temps réel, scalabilité)
- Expliquer "Comment fonctionne l'isolation multi-tenant ?" (avec exemples de règles)
- Expliquer "Agora.io vs construire son propre système WebRTC" (complexité vs time-to-market)
- Section "OUI C'EST FAISABLE" qui rassure et motive

BONUS:
- Ajouter une section "Points qui impressionnent les jurys"
- Section "Workflow de communication" expliquant comment je travaille en mode expert
```

### Résultat
✅ METHODOLOGY.md de 500+ lignes créé
✅ Tous les concepts techniques expliqués avec pédagogie
✅ Exemples de code commentés pour chaque flux
✅ Section motivation "Oui c'est faisable" avec arguments solides

### Leçons Apprises
- La documentation pédagogique est aussi importante que le code dans un projet académique
- Expliquer le "pourquoi" (choix techniques) est plus valorisé que le "comment" par les jurys
- Les analogies du quotidien (immeuble, Netflix) facilitent la compréhension de concepts complexes

---

## 🚀 PROMPT #4 : [À COMPLÉTER - Landing Page]

### Contexte
(Ce prompt sera rempli lors de la Phase 2)

### Prompt Utilisé
```
[À documenter lors de la création de la Landing Page]
```

### Résultat
⏳ En attente

---

## 🔧 PROMPT #5 : [À COMPLÉTER - Dashboard Admin]

### Contexte
(Ce prompt sera rempli lors de la Phase 3)

### Prompt Utilisé
```
[À documenter lors de la création du premier dashboard]
```

### Résultat
⏳ En attente

---

## 📌 Instructions d'Utilisation de ce Document

1. **Mise à jour continue** : Ajouter un nouveau prompt dès qu'une tâche complexe est résolue
2. **Critères de documentation** : 
   - Prompt > 100 mots
   - Tâche structurante (architecture, sécurité, module majeur)
   - Prompt réutilisable sur d'autres projets
3. **Format standard** : Contexte → Prompt → Résultat → Leçons Apprises
4. **Objectif final** : Minimum 5 prompts documentés pour le livrable du projet

---

**Dernière mise à jour** : 2026-07-03  
**Prompts documentés** : 3/5 minimum requis  
**Phase actuelle** : Phase 1 - Modélisation (en cours)
