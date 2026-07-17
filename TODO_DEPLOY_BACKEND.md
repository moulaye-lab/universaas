# ✅ TODO: Finaliser Déploiement Backend Serverless

## ✅ FAIT
- [x] Migration backend Express → Vercel Serverless Functions
- [x] Firebase Admin SDK singleton (évite cold start)
- [x] Middleware authentification réutilisable
- [x] Route `/api/ai/chat` - Assistant IA
- [x] Route `/api/import/students` - Import CSV
- [x] Frontend adapté (détection auto production vs local)
- [x] Code pushé sur GitHub (`preproduction` branch)
- [x] Dépendances installées localement

---

## 🔄 EN COURS (À FAIRE MAINTENANT)

### Étape 1: Configurer Variables d'Environnement Vercel

📄 **Voir guide complet**: `VERCEL_ENV_SETUP.md`

**Rapide via Dashboard**:
1. Aller sur https://vercel.com/moulayel-ab-s-projects/university-saas/settings/environment-variables
2. Ajouter ces 6 variables (Environment: **Production**):

```
ANTHROPIC_API_KEY         = sk-ant-api03-... (ta clé Claude)
FIREBASE_PROJECT_ID       = university-saas-7b31e
FIREBASE_CLIENT_EMAIL     = firebase-adminsdk-fbsvc@university-saas-7b31e.iam.gserviceaccount.com
FIREBASE_DATABASE_URL     = https://university-saas-7b31e-default-rtdb.firebaseio.com
ALLOWED_ORIGINS           = https://university-saas.vercel.app
FIREBASE_PRIVATE_KEY      = (voir VERCEL_ENV_SETUP.md - clé complète avec \n)
```

⚠️ **ATTENTION FIREBASE_PRIVATE_KEY**: Doit contenir `\n` littéralement (pas de vrais retours à la ligne)

---

### Étape 2: Déployer sur Vercel

```bash
vercel --prod --yes
```

Attendre ~30 secondes le build.

---

### Étape 3: Tester les Routes Serverless

#### Test 1: Assistant IA

1. Se connecter sur https://university-saas.vercel.app
2. Aller dans le dashboard (admin/teacher/student)
3. Cliquer sur l'icône Assistant IA (si disponible dans l'UI)
4. Envoyer un message
5. ✅ Vérifier que la réponse arrive (pas d'erreur 500)

#### Test 2: Import CSV (Si UI existe)

1. Se connecter en tant qu'admin université
2. Aller dans "Import Données" ou équivalent
3. Uploader un CSV de test
4. ✅ Vérifier que l'import fonctionne

---

### Étape 4: Vérifier les Logs

```bash
vercel logs --prod --since 10m
```

Chercher:
- ✅ `Firebase Admin initialized for project: university-saas-7b31e`
- ❌ Erreurs d'auth, timeouts, ou 500

---

## 🐛 Troubleshooting

### Erreur: "ANTHROPIC_API_KEY not found"
→ La variable n'est pas configurée sur Vercel
→ Retourner à Étape 1

### Erreur: "Firebase Admin init error"
→ Vérifier `FIREBASE_PRIVATE_KEY` (doit contenir `\n` littéralement)
→ Vérifier `FIREBASE_PROJECT_ID` et `FIREBASE_CLIENT_EMAIL`

### Erreur: "Token invalide ou expiré"
→ L'authentification Firebase fonctionne mal
→ Vérifier que le frontend envoie bien `Authorization: Bearer <token>`

### Timeout après 30s
→ C'est la limite Vercel pour les fonctions serverless gratuites
→ Optimiser les requêtes Firebase ou upgrader vers Pro

---

## 📊 Status Actuel

| Module | Status | Notes |
|--------|--------|-------|
| Frontend | ✅ Déployé | https://university-saas.vercel.app |
| Firebase Rules | ✅ Déployées | Dernière maj: signup fix |
| Backend Serverless | 🔄 Code prêt | Besoin config env |
| Variables Vercel | ⏳ À configurer | Voir Étape 1 |

---

## 🎯 Prochaines Étapes Après Déploiement

1. ✅ Tester signup université (déjà OK normalement)
2. ✅ Tester assistant IA
3. ✅ Créer profil Super Admin (guide: `CREER_SUPER_ADMIN_MAINTENANT.md`)
4. ✅ Démo instructeur demain

---

## 💡 Pour Plus Tard

- Ajouter route `/api/import/teachers` (import enseignants CSV)
- Ajouter route `/api/onboarding/create-university` (si besoin)
- Monitoring Vercel Analytics
- Alertes sur erreurs 500

---

**🚀 Commencer par Étape 1 maintenant!**
