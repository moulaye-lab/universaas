/**
 * Middleware d'authentification Firebase pour Vercel Serverless Functions
 */

import { getAuth, getDatabase } from './firebase-admin.js';

export async function authenticateUser(req, res) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        error: true,
        status: 401,
        message: 'Token d\'authentification manquant'
      };
    }

    const token = authHeader.split('Bearer ')[1];
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);

    // Charger le profil utilisateur
    const db = getDatabase();
    const userSnapshot = await db.ref(`users/${decodedToken.uid}`).once('value');
    const userData = userSnapshot.val();

    if (!userData) {
      return {
        error: true,
        status: 404,
        message: 'Profil utilisateur non trouvé'
      };
    }

    return {
      error: false,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        ...userData
      }
    };
  } catch (error) {
    console.error('Auth error:', error.message);
    return {
      error: true,
      status: 403,
      message: 'Token invalide ou expiré'
    };
  }
}
