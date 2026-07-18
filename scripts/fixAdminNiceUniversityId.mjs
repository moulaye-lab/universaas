/**
 * Script pour corriger l'universityId de admin@nice.fr
 * Usage: node scripts/fixAdminNiceUniversityId.mjs
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, update, get } from 'firebase/database';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n🔧 Correction universityId pour admin@nice.fr\n');

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

  console.log('✅ Configuration chargée\n');
} catch (error) {
  console.error('❌ Erreur: .env.local introuvable');
  process.exit(1);
}

// Init Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const uid = 'yetxF049XFgATjEsOMhyEcUuTx12';
const oldUniversityId = 'univ-universite-nice-sophia-antipol-2026';
const newUniversityId = 'univ-nice-sophia-2026';

async function fixUniversityId() {
  try {
    console.log(`📋 UID: ${uid}`);
    console.log(`   Email: admin@nice.fr\n`);

    // Vérifier avant
    const userRef = ref(database, `users/${uid}`);
    const beforeSnap = await get(userRef);

    if (!beforeSnap.exists()) {
      console.error('❌ Utilisateur introuvable');
      process.exit(1);
    }

    const beforeData = beforeSnap.val();
    console.log(`📊 AVANT:`);
    console.log(`   universityId: ${beforeData.universityId}`);
    console.log(`   role: ${beforeData.role}\n`);

    // Mise à jour
    console.log(`🔧 Mise à jour...`);
    await update(userRef, {
      universityId: newUniversityId
    });

    console.log(`✅ Mise à jour effectuée\n`);

    // Vérifier après
    const afterSnap = await get(userRef);
    const afterData = afterSnap.val();

    console.log(`📊 APRÈS:`);
    console.log(`   universityId: ${afterData.universityId}`);
    console.log(`   role: ${afterData.role}\n`);

    if (afterData.universityId === newUniversityId) {
      console.log('🎉 SUCCÈS ! universityId corrigé\n');
      console.log('═══════════════════════════════════════════\n');
      console.log('📋 PROCHAINES ÉTAPES:\n');
      console.log('1. Vide le cache du navigateur:');
      console.log('   localStorage.clear();\n');
      console.log('2. Reconnecte-toi avec:');
      console.log('   Email: admin@nice.fr');
      console.log('   Password: 12345678 (ou Admin123456)\n');
      console.log('3. Réessaye de créer une classe\n');
      console.log('═══════════════════════════════════════════\n');
    } else {
      console.log('⚠️  La valeur n\'a pas changé!');
    }

    process.exit(0);

  } catch (error) {
    console.error(`\n❌ ERREUR: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

fixUniversityId();
