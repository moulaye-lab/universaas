# 🚀 Démarrage Rapide - Backend IA

## Prérequis

Vous avez déjà:
- ✅ Clé API Claude (Anthropic)
- ✅ Fichier `firebase-admin-key.json`

## Configuration en 3 étapes

### 1. Créer le fichier `.env`

```bash
cd backend
cp .env.example .env
```

Éditer `.env` et remplir:

```env
# Votre clé API Claude
ANTHROPIC_API_KEY=sk-ant-api03-VOTRE-CLE-ICI

# Chemin vers votre fichier Firebase (relatif au dossier backend)
FIREBASE_CONFIG_PATH=./firebase-admin-key.json

# Configuration serveur
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10
```

### 2. Placer le fichier Firebase

Placer votre fichier `firebase-admin-key.json` dans le dossier `backend/`:

```
backend/
├── firebase-admin-key.json  ← ICI
├── server.js
├── package.json
└── .env
```

### 3. Démarrer le serveur

```bash
npm start
```

Vous devriez voir:

```
============================================================
🚀 Backend IA démarré avec succès!
============================================================
📡 URL: http://localhost:3001
📊 Rate limiting: 10 requêtes par 60s
🤖 API Claude: ✅ Configurée (sk-ant-api03-xxxxx...)
🔥 Firebase: ✅ Projet votre-projet-id
🌍 CORS autorisé: http://localhost:5173
============================================================
💡 Endpoints disponibles:
   GET  /api/health       - Health check
   POST /api/ai/chat      - Chat avec l'IA
============================================================
```

## Test rapide

### Test 1: Health check

```bash
curl http://localhost:3001/api/health
```

Réponse attendue:
```json
{
  "status": "ok",
  "timestamp": "2026-07-10T...",
  "anthropicApiConfigured": true,
  "firebaseProjectId": "votre-projet-id",
  "environment": "development"
}
```

### Test 2: Chat (nécessite un token Firebase)

```bash
# Obtenir un token depuis le frontend (F12 > Console)
# Puis:
curl -X POST http://localhost:3001/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE-TOKEN-FIREBASE" \
  -d '{
    "message": "Bonjour, peux-tu m aider?",
    "conversationHistory": []
  }'
```

## Erreurs courantes

### ❌ "ANTHROPIC_API_KEY non définie"
→ Vérifier que la clé est dans `.env` et commence par `sk-ant-`

### ❌ "FIREBASE_CONFIG_PATH non définie"
→ Ajouter `FIREBASE_CONFIG_PATH=./firebase-admin-key.json` dans `.env`

### ❌ "Erreur lors du chargement du fichier Firebase"
→ Vérifier que `firebase-admin-key.json` est bien dans le dossier `backend/`

### ❌ "Error: credential-internal-error"
→ Le fichier Firebase JSON est corrompu ou invalide

### ❌ "CORS error" depuis le frontend
→ Ajouter l'URL du frontend dans `ALLOWED_ORIGINS`

## Frontend

Le frontend est déjà configuré pour utiliser le backend sur `http://localhost:3001`.

Assurez-vous que le fichier `.env` à la racine du projet contient:

```env
VITE_AI_API_URL=http://localhost:3001
```

## Utilisation

Une fois le backend démarré:

1. Démarrer le frontend: `npm run dev` (dans le dossier principal)
2. Se connecter comme étudiant, enseignant, admin, parent ou comptable
3. Cliquer sur le bouton violet flottant en bas à droite
4. Discuter avec l'IA! 🤖

## Mode développement (auto-reload)

Pour que le serveur redémarre automatiquement à chaque modification:

```bash
npm install -g nodemon
npm run dev
```

## Logs

Les logs affichent:
- ✅ Succès de configuration
- ❌ Erreurs détaillées
- 📊 Statistiques d'utilisation
- 🔍 Requêtes reçues

## Sécurité

⚠️ **Important:**
- Ne JAMAIS commit `.env` ou `firebase-admin-key.json`
- Ces fichiers sont dans `.gitignore`
- En production, utiliser des variables d'environnement sécurisées

## Support

Si le backend ne démarre pas:

1. Vérifier les logs d'erreur
2. Vérifier que Node.js >= 16 est installé: `node -v`
3. Réinstaller les dépendances: `rm -rf node_modules && npm install`
4. Vérifier que le port 3001 n'est pas déjà utilisé: `lsof -i :3001`

## Prêt! 🎉

Votre backend IA est maintenant opérationnel et connecté à:
- ✅ API Claude (Anthropic)
- ✅ Firebase Admin SDK
- ✅ Base de données Firebase Realtime
- ✅ Système d'authentification Firebase

Les utilisateurs peuvent maintenant discuter avec l'assistant IA directement depuis l'application! 🚀
