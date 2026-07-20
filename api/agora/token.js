/**
 * Vercel Serverless Function - Agora Token Generator
 * Route: /api/agora/token
 *
 * Génère des tokens Agora sécurisés pour les sessions live
 */

import pkg from 'agora-token';
const { RtcTokenBuilder, RtcRole } = pkg;
import { authenticateUser } from '../_lib/auth-middleware.js';

// Configuration Agora depuis variables d'environnement
const AGORA_APP_ID = process.env.VITE_AGORA_APP_ID;
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

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

    // Validation des paramètres
    const { channelName, uid, role } = req.body;

    if (!channelName || !uid) {
      return res.status(400).json({
        error: 'Missing required parameters: channelName, uid'
      });
    }

    if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
      return res.status(500).json({
        error: 'Agora credentials not configured on server'
      });
    }

    // Déterminer le rôle Agora
    const agoraRole = role === 'host' || userProfile.role === 'teacher' || userProfile.role === 'admin_universite'
      ? RtcRole.PUBLISHER // Peut publier audio/vidéo
      : RtcRole.SUBSCRIBER; // Peut seulement recevoir

    // Durée de validité du token : 24 heures
    const expirationTimeInSeconds = 86400;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Générer le token
    const token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      uid,
      agoraRole,
      privilegeExpiredTs
    );

    console.log('✅ Token generated for:', {
      channelName,
      uid,
      role: agoraRole === RtcRole.PUBLISHER ? 'PUBLISHER' : 'SUBSCRIBER',
      userRole: userProfile.role,
      expiresIn: expirationTimeInSeconds
    });

    return res.status(200).json({
      token,
      appId: AGORA_APP_ID,
      channelName,
      uid,
      expiresAt: privilegeExpiredTs
    });

  } catch (error) {
    console.error('❌ Token generation error:', error);
    return res.status(500).json({
      error: 'Failed to generate token',
      message: error.message
    });
  }
}
