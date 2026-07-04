/**
 * Script d'import automatique des données de démo dans Firebase
 * Usage: node scripts/seedDatabase.js
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Démarrage de l\'import des données...\n');

// Charger les données de démo
const seedDataPath = join(__dirname, '..', 'SEED_DATA.json');
const seedData = JSON.parse(readFileSync(seedDataPath, 'utf-8'));

// Configuration Firebase depuis .env.local
const envPath = join(__dirname, '..', '.env.local');
let firebaseConfig = {};

try {
  const envContent = readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');

  lines.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      const cleanKey = key.trim();
      const cleanValue = value.trim();

      if (cleanKey === 'VITE_FIREBASE_DATABASE_URL') {
        // Enlever les guillemets si présents
        firebaseConfig.databaseURL = cleanValue.replace(/['"]/g, '');
      } else if (cleanKey === 'VITE_FIREBASE_PROJECT_ID') {
        firebaseConfig.projectId = cleanValue.replace(/['"]/g, '');
      }
    }
  });

  console.log('✅ Configuration Firebase chargée');
  console.log(`   Project ID: ${firebaseConfig.projectId}`);
  console.log(`   Database URL: ${firebaseConfig.databaseURL}\n`);

} catch (error) {
  console.error('❌ Erreur lors de la lecture de .env.local');
  console.error('   Assure-toi que le fichier .env.local existe avec tes credentials Firebase\n');
  process.exit(1);
}

// Note: Firebase Admin nécessite un service account pour l'authentification
// Pour simplifier, on va utiliser l'API REST de Firebase directement
async function importViaREST() {
  const databaseURL = firebaseConfig.databaseURL;

  if (!databaseURL) {
    console.error('❌ VITE_FIREBASE_DATABASE_URL non trouvée dans .env.local');
    process.exit(1);
  }

  console.log('📦 Import des données via API REST Firebase...\n');

  try {
    // Import platform analytics
    console.log('   → Import des analytics plateforme...');
    const platformResponse = await fetch(`${databaseURL}/platform.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(seedData.platform)
    });

    if (!platformResponse.ok) {
      throw new Error(`Erreur platform: ${platformResponse.status}`);
    }
    console.log('   ✅ Analytics plateforme importées');

    // Import universities
    console.log('   → Import des universités...');
    const universitiesResponse = await fetch(`${databaseURL}/universities.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(seedData.universities)
    });

    if (!universitiesResponse.ok) {
      throw new Error(`Erreur universities: ${universitiesResponse.status}`);
    }
    console.log('   ✅ Universités importées');

    console.log('\n🎉 IMPORT RÉUSSI !\n');
    console.log('📊 Données importées :');
    console.log(`   • ${Object.keys(seedData.universities).length} universités`);
    console.log(`   • Stats plateforme complètes`);
    console.log('\n💡 Prochaine étape :');
    console.log('   Rafraîchis ton dashboard sur http://localhost:5173\n');

  } catch (error) {
    console.error('\n❌ ERREUR lors de l\'import :', error.message);
    console.error('\n💡 Vérifications :');
    console.error('   1. Les règles Firebase autorisent-elles les écritures ?');
    console.error('   2. L\'URL de la database est-elle correcte ?');
    console.error('   3. Le projet Firebase est-il actif ?\n');
    process.exit(1);
  }
}

// Lancer l'import
importViaREST();
