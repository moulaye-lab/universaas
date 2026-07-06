# 🔐 Gestion Sécurisée des Secrets

## ✅ Bonnes Pratiques Actuelles

- ✅ `.env.local` dans `.gitignore`
- ✅ Jamais commité dans Git
- ✅ Firebase API Key côté client (safe selon Firebase docs)

## 🚨 IMPORTANT: Ne JAMAIS Commiter

```bash
.env
.env.local
.env.production
.env.development
firebase-adminsdk-*.json
service-account-key.json
*.pem
*.key
```

## 📋 Checklist Avant Commit

```bash
# Vérifier qu'aucun secret n'est présent
git diff --staged | grep -i "api_key\|secret\|password\|token"

# Si quelque chose est trouvé → STOP
```

## 🔄 Si Secrets Accidentellement Committés

### 1. Immédiat (< 5 min)
```bash
# Supprimer de l'historique Git
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.local" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (DANGER)
git push origin --force --all
```

### 2. Régénérer TOUS les secrets (< 30 min)
- Firebase API Key → Régénérer dans Console
- Database URL → Créer nouveau projet si nécessaire
- Tokens d'accès → Révoquer et recréer

### 3. Audit (< 1h)
- Vérifier les logs d'accès Firebase
- Chercher des accès suspects
- Notifier l'équipe

## 🛡️ Protection Additionnelle

### Firebase App Check (Recommandé)
```javascript
// src/config/firebase.js
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('YOUR_RECAPTCHA_SITE_KEY'),
  isTokenAutoRefreshEnabled: true
});
```

### Variables d'Environnement Sécurisées

**DEV**:
```bash
# .env.local (local seulement)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
```

**PRODUCTION**:
```bash
# Variables d'environnement sur le serveur (Vercel/Netlify)
# Ne JAMAIS mettre dans .env.production committé
```

## 🔍 Audit Régulier

```bash
# Chercher des secrets dans le code
git grep -E "api[_-]?key|secret|password" -- '*.js' '*.jsx' '*.ts' '*.tsx'

# Si trouvé en dur dans le code → URGENT
```

## 📞 Contact Sécurité

En cas de fuite de secrets:
1. **Immédiat**: Révoquer les clés
2. **30 min**: Audit des accès
3. **1h**: Rapport d'incident

**Email**: security@university.edu
