# 🔥 Guide de Configuration Firebase

## Étape 1 : Créer un Projet Firebase

1. **Aller sur la console Firebase** : https://console.firebase.google.com/
2. **Cliquer sur "Ajouter un projet"**
3. **Nom du projet** : `university-saas` (ou le nom de ton choix)
4. **Désactiver Google Analytics** (optionnel pour ce projet)
5. **Cliquer sur "Créer le projet"**

## Étape 2 : Activer Firebase Authentication

1. Dans la console Firebase, **cliquer sur "Authentication"** dans le menu de gauche
2. **Cliquer sur "Commencer"**
3. **Activer "Email/Password"** :
   - Cliquer sur "Fournisseurs de connexion"
   - Sélectionner "E-mail/mot de passe"
   - Activer le bouton
   - Enregistrer

## Étape 3 : Activer Realtime Database

1. Dans la console Firebase, **cliquer sur "Realtime Database"** dans le menu
2. **Cliquer sur "Créer une base de données"**
3. **Choisir la région** : `us-central1` (ou la plus proche de toi)
4. **Mode de sécurité** : Choisir "Commencer en mode test" (on va ajouter nos règles après)
5. **Cliquer sur "Activer"**

## Étape 4 : Déployer les Règles de Sécurité

1. Dans l'onglet "Règles" de Realtime Database
2. **Copier TOUT le contenu du fichier `database.rules.json`** de ce projet
3. **Coller dans l'éditeur de règles Firebase**
4. **Cliquer sur "Publier"**

⚠️ **IMPORTANT** : Ces règles assurent l'isolation multi-tenant. Ne pas les ignorer !

## Étape 5 : Activer Firebase Storage

1. Dans la console Firebase, **cliquer sur "Storage"** dans le menu
2. **Cliquer sur "Commencer"**
3. **Choisir "Commencer en mode test"** (on configurera les règles après)
4. **Choisir la région** : même que pour Realtime Database
5. **Cliquer sur "Suivant"** puis **"OK"**

## Étape 6 : Récupérer les Credentials Firebase

1. Dans la console Firebase, **cliquer sur l'icône ⚙️ (Paramètres)** → "Paramètres du projet"
2. **Descendre jusqu'à "Vos applications"**
3. **Cliquer sur l'icône Web `</>`** pour ajouter une application web
4. **Nom de l'application** : `university-saas-web`
5. **NE PAS cocher "Configurer Firebase Hosting"** pour l'instant
6. **Cliquer sur "Enregistrer l'application"**
7. **Copier la configuration** qui ressemble à ça :

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "university-saas.firebaseapp.com",
  databaseURL: "https://university-saas-default-rtdb.firebaseio.com",
  projectId: "university-saas",
  storageBucket: "university-saas.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

## Étape 7 : Créer le fichier .env.local

1. **À la racine du projet**, créer un fichier nommé `.env.local`
2. **Copier le contenu de `.env.example`**
3. **Remplacer les valeurs** avec tes vraies credentials Firebase :

```bash
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=university-saas.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://university-saas-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=university-saas
VITE_FIREBASE_STORAGE_BUCKET=university-saas.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# Agora.io (on configurera plus tard)
VITE_AGORA_APP_ID=

# Stripe (on configurera plus tard)
VITE_STRIPE_PUBLISHABLE_KEY=

VITE_APP_ENV=development
```

4. **Sauvegarder le fichier**

⚠️ **IMPORTANT** : Ce fichier `.env.local` est dans le `.gitignore` pour ne JAMAIS être commité sur Git (sécurité).

## Étape 8 : Créer le Premier Utilisateur Super Admin

Pour créer le premier compte super_admin_plateforme, on va utiliser la console Firebase :

1. **Aller dans "Authentication" → "Users"**
2. **Cliquer sur "Ajouter un utilisateur"**
3. **Email** : ton email (ex: `admin@university-saas.com`)
4. **Mot de passe** : un mot de passe sécurisé
5. **Cliquer sur "Ajouter un utilisateur"**
6. **Copier l'UID généré** (quelque chose comme `abc123def456`)

Maintenant, on va ajouter son profil dans Realtime Database :

1. **Aller dans "Realtime Database" → "Données"**
2. **Cliquer sur le "+" à côté de la racine**
3. **Créer cette structure** :

```json
{
  "users": {
    "abc123def456": {
      "email": "admin@university-saas.com",
      "universityId": null,
      "role": "super_admin_plateforme",
      "displayName": "Super Admin",
      "createdAt": 1704067200000,
      "lastLogin": null,
      "preferences": {
        "language": "fr",
        "theme": "light"
      }
    }
  }
}
```

Remplace `abc123def456` par ton vrai UID Firebase.

## Étape 9 : Vérifier l'Installation

1. **Dans le terminal**, à la racine du projet :

```bash
npm run dev
```

2. **Ouvrir** http://localhost:5173
3. **Vérifier qu'il n'y a pas d'erreur de console** concernant Firebase

Si tout est OK, tu verras la page Vite par défaut sans erreur.

## Étape 10 : Configuration Agora.io (pour le module vidéo live)

⏳ **À faire plus tard** (Phase 4) quand on implémentera le module vidéo live.

1. Créer un compte sur https://console.agora.io/
2. Créer un projet Agora.io
3. Copier l'App ID dans `.env.local`

## Étape 11 : Configuration Stripe (pour la facturation)

⏳ **À faire plus tard** (Phase 2) quand on implémentera le module de facturation.

1. Créer un compte sur https://dashboard.stripe.com/
2. Activer le mode Test
3. Copier la clé publique dans `.env.local`

---

## ✅ Checklist de Validation

- [ ] Projet Firebase créé
- [ ] Authentication activée (Email/Password)
- [ ] Realtime Database créée et règles déployées
- [ ] Storage activé
- [ ] Credentials copiées dans `.env.local`
- [ ] Premier super_admin créé dans Authentication + Database
- [ ] `npm run dev` fonctionne sans erreur Firebase

**Une fois cette checklist complète, tu es prêt pour la Phase 2 : Landing Page !**

---

**Temps estimé** : 15-20 minutes  
**Difficulté** : Débutant  
**Documentation officielle** : https://firebase.google.com/docs/web/setup
