# 🤖 Backend Assistant IA - Guide de démarrage

## Installation

```bash
cd backend
npm install
```

## Configuration

1. Copier le fichier `.env.example` en `.env`:
```bash
cp .env.example .env
```

2. Obtenir une clé API Claude:
   - Aller sur https://console.anthropic.com/
   - Créer un compte ou se connecter
   - Aller dans "API Keys"
   - Créer une nouvelle clé
   - Copier la clé (format: `sk-ant-api03-...`)

3. Obtenir les credentials Firebase Admin:
   - Aller sur https://console.firebase.google.com/
   - Sélectionner votre projet
   - Aller dans "Project Settings" (⚙️) > "Service accounts"
   - Cliquer sur "Generate new private key"
   - Télécharger le fichier JSON
   - Extraire les valeurs suivantes:
     - `project_id` → FIREBASE_PROJECT_ID
     - `client_email` → FIREBASE_CLIENT_EMAIL
     - `private_key` → FIREBASE_PRIVATE_KEY (garder les \n)

4. Remplir le fichier `.env`:
```env
ANTHROPIC_API_KEY=sk-ant-api03-votre-clé-ici

FIREBASE_PROJECT_ID=votre-projet-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nVotre-clé-ici\n-----END PRIVATE KEY-----\n"

PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10
```

## Démarrage

### Mode développement
```bash
npm run dev
```

### Mode production
```bash
npm start
```

Le serveur démarre sur http://localhost:3001

## Configuration du frontend

Dans le fichier `.env` du frontend (racine du projet):

```env
VITE_AI_API_URL=http://localhost:3001
```

## Test de santé

Vérifier que le backend fonctionne:
```bash
curl http://localhost:3001/api/health
```

Réponse attendue:
```json
{
  "status": "ok",
  "timestamp": "2026-07-10T...",
  "anthropicApiConfigured": true
}
```

## Structure des requêtes

### POST /api/ai/chat

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <firebase-token>
```

**Body:**
```json
{
  "message": "Quelles sont mes prochaines échéances de paiement ?",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Bonjour"
    },
    {
      "role": "assistant",
      "content": "Bonjour! Comment puis-je vous aider?"
    }
  ]
}
```

**Response:**
```json
{
  "response": "Vos prochaines échéances...",
  "usage": {
    "input_tokens": 120,
    "output_tokens": 85
  }
}
```

## Sécurité

✅ **Implémenté:**
- Authentication Firebase obligatoire
- Rate limiting (10 requêtes/minute par IP)
- Helmet.js pour headers sécurisés
- CORS configuré
- Validation des entrées
- Limite de longueur des messages (500 caractères)

⚠️ **À faire pour la production:**
- [ ] Utiliser HTTPS
- [ ] Configurer un reverse proxy (nginx)
- [ ] Mettre en place un monitoring (Sentry, LogRocket)
- [ ] Configurer des alertes sur les coûts API
- [ ] Implémenter un système de cache pour réduire les coûts
- [ ] Ajouter des tests automatisés

## Monitoring des coûts

Le backend enregistre les analytics dans Firebase:
```
universities/{universityId}/aiAnalytics/
```

Chaque interaction enregistre:
- userId
- userRole
- timestamp
- messageLength
- responseLength
- tokensUsed

## Logs

Les logs sont affichés dans la console:
```
🚀 Backend IA démarré sur http://localhost:3001
📊 Rate limiting: 10 requêtes par 60s
🤖 API Claude configurée: ✅
```

## Erreurs courantes

### 1. "API Claude configurée: ❌"
→ Vérifier que `ANTHROPIC_API_KEY` est défini dans `.env`

### 2. "Firebase Admin initialization failed"
→ Vérifier les credentials Firebase dans `.env`

### 3. "CORS error"
→ Ajouter l'URL du frontend dans `ALLOWED_ORIGINS`

### 4. "Rate limit exceeded"
→ Augmenter `RATE_LIMIT_MAX_REQUESTS` ou attendre 1 minute

### 5. "Token invalide ou expiré"
→ L'utilisateur doit se reconnecter sur le frontend

## Déploiement

### Heroku
```bash
heroku create votre-app-ai
heroku config:set ANTHROPIC_API_KEY=sk-ant-...
heroku config:set FIREBASE_PROJECT_ID=...
# etc.
git push heroku main
```

### Render.com
1. Connecter le repo GitHub
2. Choisir "Web Service"
3. Build command: `npm install`
4. Start command: `npm start`
5. Ajouter les variables d'environnement

### VPS (DigitalOcean, AWS, etc.)
```bash
# Installer Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Cloner et démarrer
git clone ...
cd backend
npm install
npm install -g pm2
pm2 start server.js --name "ai-backend"
pm2 save
pm2 startup
```

## Support

- Documentation Claude: https://docs.anthropic.com/
- Firebase Admin SDK: https://firebase.google.com/docs/admin/setup
- Express.js: https://expressjs.com/

## Coûts estimés

**Claude Sonnet 3.5:**
- Input: $3 / 1M tokens
- Output: $15 / 1M tokens

**Exemple:**
- 1000 utilisateurs actifs
- 10 messages/jour/utilisateur = 10,000 messages/jour
- ~150 tokens par message (input + output)
- ~1.5M tokens/jour = 45M tokens/mois

**Coût mensuel:** ~$675 (à ajuster selon l'usage réel)

**Optimisations:**
- Implémenter un cache pour questions fréquentes
- Limiter l'historique à 5-10 messages
- Utiliser GPT-3.5 Turbo pour questions simples ($0.50/1M)
