/**
 * Script d'import des données de démo avec Firebase Client SDK
 * Usage: node scripts/seedDatabase.mjs
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, update } from 'firebase/database';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createInterface } from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n🚀 Import Automatique des Données Firebase\n');

// Charger la config depuis .env.local
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

  console.log('✅ Configuration Firebase chargée\n');
} catch (error) {
  console.error('❌ Erreur: fichier .env.local introuvable');
  process.exit(1);
}

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Charger les données
const seedDataPath = join(__dirname, '..', 'SEED_DATA.json');
const seedData = JSON.parse(readFileSync(seedDataPath, 'utf-8'));

// Interface pour demander email/password
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function importData() {
  try {
    console.log('🔐 Authentification requise pour importer les données\n');
    console.log('   Utilise ton compte Super Admin Firebase\n');

    const email = await question('   Email: ');
    const password = await question('   Mot de passe: ');

    console.log('\n   → Connexion en cours...');
    await signInWithEmailAndPassword(auth, email, password);
    console.log('   ✅ Connecté avec succès\n');

    console.log('📦 Import des données...\n');

    // Import platform analytics
    console.log('   → Analytics plateforme...');
    await update(ref(database, 'platform'), seedData.platform);
    console.log('   ✅ Analytics importées');

    // Import universities
    console.log('   → Universités...');
    await update(ref(database, 'universities'), seedData.universities);
    console.log('   ✅ Universités importées');

    console.log('\n🎉 IMPORT RÉUSSI !\n');
    console.log('📊 Données importées :');
    console.log(`   • ${Object.keys(seedData.universities).length} universités`);
    console.log(`   • Analytics plateforme complètes\n`);
    console.log('💡 Prochaine étape :');
    console.log('   Rafraîchis ton dashboard sur http://localhost:5173\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);

    if (error.code === 'auth/invalid-credential') {
      console.error('\n💡 Email ou mot de passe incorrect');
    } else if (error.code === 'PERMISSION_DENIED') {
      console.error('\n💡 Permissions Firebase insuffisantes');
      console.error('   Assure-toi que les règles Firebase sont déployées');
    }

    console.log('');
    process.exit(1);
  } finally {
    rl.close();
  }
}

importData();
