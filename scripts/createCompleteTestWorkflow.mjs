#!/usr/bin/env node

/**
 * Script pour créer un workflow de test complet :
 * - 1 Enseignant avec 1 cours
 * - 2 Étudiants actifs
 * - 1 Parent lié à 1 étudiant
 * Permet de tester : Teacher entre note → Student voit note → Parent voit note
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, push } from 'firebase/database';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
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

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@sorbonne.fr';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Admin123456';
const UNIVERSITY_ID = 'univ-sorbonne-2026';

console.log('\n🎓 Création Workflow Test Complet\n');

async function createCompleteTestWorkflow() {
  try {
    // 1. Se connecter comme admin
    console.log('🔐 Connexion admin...');
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Connecté comme admin\n');

    // ========== CRÉER ENSEIGNANT ==========
    console.log('👨‍🏫 Création Enseignant...');

    await signOut(auth);
    let teacherUid;
    const teacherEmail = 'teacher.test@sorbonne.fr';
    const teacherPassword = 'Teacher123456';

    try {
      const teacherCred = await createUserWithEmailAndPassword(auth, teacherEmail, teacherPassword);
      teacherUid = teacherCred.user.uid;
      console.log(`✅ Compte enseignant créé (UID: ${teacherUid})`);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        const teacherCred = await signInWithEmailAndPassword(auth, teacherEmail, teacherPassword);
        teacherUid = teacherCred.user.uid;
        console.log(`⚠️  Compte existe, réutilisé (UID: ${teacherUid})`);
      } else {
        throw error;
      }
    }

    // Profil enseignant
    await set(ref(database, `users/${teacherUid}`), {
      email: teacherEmail,
      displayName: 'Prof. Martin Dubois',
      role: 'teacher',
      universityId: UNIVERSITY_ID,
      profileId: teacherUid,
      loginMethod: 'email',
      mustChangePassword: false,
      createdAt: Date.now(),
    });

    // Créer cours (on ajoutera les étudiants après)
    const courseId = 'course-math-101';
    const courseData = {
      name: 'Mathématiques Avancées',
      code: 'MATH-101',
      level: 'L2',
      credits: 6,
      coefficient: 3, // ← Coefficient du cours
      teacherId: teacherUid,
      teacherName: 'Prof. Martin Dubois',
      enrolledStudents: [], // Sera rempli après création des étudiants
      semester: 'S1',
      status: 'active',
      createdAt: Date.now(),
    };

    // Profil dans teachers
    await set(ref(database, `universities/${UNIVERSITY_ID}/teachers/${teacherUid}`), {
      firstName: 'Martin',
      lastName: 'Dubois',
      email: teacherEmail,
      department: 'Mathématiques',
      assignedCourses: [courseId],
      status: 'active',
      createdAt: Date.now(),
    });

    console.log('✅ Enseignant et cours créés\n');

    // ========== CRÉER 2 ÉTUDIANTS ==========
    console.log('👨‍🎓 Création Étudiants...');

    const students = [
      {
        email: 'student.sophie@sorbonne.fr',
        password: 'Student123456',
        firstName: 'Sophie',
        lastName: 'Laurent',
        matricule: 'SB-2026-SOPHIE-TEST',
        level: 'L2',
        fieldOfStudy: 'mathematics'
      },
      {
        email: 'student.lucas@sorbonne.fr',
        password: 'Student123456',
        firstName: 'Lucas',
        lastName: 'Bernard',
        matricule: 'SB-2026-LUCAS-TEST',
        level: 'L2',
        fieldOfStudy: 'mathematics'
      }
    ];

    const studentIds = [];

    for (const studentData of students) {
      await signOut(auth);
      let studentUid;

      try {
        const studentCred = await createUserWithEmailAndPassword(auth, studentData.email, studentData.password);
        studentUid = studentCred.user.uid;
        console.log(`✅ ${studentData.firstName} ${studentData.lastName} créé (UID: ${studentUid})`);
      } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
          const studentCred = await signInWithEmailAndPassword(auth, studentData.email, studentData.password);
          studentUid = studentCred.user.uid;
          console.log(`⚠️  ${studentData.firstName} existe, réutilisé`);
        } else {
          throw error;
        }
      }

      studentIds.push(studentUid);

      // Profil user
      await set(ref(database, `users/${studentUid}`), {
        email: studentData.email,
        displayName: `${studentData.firstName} ${studentData.lastName}`,
        role: 'student',
        universityId: UNIVERSITY_ID,
        profileId: studentUid,
        loginMethod: 'email',
        mustChangePassword: false,
        createdAt: Date.now(),
      });

      // Profil étudiant
      await set(ref(database, `universities/${UNIVERSITY_ID}/students/${studentUid}`), {
        firstName: studentData.firstName,
        lastName: studentData.lastName,
        email: studentData.email,
        matricule: studentData.matricule,
        dateOfBirth: new Date('2004-03-15').getTime(),
        gender: studentData.firstName === 'Sophie' ? 'female' : 'male',
        status: 'active',
        fieldOfStudy: studentData.fieldOfStudy,
        level: studentData.level,
        enrollmentDate: Date.now(),
        absences: 0,
        createdAt: Date.now(),
      });

      // Initialiser structure paiements
      await set(ref(database, `universities/${UNIVERSITY_ID}/payments/${studentUid}`), {
        academicYear: '2025-2026',
        tuitionFee: 3000,
        paidAmount: 1500,
        remainingAmount: 1500,
        currency: 'EUR',
        status: 'partial',
        installments: [
          {
            amount: 1500,
            dueDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
            status: 'paid',
            paidAt: Date.now() - 32 * 24 * 60 * 60 * 1000,
            method: 'card',
            receiptId: `REC-${studentData.matricule}-001`,
          },
          {
            amount: 1500,
            dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
            status: 'pending',
          }
        ],
        createdAt: Date.now(),
      });
    }

    console.log('✅ Étudiants créés\n');

    // ========== INSCRIRE LES ÉTUDIANTS AU COURS ==========
    console.log('📚 Inscription au cours...');

    courseData.enrolledStudents = studentIds;
    await set(ref(database, `universities/${UNIVERSITY_ID}/courses/${courseId}`), courseData);

    console.log('✅ Étudiants inscrits au cours\n');

    // ========== CRÉER PARENT POUR SOPHIE ==========
    console.log('👨‍👩‍👧 Création Parent...');

    await signOut(auth);
    const parentEmail = 'parent.test@sorbonne.fr';
    const parentPassword = 'Parent123456';
    let parentUid;

    try {
      const parentCred = await createUserWithEmailAndPassword(auth, parentEmail, parentPassword);
      parentUid = parentCred.user.uid;
      console.log(`✅ Parent créé (UID: ${parentUid})`);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        const parentCred = await signInWithEmailAndPassword(auth, parentEmail, parentPassword);
        parentUid = parentCred.user.uid;
        console.log(`⚠️  Parent existe, réutilisé`);
      } else {
        throw error;
      }
    }

    // childrenAccess index
    const childrenAccess = {};
    childrenAccess[UNIVERSITY_ID] = {};
    childrenAccess[UNIVERSITY_ID][studentIds[0]] = true; // Sophie seulement

    await set(ref(database, `users/${parentUid}`), {
      email: parentEmail,
      displayName: 'Jean Laurent',
      phoneNumber: '+33612345678',
      role: 'parent',
      universityId: null,
      loginMethod: 'email',
      children: [
        {
          childId: studentIds[0],
          universityId: UNIVERSITY_ID,
          childName: 'Sophie Laurent',
          relationship: 'père',
          addedBy: 'script-test',
          addedAt: Date.now()
        }
      ],
      childrenAccess: childrenAccess,
      mustChangePassword: false,
      createdAt: Date.now(),
    });

    console.log('✅ Parent lié à Sophie\n');

    // ========== RÉSUMÉ ==========
    console.log('\n🎉 WORKFLOW TEST CRÉÉ AVEC SUCCÈS !\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('👨‍🏫 ENSEIGNANT :');
    console.log(`   Email    : ${teacherEmail}`);
    console.log(`   Password : ${teacherPassword}`);
    console.log(`   Cours    : Mathématiques Avancées (MATH-101)\n`);

    console.log('👨‍🎓 ÉTUDIANT 1 (avec parent) :');
    console.log(`   Email    : ${students[0].email}`);
    console.log(`   Password : ${students[0].password}`);
    console.log(`   Nom      : ${students[0].firstName} ${students[0].lastName}\n`);

    console.log('👨‍🎓 ÉTUDIANT 2 (sans parent) :');
    console.log(`   Email    : ${students[1].email}`);
    console.log(`   Password : ${students[1].password}`);
    console.log(`   Nom      : ${students[1].firstName} ${students[1].lastName}\n`);

    console.log('👨‍👩‍👧 PARENT (lié à Sophie) :');
    console.log(`   Email    : ${parentEmail}`);
    console.log(`   Password : ${parentPassword}`);
    console.log(`   Enfant   : Sophie Laurent\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🧪 WORKFLOW DE TEST :\n');
    console.log('1. Connectez-vous comme ENSEIGNANT');
    console.log('   → Allez dans "Saisie Notes"');
    console.log('   → Sélectionnez "Mathématiques Avancées"');
    console.log('   → Sélectionnez "Sophie Laurent"');
    console.log('   → Entrez une note (ex: 15/20, coeff 2, Examen)');
    console.log('   → Enregistrez\n');

    console.log('2. Déconnexion → Connexion ÉTUDIANT (Sophie)');
    console.log('   → Vérifiez que la note apparaît');
    console.log('   → Vérifiez la moyenne du cours\n');

    console.log('3. Déconnexion → Connexion PARENT');
    console.log('   → Sélectionnez Sophie dans le dropdown');
    console.log('   → Vérifiez les notes de Sophie');
    console.log('   → Vérifiez la moyenne générale\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await signOut(auth);
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erreur :', error);
    process.exit(1);
  }
}

createCompleteTestWorkflow();
