const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const serviceAccountPath = path.join(__dirname, 'service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.cert(serviceAccount),
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
});

const db = require('firebase-admin/database');
const database = db.getDatabase();

async function deployRules() {
  try {
    console.log('\n📋 Lecture des règles depuis database.rules.json...');

    const rulesPath = path.join(__dirname, '..', 'database.rules.json');
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');
    const rules = JSON.parse(rulesContent);

    console.log('✅ Règles chargées avec succès\n');
    console.log('⚠️  ATTENTION: Le déploiement des règles via Admin SDK n\'est pas supporté.');
    console.log('📝 Vous devez déployer manuellement via la console Firebase:\n');
    console.log('1. Ouvrez https://console.firebase.google.com');
    console.log('2. Sélectionnez votre projet');
    console.log('3. Allez dans "Realtime Database" → "Règles"');
    console.log('4. Copiez-collez le contenu de database.rules.json');
    console.log('5. Cliquez sur "Publier"\n');
    console.log('💡 OU utilisez Firebase CLI: firebase deploy --only database\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur:', err);
    process.exit(1);
  }
}

deployRules();
