# 🚀 Guide de Déploiement Vercel - University SaaS

## Prérequis
- Compte Vercel (vercel.com)
- CLI Vercel installée: `npm i -g vercel`
- Variables d'environnement Firebase prêtes

---

## 📋 Étape 1: Préparer les variables d'environnement

Créer un fichier `.env.production` (NE PAS commit):

```bash
VITE_FIREBASE_API_KEY=votre_api_key
VITE_FIREBASE_AUTH_DOMAIN=university-saas-7b31e.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://university-saas-7b31e-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=university-saas-7b31e
VITE_FIREBASE_STORAGE_BUCKET=university-saas-7b31e.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=votre_sender_id
VITE_FIREBASE_APP_ID=votre_app_id
```

---

## 🔧 Étape 2: Configuration Firebase

### A. Firebase Hosting (Alternative à Vercel)
Si vous préférez Firebase Hosting:

```bash
# Installer Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialiser (si pas déjà fait)
firebase init hosting

# Déployer
npm run build
firebase deploy --only hosting
```

### B. Autoriser le domaine Vercel dans Firebase
1. Firebase Console → Authentication → Settings
2. **Authorized domains** → Ajouter:
   - `your-project.vercel.app`
   - `your-custom-domain.com` (si domaine custom)

---

## 🌐 Étape 3: Déployer sur Vercel

### Option A: Via CLI

```bash
# Login Vercel
vercel login

# Premier déploiement (mode interactif)
vercel

# Répondre aux questions:
# ? Set up and deploy? Yes
# ? Which scope? Votre compte
# ? Link to existing project? No
# ? Project name? university-saas
# ? Directory? ./
# ? Override settings? No

# Production deployment
vercel --prod
```

### Option B: Via Dashboard Vercel

1. Aller sur https://vercel.com/new
2. Importer depuis Git (GitHub/GitLab/Bitbucket)
3. Sélectionner le dépôt `university-saas`
4. Configuration:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. **Environment Variables** → Ajouter toutes les variables `VITE_*`

6. Cliquer sur **Deploy**

---

## ⚙️ Étape 4: Configuration Post-Déploiement

### A. Vérifier le PWA
1. Ouvrir `https://your-project.vercel.app`
2. Chrome DevTools → Application
3. Vérifier:
   - ✅ Manifest chargé
   - ✅ Service Worker enregistré
   - ✅ Icônes visibles
4. Lighthouse → PWA Audit (devrait être vert)

### B. Tester l'installation PWA
- **Chrome Desktop**: Icône "Installer" dans la barre d'URL
- **Mobile**: Menu → "Ajouter à l'écran d'accueil"

### C. Vérifier Firebase Rules
```bash
# Déployer les règles si pas encore fait
firebase deploy --only database
firebase deploy --only storage
```

---

## 🔐 Sécurité Production

### A. Variables d'environnement Vercel
Dashboard → Settings → Environment Variables:

| Variable | Environnement | Valeur |
|----------|--------------|--------|
| `VITE_FIREBASE_API_KEY` | Production | `AIza...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Production | `university-saas-7b31e.firebaseapp.com` |
| ... | ... | ... |

### B. Domaines autorisés Firebase
Authentication → Settings → Authorized domains:
- `university-saas.vercel.app`
- `www.your-custom-domain.com`

### C. CORS Storage (si upload échoue)
Firebase Console → Storage → Rules → CORS:
```bash
gsutil cors set cors.json gs://university-saas-7b31e.firebasestorage.app
```

Fichier `cors.json`:
```json
[
  {
    "origin": ["https://your-project.vercel.app"],
    "method": ["GET", "PUT", "POST", "DELETE"],
    "maxAgeSeconds": 3600
  }
]
```

---

## 🚨 Troubleshooting

### Erreur: Service Worker non enregistré
**Cause**: HTTP au lieu de HTTPS
**Solution**: Vercel fournit HTTPS automatiquement, vérifier que vous accédez via `https://`

### Erreur: Firebase Auth Domain
**Cause**: Domaine Vercel non autorisé
**Solution**: Ajouter le domaine dans Firebase Console → Authentication → Authorized domains

### Erreur: Build échoue
**Cause**: Variables d'environnement manquantes
**Solution**: Vérifier que toutes les `VITE_*` sont définies dans Vercel

### Cache ancien après déploiement
**Solution**: Vider cache + hard reload (`Cmd+Shift+R` sur Mac, `Ctrl+Shift+R` sur Windows)

---

## 📊 Monitoring

### A. Vercel Analytics
Dashboard → Analytics → Activer
- Temps de chargement
- Core Web Vitals
- Trafic par page

### B. Firebase Monitoring
Console → Performance → Web
- Temps de démarrage
- Requêtes réseau
- Erreurs JS

---

## 🔄 Redéploiement

### Après modifications:
```bash
# Build local (test)
npm run build
npm run preview

# Deploy production
vercel --prod
```

### Auto-deploy via Git:
1. Connecter dépôt Git dans Vercel
2. Chaque push sur `main` → Deploy automatique
3. Pull requests → Preview deployments

---

## ✅ Checklist Final

Avant de valider le déploiement:

- [ ] Variables d'environnement configurées
- [ ] Firebase domains autorisés
- [ ] PWA installable (icône visible)
- [ ] Service Worker actif
- [ ] Lighthouse PWA score > 90
- [ ] Test connexion Firebase Auth
- [ ] Test upload Firebase Storage
- [ ] Test calendrier multi-tenant
- [ ] Test responsive mobile
- [ ] Console sans erreurs

---

## 📞 Support

**Vercel Docs**: https://vercel.com/docs
**Firebase Hosting**: https://firebase.google.com/docs/hosting
**Vite Deploy Guide**: https://vitejs.dev/guide/static-deploy.html

---

🎉 **Déploiement terminé !**
Votre application est maintenant accessible en HTTPS avec PWA complet.
