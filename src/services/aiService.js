/**
 * aiService.js - Service pour communiquer avec le backend IA
 */

import { auth } from '../config/firebase';

// En production Vercel, utiliser les routes serverless /api/*
// En local, fallback vers localhost:3001 si backend Express est démarré
const API_URL = import.meta.env.VITE_APP_ENV === 'production'
  ? '' // Routes relatives /api/* sur Vercel
  : (import.meta.env.VITE_AI_API_URL || 'http://localhost:3001');

/**
 * Génère une réponse IA via le backend sécurisé
 * @param {string} message - Message de l'utilisateur
 * @param {Array} conversationHistory - Historique des messages
 * @returns {Promise<string>} - Réponse de l'IA
 */
export async function generateAIResponse(message, conversationHistory = []) {
  try {
    // Obtenir le token Firebase de l'utilisateur actuel
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    const token = await user.getIdToken();

    const response = await fetch(`${API_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message,
        conversationHistory
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erreur lors de la communication avec l\'IA');
    }

    const data = await response.json();
    return data.response;

  } catch (error) {
    console.error('AI Service Error:', error);

    // Messages d'erreur personnalisés
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Impossible de contacter le serveur IA. Vérifiez que le backend est démarré.');
    }

    throw error;
  }
}

/**
 * Vérifie la santé du service IA
 * @returns {Promise<Object>} - Statut du service
 */
export async function checkAIServiceHealth() {
  try {
    const response = await fetch(`${API_URL}/api/health`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Health check error:', error);
    return { status: 'error', error: error.message };
  }
}
