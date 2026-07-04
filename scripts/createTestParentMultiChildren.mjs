#!/usr/bin/env node

/**
 * Script pour créer un parent avec plusieurs enfants dans plusieurs universités
 * Teste le système parent multi-enfants / multi-universités
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get } from 'firebase/database';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
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

console.log('\n🧑‍🤝‍🧑 Création Parent Multi-Enfants\n');

// D'abord se connecter comme admin pour créer les étudiants
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@sorbonne.fr';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Admin123456';

async function createTestParentMultiChildren() {
  try {
    // Données du parent
    const parentData = {
      email: 'parent.multi@test.com',
      phoneNumber: '+33612345678',
      displayName: 'Pierre Leroux',
      password: 'Parent123456'
    };

    // Données des 3 enfants (2 à Sorbonne, 1 à hypothétique autre université)
    const children = [
      {
        childId: 'student-sophie-multi',
        firstName: 'Sophie',
        lastName: 'Leroux',
        universityId: 'univ-sorbonne-2026',
        matricule: 'SB-2026-SOPHIE',
        level: 'L1',
        fieldOfStudy: 'computer-science',
        relationship: 'père'
      },
      {
        childId: 'student-lucas-multi',
        firstName: 'Lucas',
        lastName: 'Leroux',
        universityId: 'univ-sorbonne-2026',
        matricule: 'SB-2026-LUCAS',
        level: 'L3',
        fieldOfStudy: 'mathematics',
        relationship: 'père'
      },
      {
        childId: 'student-emma-multi',
        firstName: 'Emma',
        lastName: 'Leroux',
        universityId: 'univ-sorbonne-2026',
        matricule: 'SB-2026-EMMA',
        level: 'M1',
        fieldOfStudy: 'physics',
        relationship: 'père'
      }
    ];

    // 1. Se connecter comme admin pour créer les étudiants
    console.log('🔐 Connexion comme admin pour créer les étudiants...');
    const { signInWithEmailAndPassword, signOut } = await import('firebase/auth');
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Connecté comme admin');

    // 2. Créer les profils étudiants dans Firebase
    console.log('\n👨‍🎓 Création des profils étudiants...');
    for (const child of children) {
      // Créer profil étudiant
      await set(ref(database, `universities/${child.universityId}/students/${child.childId}`), {
        firstName: child.firstName,
        lastName: child.lastName,
        email: `${child.firstName.toLowerCase()}@test.com`,
        matricule: child.matricule,
        dateOfBirth: new Date('2005-05-15').getTime(),
        gender: child.firstName === 'Lucas' ? 'male' : 'female',
        status: 'active',
        fieldOfStudy: child.fieldOfStudy,
        level: child.level,
        enrollmentDate: Date.now(),
        absences: Math.floor(Math.random() * 5),
        createdAt: Date.now(),
      });

      // Créer notes de démo
      await set(ref(database, `universities/${child.universityId}/grades/${child.childId}`), {
        'math-101': {
          assignments: [
            { name: 'Devoir 1', grade: 14 + Math.random() * 6, maxGrade: 20, coefficient: 1, date: Date.now() - 7 * 24 * 60 * 60 * 1000 },
            { name: 'Devoir 2', grade: 12 + Math.random() * 8, maxGrade: 20, coefficient: 1, date: Date.now() - 3 * 24 * 60 * 60 * 1000 },
          ],
          exams: [
            { name: 'Partiel', grade: 13 + Math.random() * 7, maxGrade: 20, coefficient: 2, date: Date.now() - 14 * 24 * 60 * 60 * 1000 },
          ],
          average: (14 + Math.random() * 4).toFixed(1),
          letterGrade: 'B',
          status: 'published',
        },
        'phys-201': {
          assignments: [
            { name: 'TP 1', grade: 11 + Math.random() * 7, maxGrade: 20, coefficient: 1, date: Date.now() - 10 * 24 * 60 * 60 * 1000 },
          ],
          exams: [
            { name: 'Contrôle', grade: 10 + Math.random() * 8, maxGrade: 20, coefficient: 2, date: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          ],
          average: (12 + Math.random() * 4).toFixed(1),
          letterGrade: 'C',
          status: 'published',
        },
      });

      // Créer paiements de démo
      await set(ref(database, `universities/${child.universityId}/payments/${child.childId}`), {
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
            receiptId: `REC-${child.matricule}-001`,
          },
          {
            amount: 500,
            dueDate: Date.now() - 1 * 24 * 60 * 60 * 1000,
            status: 'paid',
            paidAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
            method: 'bank_transfer',
            receiptId: `REC-${child.matricule}-002`,
          },
          {
            amount: 1500,
            dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
            status: 'pending',
          },
        ],
        createdAt: Date.now(),
      });

      console.log(`✅ ${child.firstName} ${child.lastName} créé(e) (${child.universityId})`);
    }

    // 3. Déconnexion admin et création compte parent
    console.log('\n📧 Déconnexion admin et création du compte parent...');
    await signOut(auth);

    let parentUid;
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        parentData.email,
        parentData.password
      );
      parentUid = userCredential.user.uid;
      console.log(`✅ Compte parent créé (UID: ${parentUid})`);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('⚠️  Compte existe déjà, connexion...');
        const userCredential = await signInWithEmailAndPassword(
          auth,
          parentData.email,
          parentData.password
        );
        parentUid = userCredential.user.uid;
        console.log(`✅ Connecté au compte existant (UID: ${parentUid})`);
      } else {
        throw error;
      }
    }

    // 4. Créer le profil parent avec tous les enfants
    console.log('\n👨‍👩‍👧‍👦 Création du profil parent...');

    // Créer l'index d'accès sécurisé
    const childrenAccess = {};
    children.forEach(child => {
      if (!childrenAccess[child.universityId]) {
        childrenAccess[child.universityId] = {};
      }
      childrenAccess[child.universityId][child.childId] = true;
    });

    await set(ref(database, `users/${parentUid}`), {
      email: parentData.email,
      loginMethod: 'email',
      phoneNumber: parentData.phoneNumber,
      displayName: parentData.displayName,
      role: 'parent',
      universityId: null, // ← Parent n'appartient pas à 1 université
      children: children.map(child => ({
        childId: child.childId,
        universityId: child.universityId,
        childName: `${child.firstName} ${child.lastName}`,
        relationship: child.relationship,
        addedBy: 'script-test',
        addedAt: Date.now()
      })),
      childrenAccess: childrenAccess, // ← INDEX SÉCURISÉ
      mustChangePassword: false,
      createdAt: Date.now(),
      lastLogin: null,
      preferences: {
        language: 'fr',
        notifications: true
      }
    });

    console.log('✅ Profil parent créé avec 3 enfants');

    // 5. Résumé
    console.log('\n\n🎉 SUCCÈS ! Parent multi-enfants créé\n');
    console.log('📋 IDENTIFIANTS DU PARENT :\n');
    console.log(`   Email : ${parentData.email}`);
    console.log(`   Téléphone : ${parentData.phoneNumber}`);
    console.log(`   Mot de passe : ${parentData.password}`);
    console.log(`   UID : ${parentUid}\n`);

    console.log('👨‍👩‍👧‍👦 ENFANTS LIÉS :\n');
    children.forEach((child, index) => {
      console.log(`   ${index + 1}. ${child.firstName} ${child.lastName}`);
      console.log(`      - Université : ${child.universityId}`);
      console.log(`      - Niveau : ${child.level}`);
      console.log(`      - Matricule : ${child.matricule}\n`);
    });

    console.log('🧪 TEST :');
    console.log('   1. Connectez-vous sur http://localhost:5173/login');
    console.log(`   2. Email : ${parentData.email}`);
    console.log(`   3. Mot de passe : ${parentData.password}`);
    console.log('   4. Vous devriez voir un dropdown avec 3 enfants');
    console.log('   5. Changez d\'enfant et vérifiez que les données changent\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erreur :', error);
    process.exit(1);
  }
}

createTestParentMultiChildren();
