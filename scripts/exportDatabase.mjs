/**
 * Script d'export de la base Firebase Realtime Database
 * Usage: node scripts/exportDatabase.mjs
 *
 * Export toutes les données vers un fichier JSON
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n📦 Export de la Base Firebase Realtime Database\n');

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

async function exportDatabase() {
  try {
    console.log('📥 Récupération des données...\n');

    // Récupérer toute la racine
    const rootRef = ref(database, '/');
    const snapshot = await get(rootRef);

    if (!snapshot.exists()) {
      console.log('⚠️  Base de données vide');
      process.exit(0);
    }

    const data = snapshot.val();

    // Statistiques
    const stats = {
      users: Object.keys(data.users || {}).length,
      universities: Object.keys(data.universities || {}).length,
    };

    // Compter les collections dans chaque université
    if (data.universities) {
      Object.keys(data.universities).forEach(univId => {
        const univ = data.universities[univId];
        console.log(`\n🏛️  Université: ${univ.name || univId}`);
        console.log(`   ID: ${univId}`);
        console.log(`   Étudiants: ${Object.keys(univ.students || {}).length}`);
        console.log(`   Enseignants: ${Object.keys(univ.teachers || {}).length}`);
        console.log(`   Classes: ${Object.keys(univ.classes || {}).length}`);
        console.log(`   Matières: ${Object.keys(univ.subjects || {}).length}`);
        console.log(`   Notes: ${Object.keys(univ.grades || {}).length}`);
        console.log(`   Paiements: ${Object.keys(univ.payments || {}).length}`);
      });
    }

    console.log(`\n📊 Statistiques Globales:`);
    console.log(`   Utilisateurs: ${stats.users}`);
    console.log(`   Universités: ${stats.universities}\n`);

    // Sauvegarder dans un fichier JSON
    const outputPath = join(__dirname, '..', 'database-export.json');
    writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');

    console.log(`✅ Export réussi !`);
    console.log(`   Fichier: database-export.json`);
    console.log(`   Taille: ${(JSON.stringify(data).length / 1024).toFixed(2)} KB\n`);

    console.log('💡 PROCHAINES ÉTAPES:');
    console.log('   1. Vérifie le fichier database-export.json');
    console.log('   2. Utilise Firebase Console pour importer');
    console.log('   3. Ou utilise le script importDatabase.mjs\n');

    process.exit(0);

  } catch (error) {
    console.error(`\n❌ ERREUR: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

exportDatabase();
