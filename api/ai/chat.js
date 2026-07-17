/**
 * Vercel Serverless Function - Assistant IA Chat
 * Route: /api/ai/chat
 */

import Anthropic from '@anthropic-ai/sdk';
import { authenticateUser } from '../_lib/auth-middleware.js';
import { getDatabase } from '../_lib/firebase-admin.js';
import crypto from 'crypto';

// Initialiser Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Rate limiter en mémoire (réinitialisé à chaque cold start)
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

function detectPromptInjection(message) {
  const suspiciousPatterns = [
    /ignore\s+(previous|all|above)\s+instructions?/i,
    /you\s+are\s+now/i,
    /system\s*:/i,
    /forget\s+(everything|all|that)/i,
    /###\s*instruction/i,
    /pretend\s+(you|to\s+be)/i
  ];
  return suspiciousPatterns.some(pattern => pattern.test(message));
}

function validateInput(message, conversationHistory) {
  const errors = [];

  if (!message || typeof message !== 'string') {
    errors.push('Message invalide');
  } else {
    const trimmed = message.trim();
    if (trimmed.length === 0) errors.push('Le message ne peut pas être vide');
    if (trimmed.length > 2000) errors.push('Message trop long (max 2000 caractères)');
    if (detectPromptInjection(trimmed)) errors.push('Contenu suspect détecté');
  }

  if (!Array.isArray(conversationHistory)) {
    errors.push('L\'historique doit être un tableau');
  } else if (conversationHistory.length > 20) {
    errors.push('Historique trop long (max 20 messages)');
  }

  return { valid: errors.length === 0, errors };
}

function buildSystemPrompt(aiSettings, userProfile) {
  const personalityPrompts = {
    professional: 'Tu es un assistant professionnel et formel.',
    friendly: 'Tu es un assistant chaleureux et encourageant.',
    concise: 'Tu es direct et efficace.'
  };

  const roleContext = {
    student: 'Tu aides un étudiant avec ses cours, notes, emploi du temps.',
    teacher: 'Tu assistes un enseignant dans la gestion de ses cours.',
    admin_universite: 'Tu aides un administrateur universitaire.',
    parent: 'Tu aides un parent à suivre la scolarité de son enfant.',
    comptable: 'Tu aides avec la gestion financière.'
  };

  return `Tu es ${aiSettings.aiAssistantName || 'Assistant Académique'}, l'assistant virtuel de l'université.

${personalityPrompts[aiSettings.aiPersonality] || personalityPrompts.professional}
${roleContext[userProfile.role] || ''}

Rôle de l'utilisateur: ${userProfile.role}
Nom: ${userProfile.displayName}

Tu dois:
- Répondre en français de manière claire
- Être précis et factuel
- Ne jamais inventer d'informations
- Dire "Je ne sais pas" si tu n'as pas l'information`;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authentification
    const authResult = await authenticateUser(req, res);
    if (authResult.error) {
      return res.status(authResult.status).json({ error: authResult.message });
    }

    const userProfile = authResult.user;

    // Rate limiting
    const limiter = getUserRateLimiter(userProfile.uid);
    const now = Date.now();

    if (now > limiter.resetAt) {
      limiter.count = 0;
      limiter.resetAt = now + 60000;
    }

    if (limiter.count >= 10) {
      return res.status(429).json({
        error: 'Limite de requêtes atteinte',
        retryAfter: Math.ceil((limiter.resetAt - now) / 1000)
      });
    }

    limiter.count++;

    // Charger paramètres IA
    const db = getDatabase();
    const universitySnapshot = await db.ref(`universities/${userProfile.universityId}`).once('value');
    const universityData = universitySnapshot.val();

    if (!universityData) {
      return res.status(404).json({ error: 'Université non trouvée' });
    }

    const aiSettings = {
      aiEnabled: universityData.aiEnabled !== undefined ? universityData.aiEnabled : true,
      aiAssistantName: universityData.aiAssistantName || 'Assistant Académique',
      aiPersonality: universityData.aiPersonality || 'professional',
      aiFeatures: universityData.aiFeatures || {}
    };

    if (!aiSettings.aiEnabled) {
      return res.status(403).json({ error: 'L\'assistant IA n\'est pas activé' });
    }

    // Validation
    const { message, conversationHistory = [] } = req.body;
    const validation = validateInput(message, conversationHistory);

    if (!validation.valid) {
      return res.status(400).json({ error: 'Données invalides', details: validation.errors });
    }

    const trimmedMessage = message.trim();

    // Construire prompt
    const systemPrompt = buildSystemPrompt(aiSettings, userProfile);

    // Préparer messages
    const messages = conversationHistory
      .slice(-10)
      .map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: String(msg.content).substring(0, 5000)
      }));

    messages.push({
      role: 'user',
      content: trimmedMessage
    });

    // Appel API Claude avec timeout
    const apiCallPromise = anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 28000) // 28s (Vercel limit 30s)
    );

    const response = await Promise.race([apiCallPromise, timeoutPromise]);
    const aiResponse = response.content[0].text;

    // Analytics (anonymisé)
    const userIdHash = crypto.createHash('sha256').update(userProfile.uid).digest('hex').substring(0, 16);

    await db.ref(`universities/${userProfile.universityId}/aiAnalytics`).push({
      userIdHash,
      userRole: userProfile.role,
      timestamp: Date.now(),
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens
    });

    res.status(200).json({
      response: aiResponse,
      usage: response.usage
    });

  } catch (error) {
    console.error('Chat error:', error.message);

    if (error.status === 429) {
      return res.status(429).json({ error: 'Limite d\'API atteinte' });
    }

    res.status(500).json({ error: 'Erreur lors de la génération de la réponse' });
  }
}
