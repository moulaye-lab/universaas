/**
 * Script simple pour créer admin-nice@universaas.com en production
 * Usage: node scripts/createAdminNiceSimple.mjs
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n🚀 Création Admin Nice en Production\n');

// Charger config Firebase
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

  console.log('✅ Configuration chargée');
  console.log(`   Project: ${firebaseConfig.projectId}\n`);
} catch (error) {
  console.error('❌ Erreur: .env.local introuvable');
  process.exit(1);
}

// Init Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Compte à créer
const account = {
  email: 'admin-nice@universaas.com',
  password: 'NiceAdmin2026!',
  role: 'admin_universite',
  universityId: 'univ-nice-sophia-2026',
  displayName: 'Admin Nice Sophia Antipolis',
  firstName: 'Admin',
  lastName: 'Nice',
};

async function createAccount() {
  try {
    console.log(`📧 Création: ${account.email}`);
    console.log(`   Rôle: ${account.role}`);
    console.log(`   Université: ${account.universityId}\n`);

    // Créer compte Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      account.email,
      account.password
    );
    const uid = userCredential.user.uid;

    console.log(`✅ Compte Auth créé`);
    console.log(`   UID: ${uid}\n`);

    // Créer profil dans /users
    const userProfile = {
      email: account.email,
      universityId: account.universityId,
      role: account.role,
      displayName: account.displayName,
      firstName: account.firstName,
      lastName: account.lastName,
      phone: '+33 4 93 13 75 00',
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

    // Vérifier si l'université existe
    const univRef = ref(database, `universities/${account.universityId}`);
    const { get } = await import('firebase/database');
    const univSnapshot = await get(univRef);

    if (!univSnapshot.exists()) {
      console.log(`🏛️  Création université ${account.universityId}...`);
      await set(univRef, {
        name: 'Université Nice Sophia Antipolis',
        code: 'NICE',
        country: 'France',
        city: 'Nice',
        address: '28 Avenue Valrose, 06100 Nice',
        email: 'contact@unice.fr',
        phone: '+33 4 93 13 75 00',
        website: 'https://univ-cotedazur.fr',
        logo: '',
        status: 'active',
        subscriptionPlan: 'premium',
        subscriptionExpiry: Date.now() + 365 * 24 * 60 * 60 * 1000,
        createdAt: Date.now(),
        createdBy: uid,
      });
      console.log(`✅ Université créée\n`);
    } else {
      console.log(`✅ Université existe déjà\n`);
    }

    // Déconnexion
    await signOut(auth);

    console.log('🎉 SUCCÈS COMPLET !\n');
    console.log('═══════════════════════════════════════════\n');
    console.log('📋 INFORMATIONS DE CONNEXION:\n');
    console.log(`   📧 Email    : ${account.email}`);
    console.log(`   🔑 Password : ${account.password}`);
    console.log(`   👤 Rôle     : Admin Université`);
    console.log(`   🏛️  Univ ID  : ${account.universityId}`);
    console.log(`   🆔 UID      : ${uid}\n`);
    console.log('═══════════════════════════════════════════\n');
    console.log('💡 Connecte-toi sur:\n');
    console.log('   🌐 PRODUCTION : https://university-saas.vercel.app/login');
    console.log('   💻 LOCAL      : http://localhost:5173/login\n');
    console.log('⚠️  IMPORTANT: Sauvegarde ces identifiants !\n');

    process.exit(0);

  } catch (error) {
    console.error(`\n❌ ERREUR: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}\n`);

    if (error.code === 'auth/email-already-in-use') {
      console.log('💡 Le compte existe déjà !');
      console.log('   Essaie de te connecter ou utilise Firebase Console pour reset le mot de passe.\n');
    }

    process.exit(1);
  }
}

createAccount();
