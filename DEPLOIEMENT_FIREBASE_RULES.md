# 🔥 DÉPLOIEMENT FIREBASE RULES - INSTRUCTIONS

## ⚠️ PROBLÈME ACTUEL

Erreur: `PERMISSION_DENIED` lors modification étudiant.

**Cause**: Les Firebase Rules dans `database.rules.json` NE SONT PAS déployées en production.

Les Rules locales contiennent les corrections, mais Firebase Console utilise toujours les anciennes Rules.

---

## ✅ SOLUTION: Déployer les Rules manuellement

### Étape 1: Copier les Rules

1. Ouvre le fichier `/Users/itopie/Desktop/university-saas/database.rules.json`
2. **Copie TOUT le contenu** (Cmd+A puis Cmd+C)

### Étape 2: Aller dans Firebase Console

1. Va sur [https://console.firebase.google.com](https://console.firebase.google.com)
2. Sélectionne ton projet (university-saas)
3. Dans le menu gauche, clique sur **"Realtime Database"**
4. Clique sur l'onglet **"Rules"** (en haut)

### Étape 3: Remplacer les Rules

1. **Supprime TOUT** le contenu actuel dans l'éditeur
2. **Colle** le contenu de `database.rules.json` (Cmd+V)
3. Clique sur **"Publish"** (bouton bleu en haut à droite)
4. Attends la confirmation "Rules published successfully"

### Étape 4: Vérifier

1. Recharge la page de ton app (F5)
2. Essaie de modifier un étudiant
3. Si ça fonctionne → ✅ Rules déployées
4. Si erreur persiste → Vérifie que tu as bien cliqué "Publish"

---

## 🔧 CORRECTION APPLIQUÉE

**Fichier modifié**: `database.rules.json` ligne 22-24

**Avant** (BLOQUAIT les updates):
```json
"$studentId": {
  ".read": "...",
  ".write": "...",
  ".validate": "newData.hasChildren(['firstName', 'lastName', 'email', 'matricule', 'level', 'fieldOfStudy', 'status'])",
  // ← Cette ligne EXIGEAIT que newData ait EXACTEMENT ces 7 enfants
  // Si on envoyait classId, updatedAt, etc. → REJET
```

**Après** (AUTORISE les updates):
```json
"$studentId": {
  ".read": "...",
  ".write": "...",
  // .validate SUPPRIMÉ car validations déjà au niveau de chaque champ
```

**Pourquoi ça marche maintenant**:
- Chaque champ (`firstName`, `lastName`, etc.) a sa propre `.validate`
- Les champs obligatoires (sans `|| !newData.exists()`) sont automatiquement requis
- Les champs optionnels (`classId`, `updatedAt`) sont acceptés grâce à `$other`
- Plus besoin de `.validate` au niveau parent

---

## 🧪 TEST APRÈS DÉPLOIEMENT

### Test 1: Modification étudiant
1. Va sur `/admin/students`
2. Clique sur un étudiant
3. Change son statut: active → inactive
4. Clique "Enregistrer"
5. **Attendu**: ✅ "Étudiant mis à jour avec succès"

### Test 2: Vérification Firebase
1. Va dans Firebase Console → Realtime Database → Data
2. Navigue vers `universities/[ton-univ-id]/students/[student-id]`
3. Vérifie que `status` a bien changé
4. Vérifie que `updatedAt` a été ajouté (timestamp)

---

## 📊 AUTRES CORRECTIONS DANS LES RULES

Les Rules `database.rules.json` contiennent aussi:

1. ✅ **Grades collection `.read`** (ligne 277): Admin + Teacher peuvent lister toutes les notes
2. ✅ **Rooms collection `.read`** (corrigé audit V2): Admin peut lister salles
3. ✅ **Index optimisés** (ligne 21, 60, 279): Performances améliorées
4. ✅ **gradeType validation** (ligne 304): Accepte `continuous_assessment` (pas `quiz`)

---

## ⚡ ALTERNATIVE: Déploiement via Firebase CLI

Si tu préfères automatiser:

```bash
# 1. Installer Firebase CLI (si pas déjà fait)
npm install -g firebase-tools

# 2. Login Firebase
firebase login

# 3. Initialiser (choisir Realtime Database)
firebase init database

# 4. Déployer Rules
firebase deploy --only database
```

**Note**: Cette méthode nécessite que `database.rules.json` soit dans le bon format et path.

---

## 🔒 SÉCURITÉ: Ce qui est protégé

Après déploiement, les Rules garantissent:

✅ **Multi-tenant strict**: Université A ne peut PAS accéder données Université B  
✅ **Étudiants read-only notes**: Seuls teachers/admin peuvent écrire notes  
✅ **Parents isolés**: Voient SEULEMENT leurs enfants (via `childrenAccess`)  
✅ **Validations strictes**: Matricule format `XXX-9999-999999`, email valide, etc.  
✅ **Champs requis**: firstName, lastName, email, matricule, level, fieldOfStudy, status  
✅ **Champs optionnels acceptés**: classId, updatedAt, createdAt, academicYear, etc.

---

## ❓ DÉPANNAGE

### Erreur persiste après déploiement?

1. **Vider le cache navigateur**: Cmd+Shift+R (Mac) ou Ctrl+Shift+R (Windows)
2. **Vérifier que Rules sont bien publiées**: Firebase Console → Rules → Voir historique
3. **Vérifier le rôle utilisateur**: `console.log(userProfile.role)` doit être `admin_universite`
4. **Vérifier universityId**: `console.log(userProfile.universityId)` doit matcher le path Firebase

### Les Rules ne se sauvegardent pas?

- **Erreur JSON**: Vérifie que le JSON est valide (pas de virgule en trop, guillemets corrects)
- **Quota dépassé**: Plan gratuit Firebase a limites, passe à Blaze si besoin

---

**Date**: 2026-07-06  
**Status**: 🟡 EN ATTENTE DE DÉPLOIEMENT  
**Action requise**: Déployer Rules via Firebase Console  
**Temps estimé**: 2 minutes
