# 🚨 Workflow de Résolution de Bugs en Production

**Date de création:** 2026-07-18  
**Projet:** University SaaS Multi-Tenant  
**Environnement:** Production Vercel + Firebase

---

## 🎯 PRINCIPE FONDAMENTAL

**En production, chaque erreur suit un workflow strict :**

1. **ANALYSER** - Comprendre l'erreur complète
2. **DIAGNOSTIQUER** - Identifier la cause racine
3. **CORRIGER** - Appliquer le fix minimal
4. **DÉPLOYER** - Firebase Rules puis Vercel
5. **TESTER** - Valider le fix en production
6. **DOCUMENTER** - Commit détaillé + mémoire

**❌ JAMAIS** :
- Corriger sans comprendre la cause
- Modifier du code au hasard
- Déployer sans tester en local
- Commit sans message explicatif

---

## 📋 WORKFLOW DÉTAILLÉ

### ÉTAPE 1 : ANALYSE DE L'ERREUR (5 min)

#### 1.1 Capturer l'Erreur Complète

**Console Browser :**
```javascript
// Copier EXACTEMENT :
// - Stack trace complète
// - Message d'erreur
// - Fichier + ligne
// - Données envoyées (si visible)
```

**Exemple :**
```
Error: PERMISSION_DENIED: Permission denied
    at set(/universities/univ_xxx/classes/-Oxml...)
    firebase-Cjm1hL0-.js:4
```

#### 1.2 Identifier le Type d'Erreur

| Type | Indicateurs | Cause Probable |
|------|-------------|----------------|
| `PERMISSION_DENIED` | Firebase Rules | Règles trop strictes ou données invalides |
| `404 Not Found` | API call | Routing Vercel ou endpoint manquant |
| `CORS Error` | Fetch/Axios | Headers CORS manquants |
| `TypeError: undefined` | Code JS | État non initialisé ou prop manquante |
| `Build Failed` | Vercel logs | Dépendances ou syntaxe |

#### 1.3 Localiser le Contexte

```bash
# Identifier le fichier frontend concerné
grep -r "Error message keyword" src/

# Trouver l'appel Firebase
grep -r "set\|push\|update" src/pages/admin/
```

---

### ÉTAPE 2 : DIAGNOSTIC APPROFONDI (10 min)

#### 2.1 Firebase Rules → Frontend Data Mismatch

**TOUJOURS vérifier cette séquence :**

```bash
# 1. Lire les Firebase Rules actuelles
cat database.rules.json | grep -A 30 "collection_name"

# 2. Lire le code frontend qui écrit
cat src/pages/admin/XxxPage.jsx | grep -A 20 "const xxxData"

# 3. Comparer les champs
```

**Checklist de comparaison :**

```
Firebase Rules autorise :
[ ] id
[ ] name
[ ] field1
[ ] field2

Frontend envoie :
[ ] id
[ ] name
[ ] field1
[ ] field2
[ ] ❌ extraField (pas dans rules!)
```

#### 2.2 Validation des Règles

**Points à vérifier dans `database.rules.json` :**

1. **Lecture/Écriture :**
   ```json
   ".read": "auth != null && universityId === $universityId"
   ".write": "auth != null && role === 'admin_universite'"
   ```

2. **Validation des champs :**
   ```json
   "fieldName": {
     ".validate": "newData.isString() && newData.val().length > 0"
   }
   ```

3. **Règle `$other` :**
   ```json
   "$other": { ".validate": false }  // ❌ STRICT - rejette tout
   "$other": { ".validate": true }   // ✅ FLEXIBLE - accepte tout
   ```

#### 2.3 Tester en Local AVANT Production

```bash
# Si possible, reproduire en local
npm run dev

# Tester avec Firebase Emulator (si configuré)
firebase emulators:start
```

---

### ÉTAPE 3 : CORRECTION (15 min)

#### 3.1 Choisir la Stratégie

**Option A : Corriger Firebase Rules (PRÉFÉRÉ)**

✅ Quand : Les données frontend sont légitimes  
✅ Impact : Aucun changement de code nécessaire  
✅ Temps : 5 min + déploiement

**Option B : Corriger le Code Frontend**

⚠️ Quand : Les données envoyées sont inutiles  
⚠️ Impact : Rebuild + redéploiement Vercel  
⚠️ Temps : 15 min + déploiement

**Option C : Les Deux**

🔴 Quand : Problème de design  
🔴 Impact : Double déploiement  
🔴 Temps : 30 min+

#### 3.2 Corriger Firebase Rules

**Template de correction :**

```json
{
  "collection": {
    "$itemId": {
      // Champs obligatoires
      "requiredField": {
        ".validate": "newData.isString() && newData.val().length > 0"
      },
      
      // Champs optionnels
      "optionalField": {
        ".validate": "(newData.isString() && ...) || !newData.exists()"
      },
      
      // Objets imbriqués
      "nestedObject": {
        ".validate": "newData.hasChildren() || !newData.exists()",
        "subField": {
          ".validate": "(newData.isString()) || !newData.exists()"
        }
      },
      
      // Tableaux
      "arrayField": {
        ".validate": "newData.hasChildren() || !newData.exists()"
      },
      
      // Timestamps
      "createdAt": {
        ".validate": "(newData.isNumber() && newData.val() > 0) || !newData.exists()"
      },
      
      // UIDs
      "createdBy": {
        ".validate": "(newData.isString() && newData.val().length > 0) || !newData.exists()"
      },
      
      // Flexibilité pour futurs champs
      "$other": {
        ".validate": true  // ✅ Recommandé en production
      }
    }
  }
}
```

**Règles de Validation Courantes :**

```json
// String non vide
"newData.isString() && newData.val().length > 0"

// String avec limite
"newData.isString() && newData.val().length >= 0 && newData.val().length <= 500"

// Number positif
"newData.isNumber() && newData.val() > 0"

// Number dans range
"newData.isNumber() && newData.val() >= 0 && newData.val() <= 100"

// Enum (whitelist)
"newData.isString() && newData.val().matches(/^(value1|value2|value3)$/)"

// Email
"newData.isString() && newData.val().matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/)"

// Boolean
"newData.isBoolean()"

// Timestamp (pas dans le futur)
"newData.isNumber() && newData.val() > 0 && newData.val() <= now"

// Objet non vide
"newData.hasChildren()"

// Optionnel (accepte absence)
"(VALIDATION_HERE) || !newData.exists()"
```

#### 3.3 Tester la Syntaxe

```bash
# Valider la syntaxe JSON
cat database.rules.json | python -m json.tool > /dev/null

# Ou utiliser Firebase CLI
firebase deploy --only database --dry-run
```

---

### ÉTAPE 4 : DÉPLOIEMENT (5 min)

#### 4.1 Déployer Firebase Rules

```bash
# Déploiement production
firebase deploy --only database --project university-saas-7b31e

# Vérifier le résultat
# ✔ database: rules for database xxx released successfully
```

**⚠️ ATTENTION :** Firebase Rules prend effet **immédiatement** en production.

#### 4.2 Commit avec Message Détaillé

**Template de commit :**

```bash
git add database.rules.json  # (ou autre fichier)

git commit -m "$(cat <<'EOF'
🔧 Fix: [TYPE] - [COMPOSANT]

## Problem
[Description courte de l'erreur vue par l'utilisateur]

## Root Cause
[Cause technique identifiée]

## Solution
[Ce qui a été changé]

## Impact
✅ [Fonctionnalité] maintenant opérationnelle
✅ [Autre impact positif]
✅ Backward compatible

## Testing
- [ ] Testé en production
- [ ] Validé par utilisateur

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

**Exemples de types :**
- `🔧 Fix:` - Correction de bug
- `🔥 Hotfix:` - Correction critique urgente
- `🐛 Debug:` - Fix de bug mineur
- `🔒 Security:` - Correction sécurité

#### 4.3 Push et Redéploiement

```bash
# Push vers GitHub
git push origin preproduction

# Vercel déploie automatiquement (2-3 min)
# Surveiller : https://vercel.com/moulayel-ab-s-projects/university-saas
```

---

### ÉTAPE 5 : VALIDATION (5 min)

#### 5.1 Attendre Propagation

**Délais typiques :**
- Firebase Rules : **Immédiat**
- Vercel CDN : **1-2 minutes**
- Cache navigateur : **Vider le cache** (Ctrl+Shift+R)

#### 5.2 Tester en Production

**Checklist de test :**

```bash
# 1. Vérifier que l'app charge
curl -I https://university-saas.vercel.app
# → 200 OK

# 2. Se connecter comme admin
# Email: newadmin@sorbonne.fr
# Password: Admin123456

# 3. Reproduire l'action qui causait l'erreur
# - Créer l'élément concerné
# - Vérifier qu'aucune erreur console
# - Vérifier que les données sont enregistrées

# 4. Vérifier dans Firebase Console
# https://console.firebase.google.com/project/university-saas-7b31e/database
# → Les données doivent être présentes
```

#### 5.3 Monitoring Post-Fix

**Vérifier pendant 30 minutes :**

1. **Erreurs Console** - Aucune nouvelle erreur
2. **Firebase Usage** - Pas de spike anormal
3. **Vercel Logs** - Pas d'erreur 500
4. **Feedback Utilisateur** - Confirmation que ça marche

---

### ÉTAPE 6 : DOCUMENTATION (5 min)

#### 6.1 Mettre à Jour la Mémoire

**Sauvegarder dans `.claude/memory/` :**

```bash
# Si bug récurrent ou leçon importante
echo "Bug: [Description]
Cause: [Cause]
Solution: [Solution]
Date: $(date +%Y-%m-%d)" >> .claude/memory/bugs_resolus.md
```

#### 6.2 Documenter dans le Projet

**Fichiers à mettre à jour :**

```bash
# CHANGELOG.md (si existe)
echo "## [Date] - Fix: [Titre]
- Fixed: [Description]
- Affected: [Composant]
" >> CHANGELOG.md

# README.md (si changement d'usage)
# Ajouter note dans section "Known Issues" si applicable
```

#### 6.3 Partager avec l'Équipe

**Si projet collaboratif :**

1. **Slack/Discord** - Notification du fix
2. **GitHub Issue** - Fermer l'issue associée
3. **Documentation** - Mettre à jour la doc technique

---

## 🎓 CAS D'USAGE TYPES

### CAS 1 : Permission Denied (Firebase Rules)

**Symptôme :**
```
Error: PERMISSION_DENIED: Permission denied
```

**Workflow :**
1. Grep le champ dans `database.rules.json`
2. Lire le code frontend qui écrit
3. Ajouter validation pour champs manquants
4. `firebase deploy --only database`
5. Tester immédiatement

**Temps total :** 15 minutes

---

### CAS 2 : 404 API Not Found (Vercel Routing)

**Symptôme :**
```
GET /api/some/endpoint 404 Not Found
```

**Workflow :**
1. Vérifier `vercel.json` rewrites
2. Vérifier que le fichier `/api/some/endpoint.js` existe
3. Corriger routing ou créer endpoint
4. Push → Vercel redéploie
5. Tester après 2-3 min

**Temps total :** 20 minutes

---

### CAS 3 : CORS Error (Headers)

**Symptôme :**
```
Access to fetch at 'https://university-saas.vercel.app/api/...' 
has been blocked by CORS policy
```

**Workflow :**
1. Vérifier `ALLOWED_ORIGINS` dans Vercel env vars
2. Vérifier headers dans serverless function
3. Vérifier `vercel.json` headers section
4. Corriger + redéployer
5. Vider cache navigateur + tester

**Temps total :** 15 minutes

---

### CAS 4 : Build Failed (Vercel)

**Symptôme :**
```
Error: Build failed
```

**Workflow :**
1. Consulter Vercel deployment logs
2. Identifier l'erreur (syntax, dependency, etc.)
3. Corriger en local + tester `npm run build`
4. Push → Vercel rebuild
5. Surveiller logs

**Temps total :** 20-30 minutes

---

## ⚠️ ERREURS À ÉVITER

### ❌ Erreur 1 : Corriger Sans Comprendre

**Mauvais :**
```bash
# "Ça marche pas, je mets $other: true partout"
"$other": { ".validate": true }  # Partout sans réfléchir
```

**Bon :**
```bash
# 1. Comprendre quels champs sont rejetés
# 2. Ajouter validation spécifique
# 3. $other: true seulement si justifié
```

---

### ❌ Erreur 2 : Déployer Sans Tester

**Mauvais :**
```bash
# Correction → Push immédiat
git commit -am "fix" && git push
```

**Bon :**
```bash
# 1. Corriger
# 2. Tester en local si possible
# 3. Vérifier syntaxe
# 4. Commit + Push
# 5. Surveiller déploiement
```

---

### ❌ Erreur 3 : Ignorer le Rollback

**Si le fix casse autre chose :**

```bash
# Rollback Firebase Rules
firebase deploy --only database  # (avec version précédente)

# Rollback Vercel
git revert HEAD
git push origin preproduction
```

---

## 📊 MÉTRIQUES DE SUCCÈS

**Un bon fix de production respecte :**

- ⏱️ **Temps de résolution** : < 30 minutes
- 🎯 **Précision** : Fix la cause racine (pas un workaround)
- 🔒 **Sécurité** : Ne relâche pas les règles de sécurité
- 📝 **Documentation** : Commit message complet
- ✅ **Validation** : Testé en production
- 🔄 **Réversible** : Peut être rollback facilement

---

## 🚀 CHECKLIST RAPIDE

```
Étape 1 : ANALYSE
[ ] Copier erreur complète (stack trace)
[ ] Identifier type d'erreur
[ ] Localiser fichier frontend concerné

Étape 2 : DIAGNOSTIC
[ ] Lire Firebase Rules actuelles
[ ] Lire code frontend qui écrit
[ ] Comparer champs autorisés vs envoyés
[ ] Identifier le champ/règle problématique

Étape 3 : CORRECTION
[ ] Choisir stratégie (Rules vs Code)
[ ] Appliquer correction minimale
[ ] Vérifier syntaxe JSON/JS

Étape 4 : DÉPLOIEMENT
[ ] firebase deploy --only database (si Rules)
[ ] Commit avec message détaillé
[ ] git push origin preproduction
[ ] Attendre Vercel CI/CD (2-3 min)

Étape 5 : VALIDATION
[ ] Vider cache navigateur
[ ] Se connecter comme admin
[ ] Reproduire action qui causait l'erreur
[ ] Vérifier données dans Firebase Console
[ ] Surveiller logs pendant 30 min

Étape 6 : DOCUMENTATION
[ ] Sauvegarder leçon dans mémoire
[ ] Mettre à jour CHANGELOG (si applicable)
[ ] Partager avec équipe (si applicable)
```

---

## 📞 CONTACTS & RESSOURCES

**Firebase Console :**  
https://console.firebase.google.com/project/university-saas-7b31e

**Vercel Dashboard :**  
https://vercel.com/moulayel-ab-s-projects/university-saas

**Documentation Firebase Rules :**  
https://firebase.google.com/docs/database/security

**Documentation Vercel Deployment :**  
https://vercel.com/docs/deployments/overview

---

**Dernière mise à jour :** 2026-07-18  
**Auteur :** Claude Sonnet 4.5 (Senior DevOps Engineer)  
**Status :** ✅ Production-Ready Workflow
