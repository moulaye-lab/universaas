#!/usr/bin/env node

/**
 * Script de migration: Ajouter academicYear à tous les étudiants existants
 *
 * Fonctionnalité:
 * - Récupère tous les étudiants de l'université
 * - Ajoute academicYear: "2025-2026" aux étudiants qui n'en ont pas
 * - Mode dry-run par défaut (lecture seule)
 * - Mode write avec confirmation
 *
 * Usage:
 * node scripts/addAcademicYearToStudents.mjs --dry-run  (lecture seule)
 * node scripts/addAcademicYearToStudents.mjs --write     (écriture réelle)
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, update } from 'firebase/database';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.local') });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Calculer l'année académique actuelle
function getCurrentAcademicYear() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = janvier

  if (currentMonth >= 8) { // Septembre à décembre
    return `${currentYear}-${currentYear + 1}`;
  } else { // Janvier à août
    return `${currentYear - 1}-${currentYear}`;
  }
}

// Fonction pour demander confirmation
function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'oui' || answer.toLowerCase() === 'o');
    });
  });
}

async function migrateStudents() {
  const isDryRun = !process.argv.includes('--write');
  const currentAcademicYear = getCurrentAcademicYear();

  console.log('\n🎓 MIGRATION: Ajout academicYear aux étudiants');
  console.log('================================================\n');
  console.log(`📅 Année académique actuelle: ${currentAcademicYear}`);
  console.log(`🔧 Mode: ${isDryRun ? '🔍 DRY-RUN (lecture seule)' : '✍️  WRITE (modification réelle)'}\n`);

  try {
    // Se connecter en tant qu'admin
    console.log('🔐 Connexion en tant qu\'admin...');

    // Credentials admin - À PERSONNALISER
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@universite-nice-sophia-antipol.fr';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminNice2026!';

    console.log(`   Email: ${adminEmail}`);

    const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    const adminUid = userCredential.user.uid;

    // Récupérer le profil admin
    const userRef = ref(database, `users/${adminUid}`);
    const userSnap = await get(userRef);

    if (!userSnap.exists()) {
      throw new Error('Profil admin introuvable');
    }

    const userProfile = userSnap.val();
    const universityId = userProfile.universityId;

    console.log(`✅ Connecté: ${userProfile.displayName}`);
    console.log(`🏛️  Université: ${universityId}\n`);

    // Récupérer tous les étudiants
    console.log('📥 Chargement des étudiants...');
    const studentsRef = ref(database, `universities/${universityId}/students`);
    const studentsSnap = await get(studentsRef);

    if (!studentsSnap.exists()) {
      console.log('❌ Aucun étudiant trouvé dans cette université.');
      return;
    }

    const studentsData = studentsSnap.val();
    const studentEntries = Object.entries(studentsData);
    console.log(`✅ ${studentEntries.length} étudiants trouvés\n`);

    // Filtrer les étudiants sans academicYear
    const studentsToMigrate = studentEntries.filter(([id, student]) => !student.academicYear);

    console.log('📊 ANALYSE:');
    console.log(`   - Étudiants avec academicYear: ${studentEntries.length - studentsToMigrate.length}`);
    console.log(`   - Étudiants SANS academicYear: ${studentsToMigrate.length}`);
    console.log(`   - Année à ajouter: ${currentAcademicYear}\n`);

    if (studentsToMigrate.length === 0) {
      console.log('✅ Tous les étudiants ont déjà un academicYear. Aucune migration nécessaire.');
      return;
    }

    // Afficher quelques exemples
    console.log('📝 Exemples d\'étudiants à migrer:');
    studentsToMigrate.slice(0, 5).forEach(([id, student]) => {
      console.log(`   - ${student.firstName} ${student.lastName} (${student.level}) - ${student.matricule}`);
    });
    if (studentsToMigrate.length > 5) {
      console.log(`   ... et ${studentsToMigrate.length - 5} autres\n`);
    } else {
      console.log('');
    }

    if (isDryRun) {
      console.log('🔍 MODE DRY-RUN: Aucune modification effectuée.');
      console.log('\n💡 Pour appliquer les modifications, exécutez:');
      console.log('   node scripts/addAcademicYearToStudents.mjs --write\n');
      return;
    }

    // Demander confirmation en mode write
    console.log('⚠️  ATTENTION: Vous êtes sur le point de modifier la base de données!');
    const confirmed = await askConfirmation(`\n❓ Voulez-vous ajouter academicYear="${currentAcademicYear}" à ${studentsToMigrate.length} étudiants? (oui/non): `);

    if (!confirmed) {
      console.log('\n❌ Migration annulée par l\'utilisateur.');
      return;
    }

    // Effectuer la migration
    console.log('\n🚀 Migration en cours...\n');
    let successCount = 0;
    let errorCount = 0;

    for (const [studentId, student] of studentsToMigrate) {
      try {
        const studentRef = ref(database, `universities/${universityId}/students/${studentId}`);
        await update(studentRef, {
          academicYear: currentAcademicYear,
          updatedAt: Date.now()
        });
        successCount++;
        console.log(`   ✅ ${student.firstName} ${student.lastName} (${student.matricule})`);
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Erreur pour ${student.firstName} ${student.lastName}:`, error.message);
      }
    }

    // Résumé final
    console.log('\n' + '='.repeat(50));
    console.log('✅ MIGRATION TERMINÉE');
    console.log('='.repeat(50));
    console.log(`✅ Réussies: ${successCount}/${studentsToMigrate.length}`);
    if (errorCount > 0) {
      console.log(`❌ Erreurs: ${errorCount}`);
    }
    console.log('');

  } catch (error) {
    console.error('\n❌ Erreur durant la migration:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

// Exécuter
migrateStudents();
