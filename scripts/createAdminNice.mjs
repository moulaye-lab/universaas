/**
 * Script de création du compte admin@nice.fr en production
 * Usage: node scripts/createAdminNice.mjs
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n🚀 Création du compte admin@nice.fr en Production\n');

// Charger la config Firebase depuis .env.local
const envPath = join(__dirname, '..', '.env.local');
let firebaseConfig = {};

try {
  const envContent = readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');

  lines.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      const cleanKey = key.trim();
      const cleanValue = value.trim().replace(/['"]/g, '');

      const mapping = {
        'VITE_FIREBASE_API_KEY': 'apiKey',
        'VITE_FIREBASE_AUTH_DOMAIN': 'authDomain',
        'VITE_FIREBASE_DATABASE_URL': 'databaseURL',
        'VITE_FIREBASE_PROJECT_ID': 'projectId',
        'VITE_FIREBASE_STORAGE_BUCKET': 'storageBucket',
        'VITE_FIREBASE_MESSAGING_SENDER_ID': 'messagingSenderId',
        'VITE_FIREBASE_APP_ID': 'appId',
      };

      if (mapping[cleanKey]) {
        firebaseConfig[mapping[cleanKey]] = cleanValue;
      }
    }
  });

  console.log('✅ Configuration Firebase chargée');
  console.log(`   Project ID: ${firebaseConfig.projectId}\n`);
} catch (error) {
  console.error('❌ Erreur: fichier .env.local introuvable');
  process.exit(1);
}

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Données du compte à créer
const account = {
  email: 'admin@nice.fr',
  password: 'Admin123456', // Change ce password si tu veux
  role: 'admin_universite',
  universityId: 'univ-nice-2026',
  displayName: 'Admin Nice',
  firstName: 'Admin',
  lastName: 'Nice',
  phone: '+33 4 93 00 00 00',
};

async function createAdminAccount() {
  try {
    console.log(`📧 Création du compte: ${account.email}`);
    console.log(`   Rôle: ${account.role}`);
    console.log(`   Université: ${account.universityId}\n`);

    // Créer le compte Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      account.email,
      account.password
    );
    const uid = userCredential.user.uid;

    console.log(`✅ Compte Auth créé`);
    console.log(`   UID: ${uid}\n`);

    // Créer le profil dans /users
    const userProfile = {
      email: account.email,
      universityId: account.universityId,
      role: account.role,
      displayName: account.displayName,
      firstName: account.firstName,
      lastName: account.lastName,
      phone: account.phone,
      createdAt: Date.now(),
      lastLogin: Date.now(),
      preferences: {
        language: 'fr',
        theme: 'light',
        notifications: true,
      },
      rgpdConsent: true,
      rgpdConsentDate: Date.now(),
    };

    await set(ref(database, `users/${uid}`), userProfile);
    console.log(`✅ Profil créé dans /users/${uid}\n`);

    // Créer l'université si elle n'existe pas
    await set(ref(database, `universities/${account.universityId}`), {
      name: 'Université de Nice',
      code: 'NICE',
      country: 'France',
      city: 'Nice',
      address: 'Nice, France',
      email: 'contact@nice.fr',
      phone: '+33 4 93 00 00 00',
      website: 'https://nice.fr',
      logo: '',
      status: 'active',
      subscriptionPlan: 'premium',
      subscriptionExpiry: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 an
      createdAt: Date.now(),
      createdBy: uid,
    });
    console.log(`✅ Université créée: ${account.universityId}\n`);

    // Déconnexion
    await signOut(auth);

    console.log('🎉 SUCCÈS !\n');
    console.log('📋 INFORMATIONS DE CONNEXION:\n');
    console.log(`   Email     : ${account.email}`);
    console.log(`   Password  : ${account.password}`);
    console.log(`   Rôle      : ${account.role}`);
    console.log(`   Université: ${account.universityId}\n`);
    console.log('💡 Tu peux maintenant te connecter sur:');
    console.log('   🌐 Production : https://university-saas.vercel.app/login');
    console.log('   💻 Local      : http://localhost:5173/login\n');

    process.exit(0);

  } catch (error) {
    console.error(`\n❌ ERREUR: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}\n`);

    if (error.code === 'auth/email-already-in-use') {
      console.log('💡 Le compte existe déjà en production !');
      console.log('\n🔧 SOLUTIONS:');
      console.log('   1. Utilise Firebase Console pour reset le mot de passe:');
      console.log('      https://console.firebase.google.com/project/university-saas-7b31e/authentication/users');
      console.log('   2. Trouve le compte, clique sur ⋮ → Reset password');
      console.log('   3. Définis le nouveau mot de passe: Admin123456\n');
    }

    process.exit(1);
  }
}

createAdminAccount();
