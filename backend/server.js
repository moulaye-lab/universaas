/**
 * Backend API pour l'Assistant IA
 *
 * Sécurise les appels à l'API Claude et gère l'authentification Firebase
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Anthropic = require('@anthropic-ai/sdk');
const admin = require('firebase-admin');
const { getApp, initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Vérifier que les variables d'environnement sont définies
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY non définie dans .env');
  process.exit(1);
}

if (!process.env.FIREBASE_CONFIG_PATH) {
  console.error('❌ FIREBASE_CONFIG_PATH non définie dans .env');
  process.exit(1);
}

// Charger le fichier de configuration Firebase
const firebaseConfigPath = path.resolve(__dirname, process.env.FIREBASE_CONFIG_PATH);
let serviceAccount;

try {
  serviceAccount = require(firebaseConfigPath);
  console.log('✅ Configuration Firebase chargée depuis:', firebaseConfigPath);
  if (process.env.NODE_ENV !== 'production') {
    console.log('   Type:', typeof serviceAccount);
    console.log('   Project ID:', serviceAccount?.project_id);
  }
} catch (error) {
  console.error('❌ Erreur lors du chargement du fichier Firebase:', firebaseConfigPath);
  console.error('   Erreur:', error.message);
  console.error('   Assurez-vous que le fichier existe et est valide');
  process.exit(1);
}

// Initialiser Firebase Admin avec le fichier JSON
try {
  initializeApp({
    credential: cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
  });
  console.log('✅ Firebase Admin initialisé pour le projet:', serviceAccount.project_id);
} catch (error) {
  console.error('❌ Erreur lors de l\'initialisation de Firebase Admin:', error.message);
  process.exit(1);
}

const db = getDatabase();

// Initialiser Anthropic (Claude) avec la vraie clé API
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

console.log('✅ Client Anthropic (Claude) initialisé');

// Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting global (par IP)
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 20, // 20 requêtes par minute par IP
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting par utilisateur (plus strict)
const userLimiters = new Map();
function getUserRateLimiter(userId) {
  if (!userLimiters.has(userId)) {
    userLimiters.set(userId, {
      count: 0,
      resetAt: Date.now() + 60000
    });
  }
  return userLimiters.get(userId);
}

// Middleware de rate limiting par utilisateur
function perUserRateLimit(req, res, next) {
  const userId = req.userProfile?.uid;
  if (!userId) return next();

  const limiter = getUserRateLimiter(userId);
  const now = Date.now();

  // Reset si la fenêtre est expirée
  if (now > limiter.resetAt) {
    limiter.count = 0;
    limiter.resetAt = now + 60000;
  }

  // Vérifier la limite (10 requêtes par minute par utilisateur)
  if (limiter.count >= 10) {
    return res.status(429).json({
      error: 'Limite de requêtes atteinte pour cet utilisateur',
      retryAfter: Math.ceil((limiter.resetAt - now) / 1000)
    });
  }

  limiter.count++;
  next();
}

app.use('/api/ai', globalLimiter);

// Fonction de logging sécurisé
function securityLog(level, message, metadata = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...metadata
  };

  // En production, envoyer à un service de logging (Datadog, CloudWatch, etc.)
  if (process.env.NODE_ENV === 'production') {
    // TODO: Intégrer un service de logging externe
    console.log(JSON.stringify(logEntry));
  } else {
    console.log(`[${level}] ${message}`, metadata);
  }
}

// Middleware d'authentification Firebase
async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      securityLog('WARN', 'Authentication attempt without token', {
        ip: req.ip,
        path: req.path
      });
      return res.status(401).json({ error: 'Token d\'authentification manquant' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email
    };

    // Charger le profil utilisateur depuis Firebase
    const userSnapshot = await db.ref(`users/${decodedToken.uid}`).once('value');
    const userData = userSnapshot.val();

    if (!userData) {
      securityLog('WARN', 'User profile not found', {
        uid: decodedToken.uid,
        email: decodedToken.email
      });
      return res.status(404).json({ error: 'Profil utilisateur non trouvé' });
    }

    req.userProfile = {
      ...req.user,
      ...userData
    };

    next();
  } catch (error) {
    securityLog('ERROR', 'Authentication failed', {
      error: error.message,
      ip: req.ip,
      path: req.path
    });
    return res.status(403).json({ error: 'Token invalide ou expiré' });
  }
}

// Middleware pour charger les paramètres IA de l'université
async function loadAISettings(req, res, next) {
  try {
    const universityId = req.userProfile.universityId;

    if (!universityId) {
      return res.status(400).json({ error: 'ID université manquant' });
    }

    const universitySnapshot = await db.ref(`universities/${universityId}`).once('value');
    const universityData = universitySnapshot.val();

    if (!universityData) {
      return res.status(404).json({ error: 'Université non trouvée' });
    }

    req.aiSettings = {
      aiEnabled: universityData.aiEnabled !== undefined ? universityData.aiEnabled : true,
      aiAssistantName: universityData.aiAssistantName || 'Assistant Académique',
      aiPersonality: universityData.aiPersonality || 'professional',
      aiLanguage: universityData.aiLanguage || 'fr',
      aiFeatures: universityData.aiFeatures || {},
      aiResponseStyle: universityData.aiResponseStyle || 'balanced',
      aiContextAwareness: universityData.aiContextAwareness || 'full'
    };

    // Vérifier si l'IA est activée
    if (!req.aiSettings.aiEnabled) {
      return res.status(403).json({ error: 'L\'assistant IA n\'est pas activé pour cette université' });
    }

    // Vérifier si activé pour ce rôle
    const roleFeatureMap = {
      'student': 'studentSupport',
      'teacher': 'teacherSupport',
      'admin_universite': 'adminSupport',
      'parent': 'parentSupport',
      'comptable': 'adminSupport'
    };

    const requiredFeature = roleFeatureMap[req.userProfile.role];
    if (requiredFeature && !req.aiSettings.aiFeatures[requiredFeature]) {
      return res.status(403).json({ error: 'L\'assistant IA n\'est pas activé pour votre rôle' });
    }

    next();
  } catch (error) {
    console.error('Error loading AI settings:', error);
    return res.status(500).json({ error: 'Erreur lors du chargement des paramètres IA' });
  }
}

// Fonction pour construire le prompt système
function buildSystemPrompt(aiSettings, userProfile, userContext = {}) {
  const personalityPrompts = {
    professional: 'Tu es un assistant professionnel et formel. Tu fournis des informations précises et factuelles.',
    friendly: 'Tu es un assistant chaleureux et encourageant. Tu es accessible et bienveillant dans tes interactions.',
    concise: 'Tu es un assistant direct et efficace. Tu vas droit au but avec des réponses courtes.'
  };

  const stylePrompts = {
    detailed: 'Fournis des explications complètes et détaillées.',
    balanced: 'Trouve un équilibre entre détails et concision.',
    brief: 'Sois bref et va à l\'essentiel.'
  };

  const roleContext = {
    student: 'Tu aides un étudiant avec ses cours, notes, emploi du temps et paiements.',
    teacher: 'Tu assistes un enseignant dans la gestion de ses cours, notes et emploi du temps.',
    admin_universite: 'Tu aides un administrateur dans la gestion de l\'université.',
    parent: 'Tu aides un parent à suivre la scolarité de son enfant.',
    comptable: 'Tu aides un comptable dans la gestion financière de l\'université.'
  };

  const languageMap = {
    fr: 'français',
    en: 'anglais',
    ar: 'arabe',
    es: 'espagnol'
  };

  let systemPrompt = `Tu es ${aiSettings.aiAssistantName}, l'assistant virtuel de l'université.

${personalityPrompts[aiSettings.aiPersonality]}
${stylePrompts[aiSettings.aiResponseStyle]}
${roleContext[userProfile.role] || ''}

Tu communiques en ${languageMap[aiSettings.aiLanguage] || 'français'}.

Informations sur l'utilisateur:
- Rôle: ${userProfile.role}
- Nom: ${userProfile.displayName || 'Non défini'}`;

  // Ajouter contexte selon le niveau de conscience
  if (aiSettings.aiContextAwareness === 'full' && userContext) {
    if (userContext.studentData) {
      systemPrompt += `\n\nDonnées de l'étudiant:
- Niveau: ${userContext.studentData.level || 'Non défini'}
- Classe: ${userContext.studentData.class || 'Non défini'}
- Département: ${userContext.studentData.department || 'Non défini'}`;
    }
  }

  systemPrompt += `\n\nTu dois:
- Répondre uniquement en ${languageMap[aiSettings.aiLanguage]}
- Être précis et factuel
- Guider l'utilisateur vers les bonnes sections de l'application
- Ne jamais inventer d'informations
- Dire "Je ne sais pas" si tu n'as pas l'information`;

  return systemPrompt;
}

// Fonction pour charger le contexte utilisateur
async function loadUserContext(userProfile, aiSettings) {
  const context = {};

  if (aiSettings.aiContextAwareness === 'minimal') {
    return context;
  }

  try {
    // Charger données spécifiques selon le rôle
    if (userProfile.role === 'student') {
      const studentSnapshot = await db.ref(`universities/${userProfile.universityId}/students/${userProfile.uid}`).once('value');
      context.studentData = studentSnapshot.val() || {};
    } else if (userProfile.role === 'teacher') {
      const teacherSnapshot = await db.ref(`universities/${userProfile.universityId}/teachers/${userProfile.uid}`).once('value');
      context.teacherData = teacherSnapshot.val() || {};
    }

    return context;
  } catch (error) {
    console.error('Error loading user context:', error);
    return context;
  }
}

// Fonction de détection de prompt injection
function detectPromptInjection(message) {
  const suspiciousPatterns = [
    /ignore\s+(previous|all|above)\s+instructions?/i,
    /you\s+are\s+now/i,
    /system\s*:/i,
    /\[system\]/i,
    /forget\s+(everything|all|that)/i,
    /<\|im_start\|>/i,
    /<\|im_end\|>/i,
    /###\s*instruction/i,
    /assistant\s*:/i,
    /\[assistant\]/i,
    /new\s+role/i,
    /pretend\s+(you|to\s+be)/i
  ];

  return suspiciousPatterns.some(pattern => pattern.test(message));
}

// Fonction de validation et sanitisation des entrées
function validateAndSanitizeInput(message, conversationHistory) {
  const errors = [];

  // Validation du message
  if (!message || typeof message !== 'string') {
    errors.push('Message invalide');
  } else {
    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      errors.push('Le message ne peut pas être vide');
    }
    if (trimmedMessage.length > 2000) {
      errors.push('Message invalide');
    }
    // Vérifier les caractères suspects
    if (trimmedMessage.includes('\\x00') || trimmedMessage.includes('\0')) {
      errors.push('Contenu invalide détecté');
    }
    // Détecter les tentatives de prompt injection
    if (detectPromptInjection(trimmedMessage)) {
      securityLog('WARN', 'Prompt injection attempt detected', {
        messagePreview: trimmedMessage.substring(0, 50)
      });
      errors.push('Contenu suspect détecté');
    }
  }

  // Validation de l'historique de conversation
  if (!Array.isArray(conversationHistory)) {
    errors.push('L\'historique de conversation doit être un tableau');
  } else if (conversationHistory.length > 20) {
    errors.push('Historique de conversation trop long (maximum 20 messages)');
  } else {
    for (const msg of conversationHistory) {
      if (!msg || typeof msg !== 'object') {
        errors.push('Format d\'historique invalide');
        break;
      }
      if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
        errors.push('Rôle de message invalide dans l\'historique');
        break;
      }
      if (!msg.content || typeof msg.content !== 'string') {
        errors.push('Contenu de message invalide dans l\'historique');
        break;
      }
      if (msg.content.length > 5000) {
        errors.push('Message dans l\'historique trop long');
        break;
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// Route principale de chat
app.post('/api/ai/chat', authenticateUser, perUserRateLimit, loadAISettings, async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    // Validation complète des entrées
    const validation = validateAndSanitizeInput(message, conversationHistory);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Données invalides',
        details: validation.errors
      });
    }

    const trimmedMessage = message.trim();

    // Charger le contexte utilisateur
    const userContext = await loadUserContext(req.userProfile, req.aiSettings);

    // Construire le prompt système
    const systemPrompt = buildSystemPrompt(req.aiSettings, req.userProfile, userContext);

    // Préparer l'historique de conversation (sanitisé)
    const messages = conversationHistory
      .slice(-10) // Garder seulement les 10 derniers messages
      .map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: String(msg.content).substring(0, 5000) // Limiter la longueur
      }));

    // Ajouter le nouveau message
    messages.push({
      role: 'user',
      content: trimmedMessage
    });

    // Appeler l'API Claude avec timeout
    const apiCallPromise = anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages
    });

    // Timeout de 30 secondes
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout API Claude')), 30000)
    );

    const response = await Promise.race([apiCallPromise, timeoutPromise]);

    const aiResponse = response.content[0].text;

    // Logger l'interaction (optionnel - pour analytics)
    // Note: userId est hashé pour la confidentialité
    const crypto = require('crypto');
    const userIdHash = crypto.createHash('sha256').update(req.userProfile.uid).digest('hex').substring(0, 16);

    await db.ref(`universities/${req.userProfile.universityId}/aiAnalytics`).push({
      userIdHash: userIdHash, // Hash au lieu de l'UID en clair
      userRole: req.userProfile.role,
      timestamp: Date.now(),
      messageLength: trimmedMessage.length,
      responseLength: aiResponse.length,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens
    });

    res.json({
      response: aiResponse,
      usage: response.usage
    });

  } catch (error) {
    console.error('Chat error:', error);

    if (error.status === 429) {
      return res.status(429).json({ error: 'Limite d\'API atteinte, réessayez plus tard' });
    }

    res.status(500).json({ error: 'Erreur lors de la génération de la réponse' });
  }
});

// Middleware de gestion d'erreurs globale
app.use((err, req, res, next) => {
  // Logger l'erreur complète en dev
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  } else {
    // En production, logger uniquement le type et le message
    console.error(`Error [${err.name}]: ${err.message}`);
  }

  // Réponse générique en production
  const isDev = process.env.NODE_ENV === 'development';
  res.status(err.statusCode || 500).json({
    error: isDev ? err.message : 'Une erreur interne s\'est produite',
    ...(isDev && { stack: err.stack })
  });
});

// Health check (public - informations minimales)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      ai: !!process.env.ANTHROPIC_API_KEY,
      database: true
    }
  });
});

// Health check détaillé (authentifié - admin uniquement)
app.get('/api/health/detailed', authenticateUser, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (req.userProfile.role !== 'admin_universite' && req.userProfile.role !== 'super_admin_plateforme') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        anthropicApiConfigured: !!process.env.ANTHROPIC_API_KEY,
        firebaseConnected: true,
        firebaseProject: serviceAccount.project_id
      },
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du statut' });
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Backend IA démarré avec succès!');
  console.log('='.repeat(60));
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`📊 Rate limiting: ${process.env.RATE_LIMIT_MAX_REQUESTS || 10} requêtes par ${(process.env.RATE_LIMIT_WINDOW_MS || 60000) / 1000}s`);
  console.log(`🤖 API Claude: ✅ Configurée (${process.env.ANTHROPIC_API_KEY.substring(0, 20)}...)`);
  console.log(`🔥 Firebase: ✅ Projet ${serviceAccount.project_id}`);
  console.log(`🌍 CORS autorisé: ${process.env.ALLOWED_ORIGINS || 'http://localhost:5173'}`);
  console.log('='.repeat(60));
  console.log('💡 Endpoints disponibles:');
  console.log('   GET  /api/health       - Health check');
  console.log('   POST /api/ai/chat      - Chat avec l\'IA');
  console.log('='.repeat(60) + '\n');
});

module.exports = app;
