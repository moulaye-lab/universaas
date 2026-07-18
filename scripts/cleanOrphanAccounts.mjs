/**
 * Script pour nettoyer les comptes orphelins (Auth sans Database)
 * Usage: node scripts/cleanOrphanAccounts.mjs
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n🧹 Nettoyage des comptes orphelins\n');

// Charger config
const envPath = join(__dirname, '..', '.env.local');
let config = {};

try {
  const envContent = readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');

  lines.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      const cleanKey = key.trim();
      const cleanValue = value.trim().replace(/['"]/g, '');
      if (cleanKey === 'VITE_FIREBASE_PROJECT_ID') config.projectId = cleanValue;
      if (cleanKey === 'VITE_FIREBASE_DATABASE_URL') config.databaseURL = cleanValue;
    }
  });
} catch (error) {
  console.error('❌ Erreur: .env.local introuvable');
  process.exit(1);
}

// Init Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: config.databaseURL,
  });
} catch (error) {
  if (error.code !== 'app/duplicate-app') {
    console.error('❌ Erreur init:', error.message);
    process.exit(1);
  }
}

const auth = admin.auth();
const db = admin.database();

// Comptes orphelins connus
const orphans = [
  { uid: 'TRSE7SZgmBbo5wmObuj1eMiOUfE3', email: 'ens2@nice.fr' },
  { uid: 'Rg3VpdHQzNNVA0rZkGROYR2R3I33', email: 'ens9@nice.fr' },
];

async function cleanOrphans() {
  console.log(`📋 ${orphans.length} comptes orphelins à nettoyer\n`);

  for (const orphan of orphans) {
    try {
      console.log(`🗑️  ${orphan.email} (${orphan.uid})`);

      // Supprimer de Auth
      await auth.deleteUser(orphan.uid);
      console.log(`   ✅ Supprimé de Firebase Auth\n`);

    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`   ⚠️  Déjà supprimé\n`);
      } else {
        console.log(`   ❌ Erreur: ${error.message}\n`);
      }
    }
  }

  console.log('✅ Nettoyage terminé\n');
  process.exit(0);
}

cleanOrphans();
