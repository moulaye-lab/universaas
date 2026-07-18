# ⚡ Guide Rapide - Déploiement Production

**Date:** 2026-07-18  
**Status:** ✅ Configurations appliquées, prêt à déployer  
**Temps estimé:** 10 minutes

---

## 🎯 CE QUI A ÉTÉ FAIT

### ✅ Corrections Appliquées (Commit `b422808`)

1. **`vercel.json`** - Configuration routing serverless + CORS
2. **Firebase Rules** - Déployées en production (`departments` + `courseTemplates`)
3. **Documentation complète** - 3 guides créés

### ⚠️ CE QUI RESTE À FAIRE

**1 seule chose:** Configurer les **variables d'environnement Vercel**

---

## 🚀 DÉPLOIEMENT EN 3 ÉTAPES

### ÉTAPE 1: Configurer Variables d'Environnement Vercel

**Option A: Dashboard Vercel (5 min - Recommandé)**

1. Aller sur: https://vercel.com/moulayel-ab-s-projects/university-saas/settings/environment-variables

2. Ajouter ces 7 variables (Environment: **Production**):

| Variable | Valeur |
|----------|--------|
| `FIREBASE_PROJECT_ID` | `university-saas-7b31e` |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-fbsvc@university-saas-7b31e.iam.gserviceaccount.com` |
| `FIREBASE_DATABASE_URL` | `https://university-saas-7b31e-default-rtdb.firebaseio.com` |
| `VITE_FIREBASE_DATABASE_URL` | `https://university-saas-7b31e-default-rtdb.firebaseio.com` |
| `ALLOWED_ORIGINS` | `https://university-saas.vercel.app` |
| `ANTHROPIC_API_KEY` | Copier depuis `backend/.env` |
| `FIREBASE_PRIVATE_KEY` | ⚠️ **Voir section ci-dessous** |

#### ⚠️ FIREBASE_PRIVATE_KEY - Configuration Critique

**Comment obtenir:**
1. Ouvrir `backend/firebase-admin-key.json`
2. Copier la valeur du champ `"private_key"`
3. Coller dans Vercel **EXACTEMENT** (avec `\n` littéraux)

**Format attendu:**
```
-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDpBDpt6I151RzL...\n-----END PRIVATE KEY-----\n
```

**⚠️ ATTENTION:**
- Les `\n` doivent être **littéraux** (2 caractères: backslash + n)
- **PAS** de vrais retours à la ligne
- Vercel les convertira automatiquement

---

**Option B: Via Script CLI (10 min)**

```bash
# Exécuter le script interactif
./VERCEL_ENV_COMMANDS.sh
```

Le script guide pas à pas pour chaque variable.

---

### ÉTAPE 2: Déployer sur Vercel

```bash
# Tout est déjà commité, juste push
git push origin preproduction
```

Vercel déploie automatiquement (CI/CD). Surveiller sur:  
https://vercel.com/moulayel-ab-s-projects/university-saas

---

### ÉTAPE 3: Tester en Production

#### Test 1: Health Check API

```bash
curl https://university-saas.vercel.app/api/health
```

**Réponse attendue:**
```json
{
  "status": "ok",
  "timestamp": "2026-07-18T...",
  "services": {
    "ai": true,
    "database": true
  }
}
```

#### Test 2: Connexion Utilisateur

1. Aller sur https://university-saas.vercel.app
2. Se connecter avec compte demo:
   - **Email:** `newadmin@sorbonne.fr`
   - **Password:** `Admin123456`
3. Vérifier que le dashboard charge correctement

#### Test 3: Isolation Multi-Tenant

1. Se connecter avec université A
2. Essayer d'accéder aux données d'université B
3. **Résultat attendu:** Impossible (403 ou données vides)

---

## 📚 DOCUMENTATION COMPLÈTE

Si besoin de plus de détails:

1. **`VERCEL_DEPLOYMENT_GUIDE.md`** - Guide complet avec troubleshooting
2. **`AUDIT_DEPLOYMENT_FIXES.md`** - Détails techniques de l'audit
3. **`VERCEL_ENV_COMMANDS.sh`** - Script CLI configuration variables

---

## 🚨 Troubleshooting Rapide

### Erreur: "Firebase Admin init error"

**Solution:**
1. Vérifier `FIREBASE_PRIVATE_KEY` dans Vercel env vars
2. S'assurer que `\n` est littéral (pas de vrais retours)
3. Re-copier depuis `backend/firebase-admin-key.json`

### Erreur: "CORS policy blocked"

**Solution:**
1. Vérifier `ALLOWED_ORIGINS=https://university-saas.vercel.app` dans Vercel
2. Attendre 1-2 min (propagation cache Vercel)
3. Vider cache navigateur

### Erreur: "Permission denied" Firebase

**Solution:**
1. Firebase Rules déjà déployées ✅
2. Vérifier token JWT (se reconnecter)
3. Vérifier `universityId` dans profil utilisateur

---

## 📞 Support

**Production URL:** https://university-saas.vercel.app  
**Vercel Dashboard:** https://vercel.com/moulayel-ab-s-projects/university-saas  
**Firebase Console:** https://console.firebase.google.com/project/university-saas-7b31e

**En cas de blocage:**
1. Consulter Vercel Deployment Logs
2. Consulter Firebase Console > Database > Rules
3. Rollback possible: `git revert b422808`

---

## ✅ Checklist Finale

- [ ] Variables d'environnement Vercel configurées (7 variables)
- [ ] `FIREBASE_PRIVATE_KEY` avec `\n` littéraux
- [ ] Push vers `preproduction` effectué
- [ ] Déploiement Vercel terminé (vérifier dashboard)
- [ ] `/api/health` répond 200 OK
- [ ] Connexion utilisateur fonctionne
- [ ] Isolation multi-tenant validée

**Une fois tous les tests OK → Merger vers `main`**

---

**Dernière mise à jour:** 2026-07-18  
**Commit actuel:** `b422808` - "🚀 Production: Fix Vercel serverless deployment configuration"

🚀 **LET'S DEPLOY!**
