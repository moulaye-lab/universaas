/**
 * middleware/auth.js - Middleware d'authentification réutilisable
 */

const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');

const db = getDatabase();

/**
 * Middleware pour vérifier le token Firebase et charger le profil utilisateur
 */
async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
      return res.status(404).json({ error: 'Profil utilisateur non trouvé' });
    }

    req.user = {
      ...req.user,
      ...userData
    };

    next();
  } catch (error) {
    console.error('Authentication failed:', error);
    return res.status(403).json({ error: 'Token invalide ou expiré' });
  }
}

module.exports = { verifyToken };
