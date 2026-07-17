# 🔐 Configuration Variables d'Environnement Vercel

## Variables Requises pour Backend Serverless

### Méthode 1: Via Dashboard Vercel (Recommandé)

1. Aller sur https://vercel.com/moulayel-ab-s-projects/university-saas/settings/environment-variables

2. Ajouter les variables suivantes (Environment: **Production**):

| Name | Value |
|------|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` (Ta clé API Claude) |
| `FIREBASE_PROJECT_ID` | `university-saas-7b31e` |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-fbsvc@university-saas-7b31e.iam.gserviceaccount.com` |
| `FIREBASE_DATABASE_URL` | `https://university-saas-7b31e-default-rtdb.firebaseio.com` |
| `ALLOWED_ORIGINS` | `https://university-saas.vercel.app` |
| `FIREBASE_PRIVATE_KEY` | ⚠️ **Voir ci-dessous** |

#### ⚠️ FIREBASE_PRIVATE_KEY (Important!)

**Valeur complète** (copier exactement avec `\n`):

```
-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDpBDpt6I151RzL\nsf5cunWygjNHsH3Z+lsQcW2M1fGmc9iqATaRyV420nWuOfQCK+f5gJLmheRCrwv8\nRYps2mzKQqmJ7USK9mSvdr6n6SLAcD4uEfyLnuWBJrdUxtAmeDmdLMAcF8xGTOnD\nUp4qicahYMUUETu5tOiuVIfFK54IGTAxYImsI3KTekKPE7Y9rVOKslXt/Ifiyrgs\nh0Ab74oN/LqP3KoANk63a/Phxa24ryqd5CkaIo4jrDAFjiriYd+EbzlPmvNyM/8T\n7QtcaJeGdoOtku8tnOvUOWWOx+nfXT/oIJt5dJZSNeUNkgm1xDPO+lZq8dcKaDZ2\ngrnVeNujAgMBAAECggEAFHhdSa/W/eT4P/dwXmUNrJOTkwYGMv1eEqEO/AME1O1I\naLxCjFF3CAnlHLEqpnuE8tOWFCT0WzIAM4vzD9erHE75kIxaK9BezVX5LyG5U9Pd\nzTOh+Vde12xh8/34kJNEkcePTj3ToY662oCKNI0go1IE/jD6tjhrrc+Z6HsJybGB\n3glRAEzJ2gD+9Gch6UyOyDyFUnDSRT8eTbA5JDqbJf7z9kFOqQEWbOGVIJmJjTAd\n7YYY23Vz8C0wctjxSjI+8hbvUikVtZgwLSINaKTPUibX3CfbhM+JjCGNzijSneWu\nDqNQUt1oEXgz0hmFbl6+a3EKRjTh06uVOV1zaEo9wQKBgQD0bHqdyNkhGJX4Nkbb\nHNKOkxFbj5wGgKPOHHdpAX2+Jz+2nNOXwuLe93Iw6HV19ZjdEItu1MX9QJWoJAi/\nBVICSDhtYhfVOJrQU6Z33fG8YkJmKJZWVIqF2UcEc8Hg6TDmW2AMuEQab9464niH\nacS+TRCayXzKnC4zaQVwYv33JwKBgQD0DXErXw+HXbbz52kXlOMvO6li/yBihYsw\nKb0/IaEijT2UnU9JCUiNmiZ+OQvxRH6/A2KkJai3h2Fw/qDdb5R/QDihjGHsXUON\nnD+0VmgJMa8a5WZCrLVFzWUw2+KMCsq05YCxVyrH0jRU7icMFYFwjH11WaOle/pM\nWSONQMilJQKBgQCdDS7kP2+0olWKfWWd2LE6Ryk6CdaZHwMhpozbfcfL7PA1aCNV\nOjYISjqnTlZbCwnD0aOl/TWSenMu7KhqBQMi0EDhl8v0h0CCZ51pG8T95K0Bc0bW\nBdBUHL5TEAYde/idq0zWH3gy/Hpwn6AOclmmZWIr8xcqIJxXED4cbp78tQKBgCs6\nFklwVPfNCZK58ktS+8pp7t6yAbJxpO2q9vIvqrLMAZRJKLnvAwLRwu+oew0I7Mo4\nd0hLw05+lCvHbgbKtKq1XVJ/4vhSrJxwiHgQteyq+DDzYOF+Zb0vXDUDPWVApBbW\nb6z5m4I5ITvJ0vC4/mxI9g/LCMlO5E6Rm1JxnxhhAoGBAN93EyT4Q3AojLoTXFzv\nv2Q++AUeaBqbu5vWtS+Uqv3LqzaS4msvVEx24tzkdjU1QiMTsWngB7CxWbVcO15X\nUF6XKmmW/mIBkoTqs3ycYcHnrT/rZswltwSZR/tRkS5g4VKEYPyPg0/4pBxmDuh6\nBneESjdWAGPPQZwZJYHmwn2m\n-----END PRIVATE KEY-----\n
```

⚠️ **ATTENTION**: La clé doit contenir `\n` littéralement (pas de vrais retours à la ligne). Vercel la convertira automatiquement.

---

### Méthode 2: Via CLI Vercel

```bash
# ANTHROPIC_API_KEY
vercel env add ANTHROPIC_API_KEY production
# Entrer: sk-ant-api03-...

# FIREBASE_PROJECT_ID
vercel env add FIREBASE_PROJECT_ID production
# Entrer: university-saas-7b31e

# FIREBASE_CLIENT_EMAIL
vercel env add FIREBASE_CLIENT_EMAIL production
# Entrer: firebase-adminsdk-fbsvc@university-saas-7b31e.iam.gserviceaccount.com

# FIREBASE_DATABASE_URL
vercel env add FIREBASE_DATABASE_URL production
# Entrer: https://university-saas-7b31e-default-rtdb.firebaseio.com

# ALLOWED_ORIGINS
vercel env add ALLOWED_ORIGINS production
# Entrer: https://university-saas.vercel.app

# FIREBASE_PRIVATE_KEY (copier tout le contenu avec \n)
vercel env add FIREBASE_PRIVATE_KEY production
# Coller la clé ci-dessus
```

---

## ✅ Vérification

Une fois les variables ajoutées:

1. **Redéployer** l'application:
   ```bash
   vercel --prod
   ```

2. **Tester** l'assistant IA dans l'application

3. **Vérifier les logs**:
   ```bash
   vercel logs --prod
   ```

---

## 🔐 Sécurité

- ❌ **NE JAMAIS** commiter ces credentials dans Git
- ✅ Le fichier `backend/firebase-admin-key.json` est déjà dans `.gitignore`
- ✅ Les variables Vercel sont chiffrées

---

## 📝 Note

Si tu n'as pas la clé `ANTHROPIC_API_KEY`:
1. Aller sur https://console.anthropic.com/settings/keys
2. Créer une nouvelle clé API
3. La copier immédiatement (elle ne sera plus visible)
