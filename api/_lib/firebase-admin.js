/**
 * Firebase Admin SDK - Singleton pour Vercel Serverless
 * Évite les réinitialisations multiples en environnement serverless
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

let firebaseApp;

export function getFirebaseAdmin() {
  if (!firebaseApp) {
    try {
      console.log('🔍 Debug admin:', typeof admin, admin ? Object.keys(admin).slice(0, 5) : 'undefined');
      console.log('🔍 Debug admin.credential:', typeof admin?.credential);
      // En production Vercel, utiliser les variables d'environnement
      const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined;

      const credential = privateKey
        ? admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: privateKey,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          })
        : admin.credential.applicationDefault(); // Fallback local

      firebaseApp = admin.initializeApp({
        credential,
        databaseURL: process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL,
      });

      console.log('✅ Firebase Admin initialized for project:', process.env.FIREBASE_PROJECT_ID);
    } catch (error) {
      // App déjà initialisée
      if (error.code === 'app/duplicate-app') {
        firebaseApp = admin.app();
      } else {
        console.error('❌ Firebase Admin init error:', error.message);
        throw error;
      }
    }
  }

  return firebaseApp;
}

export function getDatabase() {
  const app = getFirebaseAdmin();
  return app.database();
}

export function getAuth() {
  const app = getFirebaseAdmin();
  return app.auth();
}
