#!/usr/bin/env node

/**
 * Script pour corriger les données étudiant
 * Crée notes + paiements pour le studentId actuel
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get } from 'firebase/database';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

async function fixStudentData() {
  console.log('\n🔧 Correction des données étudiant...\n');

  // Se connecter avec le compte étudiant
  const userCredential = await signInWithEmailAndPassword(
    auth,
    'etudiant@sorbonne.fr',
    'Student123456'
  );

  const uid = userCredential.user.uid;
  console.log(`✅ Connecté avec UID: ${uid}`);

  // Récupérer le profil
  const userRef = ref(database, `users/${uid}`);
  const userSnap = await get(userRef);

  if (!userSnap.exists()) {
    console.error('❌ Profil utilisateur introuvable');
    process.exit(1);
  }

  const userProfile = userSnap.val();
  const studentId = userProfile.profileId || `student-${uid.substring(0, 8)}`;
  const uniId = userProfile.universityId;

  console.log(`📚 StudentId: ${studentId}`);
  console.log(`🏫 UniversityId: ${uniId}`);

  // Vérifier si le profil étudiant existe
  const studentRef = ref(database, `universities/${uniId}/students/${studentId}`);
  const studentSnap = await get(studentRef);

  if (!studentSnap.exists()) {
    console.log('⚠️  Profil étudiant manquant, création...');
    await set(studentRef, {
      firstName: 'Sophie',
      lastName: 'Leroux',
      email: 'etudiant@sorbonne.fr',
      matricule: '2026-SB-0001',
      dateOfBirth: new Date('2005-03-15').getTime(),
      gender: 'female',
      status: 'active',
      fieldOfStudy: 'computer-science',
      level: 'L1',
      enrollmentDate: Date.now(),
      absences: 2,
      createdAt: Date.now(),
    });
    console.log('✅ Profil étudiant créé');
  } else {
    console.log('✅ Profil étudiant existe');
  }

  // Créer les notes
  console.log('\n📝 Création des notes...');
  await set(ref(database, `universities/${uniId}/grades/${studentId}`), {
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
    'info-301': {
      assignments: [
        { name: 'TP Node.js', grade: 18, maxGrade: 20, coefficient: 1, date: Date.now() - 12 * 24 * 60 * 60 * 1000 },
        { name: 'TP React', grade: 19, maxGrade: 20, coefficient: 1, date: Date.now() - 8 * 24 * 60 * 60 * 1000 },
      ],
      exams: [
        { name: 'Examen Final', grade: 16, maxGrade: 20, coefficient: 3, date: Date.now() - 2 * 24 * 60 * 60 * 1000 },
      ],
      average: 17,
      letterGrade: 'A',
      status: 'published',
    },
  });
  console.log('✅ Notes créées (3 cours)');

  // Créer les paiements
  console.log('\n💰 Création des paiements...');
  await set(ref(database, `universities/${uniId}/payments/${studentId}`), {
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
  console.log('✅ Paiements créés');

  console.log('\n🎉 Données étudiant corrigées avec succès !');
  console.log(`\nReconnecte-toi avec etudiant@sorbonne.fr pour voir les données.\n`);

  process.exit(0);
}

fixStudentData().catch((error) => {
  console.error('\n❌ Erreur:', error);
  process.exit(1);
});
