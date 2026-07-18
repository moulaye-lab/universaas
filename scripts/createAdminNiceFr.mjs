/**
 * Script pour créer admin@nice.fr en production
 * Usage: node scripts/createAdminNiceFr.mjs
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get } from 'firebase/database';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n🚀 Création admin@nice.fr en Production\n');

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
  email: 'admin@nice.fr',
  password: 'Admin123456',
  role: 'admin_universite',
  universityId: 'univ-nice-sophia-2026',
  displayName: 'Admin Nice',
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
      phone: '+33 4 93 00 00 00',
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

    // Vérifier université
    const univRef = ref(database, `universities/${account.universityId}`);
    const univSnapshot = await get(univRef);

    if (univSnapshot.exists()) {
      console.log(`✅ Université existe déjà\n`);
    } else {
      console.log(`❌ Université n'existe pas!\n`);
    }

    // Déconnexion
    await signOut(auth);

    console.log('🎉 SUCCÈS !\n');
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

    process.exit(0);

  } catch (error) {
    console.error(`\n❌ ERREUR: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}\n`);

    if (error.code === 'auth/email-already-in-use') {
      console.log('💡 Le compte existe déjà !');
      console.log('   Vérifie dans Firebase Console:\n');
      console.log('   https://console.firebase.google.com/project/university-saas-7b31e/authentication/users\n');
    }

    process.exit(1);
  }
}

createAccount();
