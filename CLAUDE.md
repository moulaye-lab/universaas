# 📖 Instructions pour Claude Code

Ce fichier contient les instructions et workflows que Claude doit **toujours suivre** sur ce projet.

---

## 🎯 CONTEXTE DU PROJET

**Nom :** University SaaS - Plateforme Multi-Tenant de Gestion Universitaire  
**Status :** ✅ **EN PRODUCTION** sur Vercel  
**URL Production :** https://university-saas.vercel.app  
**Firebase Project :** `university-saas-7b31e`

**Architecture :**
- Frontend : React 19.2 + Vite 8.1 + TailwindCSS
- Backend : Firebase Realtime Database + Firebase Auth
- Serverless : Vercel Functions (`/api/*`)
- Sécurité : Firebase Rules (9.8/10) avec isolation multi-tenant stricte

**⚠️ ATTENTION : Application en production avec utilisateurs réels**

---

## 🚨 WORKFLOW OBLIGATOIRE POUR LES BUGS PRODUCTION

**Quand un utilisateur signale une erreur en production, TOUJOURS suivre :**

📖 **Voir le workflow complet :** `WORKFLOW_PRODUCTION_BUGS.md`

### Checklist Rapide (30 min max)

```
1. ANALYSE (5 min)
   [ ] Copier erreur complète
   [ ] Identifier type (PERMISSION_DENIED, 404, CORS, etc.)
   [ ] Localiser fichier frontend

2. DIAGNOSTIC (10 min)
   [ ] Lire Firebase Rules concernées
   [ ] Lire code frontend qui écrit
   [ ] Comparer champs envoyés vs autorisés

3. CORRECTION (15 min)
   [ ] Corriger Firebase Rules (préféré) OU code
   [ ] Vérifier syntaxe JSON
   [ ] Tester en local si possible

4. DÉPLOIEMENT (5 min)
   [ ] firebase deploy --only database
   [ ] git commit -m "🔧 Fix: [Détail]"
   [ ] git push origin preproduction
   [ ] Attendre Vercel CI/CD (2-3 min)

5. VALIDATION (5 min)
   [ ] Tester en production
   [ ] Vérifier Firebase Console
   [ ] Surveiller logs 30 min

6. DOCUMENTATION (5 min)
   [ ] Sauvegarder dans mémoire
   [ ] Mettre à jour CHANGELOG (si applicable)
```

---

## 🔒 MÉTHODOLOGIE DE CODE (OBLIGATOIRE)

📖 **Voir la méthodologie complète :** `.claude/memory/coding_methodology.md`

### Processus en 3 Étapes

**AVANT toute modification de code :**

#### ✅ ÉTAPE 1 : LIRE L'EXISTANT

```bash
# 1. Demander les fichiers concernés
Read: src/pages/admin/XxxPage.jsx
Read: database.rules.json (si Firebase)

# 2. Identifier patterns existants
# 3. Chercher doublons potentiels
# 4. Comprendre la structure de données
```

**❌ INTERDIT :**
- Supposer qu'une variable existe
- Deviner le nom d'un champ Firebase
- Ignorer le code existant

---

#### ✅ ÉTAPE 2 : PLANIFIER & VALIDER

```markdown
## Plan de Modification

**Fichier** : src/pages/admin/XxxPage.jsx

**Ce qui va changer** :
- Ajouter fonction `handleXxx` (lignes ~150)
- Importer `runTransaction` de Firebase

**Ce qui reste inchangé** :
- Fonction `handleYyy` existante
- Structure de données xxx

**Impact multi-tenant** :
- Chemin : universities/{univId}/xxx/{id}
- Isolation préservée ✅

**Attends validation avant code**
```

**❌ INTERDIT :**
- Écrire du code sans plan validé
- Faire des modifications "en passant"
- Changer plusieurs choses à la fois sans prévenir

---

#### ✅ ÉTAPE 3 : IMPLÉMENTER RIGOUREUSEMENT

**Règles :**
- ❌ Ne JAMAIS réécrire un fichier entier
- ✅ Utiliser `Edit()` pour remplacements précis (10-50 lignes max)
- ✅ Respecter les patterns existants
- ✅ Transactions atomiques OBLIGATOIRES pour compteurs
- ✅ En cas de doute → POSER UNE QUESTION

**❌ INTERDICTIONS ABSOLUES :**
- Réécrire fichier entier si modification partielle
- Dupliquer code existant
- Ignorer transactions atomiques
- Console.log en production (sauf console.error)
- Deviner noms de variables/champs

---

## 🔥 FIREBASE RULES - RÈGLES DE SÉCURITÉ

### Isolation Multi-Tenant (CRITIQUE)

**TOUTES les collections doivent avoir :**

```json
{
  "universities": {
    "$universityId": {
      ".read": "auth != null && root.child('users').child(auth.uid).child('universityId').val() === $universityId",
      ".write": "auth != null && root.child('users').child(auth.uid).child('universityId').val() === $universityId"
    }
  }
}
```

**Garantie :** Aucun utilisateur ne peut accéder aux données d'une autre université.

### Pattern de Validation

**Template standard pour nouvelle collection :**

```json
"collection": {
  ".read": "auth != null && universityId === $universityId",
  ".write": "auth != null && (role === 'admin_universite' || role === 'super_admin_plateforme')",
  ".indexOn": ["field1", "field2"],
  
  "$itemId": {
    "requiredField": {
      ".validate": "newData.isString() && newData.val().length > 0"
    },
    "optionalField": {
      ".validate": "(newData.isString()...) || !newData.exists()"
    },
    "$other": {
      ".validate": true  // ✅ Flexible en production
    }
  }
}
```

### Déploiement Firebase Rules

```bash
# TOUJOURS tester la syntaxe avant déploiement
cat database.rules.json | python -m json.tool > /dev/null

# Déployer en production
firebase deploy --only database --project university-saas-7b31e

# Vérifier le résultat immédiatement
# ✔ rules for database xxx released successfully
```

---

## 🚀 DÉPLOIEMENT VERCEL

### Variables d'Environnement Critiques

**13 variables configurées en production :**

| Variable | Usage |
|----------|-------|
| `FIREBASE_PROJECT_ID` | Serverless Firebase Admin |
| `FIREBASE_CLIENT_EMAIL` | Serverless Firebase Admin |
| `FIREBASE_DATABASE_URL` | Serverless Firebase Admin |
| `FIREBASE_PRIVATE_KEY` | Serverless Firebase Admin (avec `\n` littéraux) |
| `ALLOWED_ORIGINS` | CORS production |
| `ANTHROPIC_API_KEY` | Assistant IA Claude |
| `VITE_FIREBASE_*` | Frontend Firebase (7 variables) |

**⚠️ Ne JAMAIS modifier ces variables sans raison.**

### Processus de Déploiement

```bash
# 1. Commit changes
git add .
git commit -m "feat/fix: Description"

# 2. Push to GitHub
git push origin preproduction

# 3. Vercel déploie automatiquement (2-3 min)
# Surveiller : https://vercel.com/moulayel-ab-s-projects/university-saas

# 4. Tester en production
curl https://university-saas.vercel.app/api/health
```

---

## 📝 CONVENTIONS DE COMMIT

**Format standard :**

```
<emoji> <type>: <description courte>

## Problem (si fix)
[Description de l'erreur]

## Solution
[Ce qui a été changé]

## Impact
✅ [Fonctionnalité] opérationnelle
✅ Backward compatible

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types courants :**
- `✨ feat:` - Nouvelle fonctionnalité
- `🔧 fix:` - Correction de bug
- `🔥 hotfix:` - Correction critique urgente
- `📚 docs:` - Documentation
- `🎨 style:` - Formatage (pas de changement de logique)
- `♻️ refactor:` - Refactoring
- `🔒 security:` - Correction sécurité

---

## 🧪 TESTS EN PRODUCTION

### Comptes de Test

| Rôle | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@universaas.com | SuperAdmin2026! |
| Admin Université | newadmin@sorbonne.fr | Admin123456 |
| Enseignant | teacher.test@sorbonne.fr | Prof123456 |
| Étudiant | etudiant@sorbonne.fr | Student123456 |

### Checklist de Test Post-Déploiement

```
[ ] Application charge (https://university-saas.vercel.app)
[ ] Connexion admin fonctionne
[ ] Dashboard affiche correctement
[ ] Fonctionnalité modifiée opérationnelle
[ ] Pas d'erreur console
[ ] Données dans Firebase Console
[ ] Isolation multi-tenant préservée
```

---

## ⚠️ ERREURS FRÉQUENTES & SOLUTIONS

### 1. Permission Denied (Firebase)

**Cause :** Champ envoyé non autorisé par rules

**Solution :**
1. Grep le champ dans `database.rules.json`
2. Ajouter validation pour le champ
3. `firebase deploy --only database`
4. Tester immédiatement

### 2. CORS Error

**Cause :** `ALLOWED_ORIGINS` mal configuré

**Solution :**
1. Vérifier dans Vercel env vars
2. Doit être `https://university-saas.vercel.app`
3. Vider cache navigateur

### 3. Build Failed (Vercel)

**Cause :** Erreur de syntaxe ou dépendance

**Solution :**
1. Consulter Vercel deployment logs
2. Tester en local : `npm run build`
3. Corriger + push

---

## 📚 DOCUMENTATION DISPONIBLE

| Fichier | Description |
|---------|-------------|
| `WORKFLOW_PRODUCTION_BUGS.md` | ⚠️ Workflow détaillé résolution bugs |
| `QUICK_START_PRODUCTION.md` | Guide rapide déploiement |
| `VERCEL_DEPLOYMENT_GUIDE.md` | Guide complet Vercel |
| `AUDIT_DEPLOYMENT_FIXES.md` | Rapport audit technique |
| `DEPLOYMENT_SUCCESS_SUMMARY.md` | Récapitulatif déploiement |
| `.claude/memory/coding_methodology.md` | Méthodologie code obligatoire |
| `.claude/memory/security_audit_2026_07_06.md` | Audit sécurité complet |

---

## 🎯 OBJECTIFS DU PROJET

**Projet de Fin d'Études GoMyCode**

- ✅ Démontrer maîtrise SaaS multi-tenant production-ready
- ✅ Développement 100% piloté par IA
- ✅ Architecture scalable et sécurisée (9.8/10)
- ✅ Déploiement professionnel avec CI/CD

**Livrables :**
- Application SaaS fonctionnelle en production
- Firebase Rules sécurisées (800+ lignes)
- Documentation exhaustive (40+ KB)
- Vidéo démo (à venir)

---

## 🔗 LIENS RAPIDES

**Production :**  
https://university-saas.vercel.app

**Firebase Console :**  
https://console.firebase.google.com/project/university-saas-7b31e

**Vercel Dashboard :**  
https://vercel.com/moulayel-ab-s-projects/university-saas

**GitHub Repository :**  
https://github.com/moulaye-lab/universaas

---

## ✅ CHECKLIST AVANT TOUTE MODIFICATION

```
[ ] J'ai lu CLAUDE.md (ce fichier)
[ ] J'ai consulté WORKFLOW_PRODUCTION_BUGS.md (si bug)
[ ] J'ai lu .claude/memory/coding_methodology.md
[ ] Je suis en mode PRODUCTION (prudence maximale)
[ ] J'ai un plan validé par l'utilisateur
[ ] Je fais des modifications CIBLÉES uniquement
[ ] Je teste en local si possible
[ ] Je commite avec message détaillé
[ ] Je surveille le déploiement
```

---

**Dernière mise à jour :** 2026-07-18  
**Maintenu par :** Claude Sonnet 4.5  
**Status :** ✅ Production Guidelines Active
