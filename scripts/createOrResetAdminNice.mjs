/**
 * Script pour créer admin@nice.fr OU récupérer son UID si existe
 * Usage: node scripts/createOrResetAdminNice.mjs
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n🔧 Création/Récupération admin@nice.fr\n');

// Charger la config depuis .env.local
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

  console.log(`✅ Project: ${config.projectId}\n`);
} catch (error) {
  console.error('❌ Erreur: .env.local introuvable');
  process.exit(1);
}

// Init Firebase Admin avec Application Default Credentials
try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: config.databaseURL,
  });
  console.log('✅ Firebase Admin initialisé\n');
} catch (error) {
  console.error('❌ Erreur init:', error.message);
  process.exit(1);
}

const auth = admin.auth();
const db = admin.database();

async function createOrGetAdmin() {
  const email = 'admin@nice.fr';
  const password = 'Admin123456';
  const universityId = 'univ-nice-2026';

  try {
    // Essayer de récupérer l'utilisateur existant
    console.log(`🔍 Recherche de ${email}...`);

    let user;
    try {
      user = await auth.getUserByEmail(email);
      console.log(`✅ Compte trouvé!`);
      console.log(`   UID: ${user.uid}`);
      console.log(`   Créé: ${new Date(user.metadata.creationTime).toLocaleDateString()}\n`);

      // Mettre à jour le mot de passe
      console.log(`🔑 Mise à jour du mot de passe...`);
      await auth.updateUser(user.uid, { password });
      console.log(`✅ Mot de passe mis à jour: ${password}\n`);

    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Créer le compte
        console.log(`📧 Création du compte...`);
        user = await auth.createUser({
          email,
          password,
          displayName: 'Admin Nice',
        });
        console.log(`✅ Compte créé!`);
        console.log(`   UID: ${user.uid}\n`);
      } else {
        throw error;
      }
    }

    // Créer/Mettre à jour le profil dans Database
    console.log(`💾 Mise à jour du profil...`);
    const userProfile = {
      email,
      universityId,
      role: 'admin_universite',
      displayName: 'Admin Nice',
      firstName: 'Admin',
      lastName: 'Nice',
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

    await db.ref(`users/${user.uid}`).set(userProfile);
    console.log(`✅ Profil créé dans /users/${user.uid}\n`);

    // Créer l'université si nécessaire
    const univRef = db.ref(`universities/${universityId}`);
    const univSnapshot = await univRef.once('value');

    if (!univSnapshot.exists()) {
      console.log(`🏛️  Création de l'université...`);
      await univRef.set({
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
        subscriptionExpiry: Date.now() + 365 * 24 * 60 * 60 * 1000,
        createdAt: Date.now(),
        createdBy: user.uid,
      });
      console.log(`✅ Université créée\n`);
    } else {
      console.log(`✅ Université existe déjà\n`);
    }

    // Résumé
    console.log('🎉 SUCCÈS !\n');
    console.log('📋 INFORMATIONS DE CONNEXION:\n');
    console.log(`   Email    : ${email}`);
    console.log(`   Password : ${password}`);
    console.log(`   Rôle     : admin_universite`);
    console.log(`   UID      : ${user.uid}\n`);
    console.log('💡 Connexion sur:');
    console.log('   🌐 Production: https://university-saas.vercel.app/login');
    console.log('   💻 Local     : http://localhost:5173/login\n');

    process.exit(0);

  } catch (error) {
    console.error(`\n❌ ERREUR: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

createOrGetAdmin();
