/**
 * Script de création automatique de comptes de test pour tous les rôles
 * Usage: node scripts/createTestAccounts.mjs
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n🚀 Création Automatique des Comptes de Test\n');

// Charger la config Firebase
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

// Comptes à créer
const testAccounts = [
  {
    email: 'admin@sorbonne.fr',
    password: 'Admin123456',
    role: 'admin_universite',
    universityId: 'univ-sorbonne-2026',
    displayName: 'Admin Sorbonne',
    profileData: {
      firstName: 'Marie',
      lastName: 'Dubois',
      phone: '+33 1 23 45 67 89',
    }
  },
  {
    email: 'prof@sorbonne.fr',
    password: 'Prof123456',
    role: 'teacher',
    universityId: 'univ-sorbonne-2026',
    displayName: 'Prof. Martin',
    profileData: {
      firstName: 'Jean',
      lastName: 'Martin',
      specializations: ['Mathématiques', 'Physique'],
      courses: ['math-101', 'phys-201'],
      weeklyHours: 20,
      hireDate: Date.now(),
    }
  },
  {
    email: 'etudiant@sorbonne.fr',
    password: 'Student123456',
    role: 'student',
    universityId: 'univ-sorbonne-2026',
    displayName: 'Sophie Leroux',
    profileData: {
      firstName: 'Sophie',
      lastName: 'Leroux',
      matricule: '2026-SB-0001',
      dateOfBirth: new Date('2005-03-15').getTime(),
      gender: 'female',
      status: 'active',
      fieldOfStudy: 'computer-science',
      level: 'L1',
      enrollmentDate: Date.now(),
    }
  },
  {
    email: 'parent@sorbonne.fr',
    password: 'Parent123456',
    role: 'parent',
    universityId: 'univ-sorbonne-2026',
    displayName: 'Mr. Leroux',
    profileData: {
      firstName: 'Pierre',
      lastName: 'Leroux',
      children: ['student-sophie-001'], // ID de l'étudiant Sophie
      phone: '+33 6 12 34 56 78',
    }
  },
];

async function createAccount(account) {
  try {
    console.log(`\n📧 Création du compte: ${account.email}`);
    console.log(`   Rôle: ${account.role}`);

    // Créer le compte Firebase Auth
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, account.email, account.password);
      console.log(`   ✅ Compte Auth créé (UID: ${userCredential.user.uid})`);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`   ⚠️  Compte existe déjà, connexion...`);
        userCredential = await signInWithEmailAndPassword(auth, account.email, account.password);
      } else {
        throw error;
      }
    }

    const uid = userCredential.user.uid;

    // Créer le profil dans /users
    const userProfile = {
      email: account.email,
      universityId: account.universityId,
      role: account.role,
      displayName: account.displayName,
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

    // Ajouter profileId selon le rôle
    if (account.role === 'student') {
      userProfile.profileId = `student-${uid.substring(0, 8)}`;
    } else if (account.role === 'teacher') {
      userProfile.profileId = `teacher-${uid.substring(0, 8)}`;
    } else if (account.role === 'parent') {
      userProfile.children = account.profileData.children;
    }

    await set(ref(database, `users/${uid}`), userProfile);
    console.log(`   ✅ Profil créé dans /users/${uid}`);

    // Créer le profil détaillé selon le rôle
    if (account.role === 'student') {
      const studentId = userProfile.profileId;
      await set(ref(database, `universities/${account.universityId}/students/${studentId}`), {
        ...account.profileData,
        email: account.email,
        createdAt: Date.now(),
      });
      console.log(`   ✅ Profil étudiant créé dans /universities/${account.universityId}/students/${studentId}`);

      // Créer des notes de démo
      await set(ref(database, `universities/${account.universityId}/grades/${studentId}`), {
        'math-101': {
          assignments: [
            { name: 'Devoir 1', grade: 15, maxGrade: 20, coefficient: 1, date: Date.now() - 7 * 24 * 60 * 60 * 1000 },
            { name: 'Devoir 2', grade: 17, maxGrade: 20, coefficient: 1, date: Date.now() - 3 * 24 * 60 * 60 * 1000 },
          ],
          exams: [
            { name: 'Partiel', grade: 14, maxGrade: 20, coefficient: 2, date: Date.now() - 14 * 24 * 60 * 60 * 1000 },
          ],
          projects: [
            { name: 'Projet Final', grade: 16, maxGrade: 20, coefficient: 3, date: Date.now() - 30 * 24 * 60 * 60 * 1000 },
          ],
          average: 15.2,
          letterGrade: 'B',
          status: 'published',
          publishedAt: Date.now(),
        },
        'phys-201': {
          assignments: [
            { name: 'TP 1', grade: 13, maxGrade: 20, coefficient: 1, date: Date.now() - 10 * 24 * 60 * 60 * 1000 },
          ],
          exams: [
            { name: 'Contrôle', grade: 12, maxGrade: 20, coefficient: 2, date: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          ],
          average: 12.3,
          letterGrade: 'C',
          status: 'published',
        },
      });
      console.log(`   ✅ Notes de démo créées`);

      // Créer un paiement de démo
      await set(ref(database, `universities/${account.universityId}/payments/${studentId}`), {
        academicYear: '2025-2026',
        tuitionFee: 3000,
        paidAmount: 1500,
        remainingAmount: 1500,
        currency: 'EUR',
        status: 'partial',
        installments: [
          {
            amount: 1000,
            dueDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
            status: 'paid',
            paidAt: Date.now() - 32 * 24 * 60 * 60 * 1000,
            method: 'card',
            receiptId: 'REC-2026-001',
          },
          {
            amount: 500,
            dueDate: Date.now() - 1 * 24 * 60 * 60 * 1000,
            status: 'paid',
            paidAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
            method: 'bank_transfer',
            receiptId: 'REC-2026-002',
          },
          {
            amount: 1500,
            dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
            status: 'pending',
          },
        ],
        createdAt: Date.now(),
      });
      console.log(`   ✅ Paiement de démo créé`);

    } else if (account.role === 'teacher') {
      const teacherId = userProfile.profileId;
      await set(ref(database, `universities/${account.universityId}/teachers/${teacherId}`), {
        ...account.profileData,
        email: account.email,
        employeeId: `EMP-${uid.substring(0, 6).toUpperCase()}`,
        status: 'active',
        createdAt: Date.now(),
      });
      console.log(`   ✅ Profil enseignant créé dans /universities/${account.universityId}/teachers/${teacherId}`);
    }

    // Déconnexion pour créer le compte suivant
    await signOut(auth);

    return true;
  } catch (error) {
    console.error(`   ❌ Erreur: ${error.message}`);
    return false;
  }
}

async function createAllAccounts() {
  let successCount = 0;
  let failCount = 0;

  for (const account of testAccounts) {
    const success = await createAccount(account);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n\n🎉 RÉSUMÉ\n');
  console.log(`✅ Comptes créés avec succès: ${successCount}`);
  if (failCount > 0) {
    console.log(`❌ Échecs: ${failCount}`);
  }

  console.log('\n📋 COMPTES DE TEST DISPONIBLES:\n');
  testAccounts.forEach(account => {
    console.log(`   ${account.role.toUpperCase()}`);
    console.log(`   📧 Email: ${account.email}`);
    console.log(`   🔑 Mot de passe: ${account.password}`);
    console.log(`   🏛️  Université: ${account.universityId}`);
    console.log('');
  });

  console.log('💡 PROCHAINE ÉTAPE:');
  console.log('   Connecte-toi sur http://localhost:5173/login avec un de ces comptes\n');

  process.exit(0);
}

createAllAccounts();
