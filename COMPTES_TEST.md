# 🔐 COMPTES DE TEST - ENVIRONNEMENT DE DÉVELOPPEMENT

> **⚠️ IMPORTANT** : Ce fichier est pour référence uniquement.  
> Les mots de passe réels sont stockés dans `.env.local` (non versionné).

---

## 📋 Liste Complète des Comptes de Test

### 🔴 Super Admin Plateforme

| Champ | Valeur |
|-------|--------|
| **Email** | Défini lors de l'étape 1.8 (ton compte initial) |
| **Mot de passe** | Défini lors de l'étape 1.8 |
| **Rôle** | `super_admin_plateforme` |
| **UniversityId** | `null` (accès à toutes les universités) |
| **Dashboard** | `/dashboard/super-admin` |
| **Permissions** | Accès total à la plateforme |
| **Créé** | Manuellement lors de la configuration Firebase |

---

### 🔵 Admin Université (Sorbonne)

| Champ | Valeur |
|-------|--------|
| **Email** | `admin@sorbonne.fr` |
| **Mot de passe** | Voir `.env.local` → `TEST_ADMIN_PASSWORD` |
| **Rôle** | `admin_universite` |
| **UniversityId** | `univ-sorbonne-2026` |
| **Dashboard** | `/dashboard/admin` |
| **Nom complet** | Marie Dubois |
| **Permissions** | Gestion complète de l'université Sorbonne |
| **Créé** | Script `npm run create-accounts` |

**Fonctionnalités accessibles :**
- Validation des inscriptions
- Gestion des paiements
- Création étudiants/enseignants/cours
- Statistiques de l'université
- Clôture année académique

---

### 🟢 Enseignant (Sorbonne)

| Champ | Valeur |
|-------|--------|
| **Email** | `prof@sorbonne.fr` |
| **Mot de passe** | Voir `.env.local` → `TEST_TEACHER_PASSWORD` |
| **Rôle** | `teacher` |
| **UniversityId** | `univ-sorbonne-2026` |
| **Dashboard** | `/dashboard/teacher` |
| **Nom complet** | Jean Martin |
| **Spécialisations** | Mathématiques, Physique |
| **Cours assignés** | `math-101`, `phys-201` |
| **Créé** | Script `npm run create-accounts` |

**Fonctionnalités accessibles :**
- Consultation de mes cours
- Saisie des notes (devoirs, examens, projets)
- Création sessions live vidéo
- Publication ressources pédagogiques
- Communication avec étudiants

---

### 🟣 Étudiant (Sorbonne)

| Champ | Valeur |
|-------|--------|
| **Email** | `etudiant@sorbonne.fr` |
| **Mot de passe** | Voir `.env.local` → `TEST_STUDENT_PASSWORD` |
| **Rôle** | `student` |
| **UniversityId** | `univ-sorbonne-2026` |
| **Dashboard** | `/dashboard/student` |
| **Nom complet** | Sophie Leroux |
| **Matricule** | `2026-SB-0001` |
| **Niveau** | L1 (Licence 1) |
| **Filière** | Informatique |
| **Créé** | Script `npm run create-accounts` |

**Données de démo générées :**
- **Notes** : 
  - Maths (MATH101) : Moyenne 15.2/20 (2 devoirs, 1 examen, 1 projet)
  - Physique (PHYS201) : Moyenne 12.3/20 (1 TP, 1 contrôle)
- **Paiements** :
  - Frais totaux : 3000€
  - Payé : 1500€ (2 tranches)
  - Reste : 1500€ (1 tranche à venir)

**Fonctionnalités accessibles :**
- Consultation notes et bulletins
- Visionnage cours vidéo enregistrés
- Accès bibliothèque numérique
- Suivi paiements
- Export données RGPD

---

### 🟠 Parent (Sorbonne)

| Champ | Valeur |
|-------|--------|
| **Email** | `parent@sorbonne.fr` |
| **Mot de passe** | Voir `.env.local` → `TEST_PARENT_PASSWORD` |
| **Rôle** | `parent` |
| **UniversityId** | `univ-sorbonne-2026` |
| **Dashboard** | `/dashboard/parent` |
| **Nom complet** | Pierre Leroux |
| **Enfant(s)** | Sophie Leroux (`etudiant@sorbonne.fr`) |
| **Créé** | Script `npm run create-accounts` |

**Fonctionnalités accessibles :**
- Suivi notes de l'enfant par matière
- Consultation absences
- Historique paiements avec échéances
- Messagerie avec administration

---

## 🔧 Configuration des Mots de Passe

Les mots de passe de test sont définis dans `.env.local` (non versionné) :

```bash
# Comptes de test (développement uniquement)
TEST_ADMIN_PASSWORD=Voir .env.local → TEST_ADMIN_PASSWORD
TEST_TEACHER_PASSWORD=Voir .env.local → TEST_TEACHER_PASSWORD
TEST_STUDENT_PASSWORD=Voir .env.local → TEST_STUDENT_PASSWORD
TEST_PARENT_PASSWORD=Voir .env.local → TEST_PARENT_PASSWORD
```

**⚠️ IMPORTANT :**
- Ces mots de passe sont UNIQUEMENT pour l'environnement de développement
- NE JAMAIS utiliser ces mots de passe en production
- `.env.local` est dans `.gitignore` et ne sera jamais versionné

---

## 🚀 Utilisation

### Connexion rapide

1. Ouvre http://localhost:5173/login
2. Choisis un compte de test selon le rôle à tester
3. Utilise les identifiants ci-dessus

### Création de nouveaux comptes de test

```bash
npm run create-accounts
```

Ce script crée automatiquement tous les comptes listés ci-dessus avec données de démo.

### Réinitialiser les comptes de test

1. Supprimer les comptes dans Firebase Console → Authentication
2. Supprimer les données dans Realtime Database
3. Relancer `npm run create-accounts`

---

## 📊 Matrice des Permissions

| Fonctionnalité | Super Admin | Admin Univ | Enseignant | Étudiant | Parent |
|----------------|-------------|------------|------------|----------|--------|
| Voir toutes les universités | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gérer son université | ✅ | ✅ | ❌ | ❌ | ❌ |
| Créer étudiants/profs | ✅ | ✅ | ❌ | ❌ | ❌ |
| Saisir notes | ✅ | ✅ | ✅ | ❌ | ❌ |
| Consulter ses notes | ✅ | ✅ | ✅ | ✅ | ❌ |
| Consulter notes enfant | ✅ | ✅ | ❌ | ❌ | ✅ |
| Gérer paiements | ✅ | ✅ | ❌ | ❌ | ❌ |
| Voir paiements | ✅ | ✅ | ❌ | ✅ | ✅ |
| Sessions live (créer) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Sessions live (rejoindre) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Export RGPD | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🔒 Sécurité en Production

**AVANT DE DÉPLOYER EN PRODUCTION :**

1. ✅ Supprimer TOUS les comptes de test de Firebase
2. ✅ Changer TOUS les mots de passe par défaut
3. ✅ Supprimer les variables `TEST_*_PASSWORD` de `.env.production`
4. ✅ Activer l'authentification forte (2FA)
5. ✅ Configurer les règles de mot de passe complexe
6. ✅ Activer les logs d'audit Firebase

**Ce fichier COMPTES_TEST.md doit rester dans le dépôt mais avec les mots de passe masqués.**

---

**Dernière mise à jour** : 2026-07-04 00:25  
**Environnement** : Développement uniquement  
**Status** : 5 comptes actifs (1 super admin + 4 comptes test automatiques)
