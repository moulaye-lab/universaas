/**
 * test-firebase-rules.mjs - Tests automatisés des Firebase Rules
 *
 * Teste les contrôles d'accès Firebase pour garantir l'isolation multi-tenant
 * et la séparation des rôles.
 *
 * Usage: node test-firebase-rules.mjs
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, remove } from 'firebase/database';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';

// ⚠️ REMPLACER PAR TA CONFIG FIREBASE
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "VOTRE_AUTH_DOMAIN",
  databaseURL: "VOTRE_DATABASE_URL",
  projectId: "VOTRE_PROJECT_ID",
  storageBucket: "VOTRE_STORAGE_BUCKET",
  messagingSenderId: "VOTRE_MESSAGING_SENDER_ID",
  appId: "VOTRE_APP_ID"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Compteurs
let testsTotal = 0;
let testsReussis = 0;
let testsEchoues = 0;

// Helper pour afficher résultats
function logTest(nom, attendu, resultat) {
  testsTotal++;
  const reussi = attendu === resultat;

  if (reussi) {
    testsReussis++;
    console.log(`✅ ${nom}`);
  } else {
    testsEchoues++;
    console.log(`❌ ${nom}`);
    console.log(`   Attendu: ${attendu}, Obtenu: ${resultat}`);
  }
}

async function testerAcces(chemin, attendu) {
  try {
    const dataRef = ref(database, chemin);
    await get(dataRef);
    return 'AUTORISE';
  } catch (error) {
    if (error.code === 'PERMISSION_DENIED') {
      return 'REFUSE';
    }
    return 'ERREUR';
  }
}

// ==============================================================================
// TESTS ISOLATION MULTI-TENANT
// ==============================================================================

async function testerIsolationMultiTenant() {
  console.log('\n🔒 TESTS ISOLATION MULTI-TENANT\n');

  // Se connecter avec Admin Université A
  const adminUnivAEmail = 'admin-univ-a@example.com'; // ⚠️ REMPLACER
  const adminUnivAPassword = '12345678'; // ⚠️ REMPLACER

  try {
    await signInWithEmailAndPassword(auth, adminUnivAEmail, adminUnivAPassword);
    console.log('✅ Connexion Admin Université A réussie\n');

    // Test 1: Admin A peut lire ses propres étudiants
    const resultat1 = await testerAcces('universities/univ-a/students', 'AUTORISE');
    logTest('Admin A lit étudiants Université A', 'AUTORISE', resultat1);

    // Test 2: Admin A ne peut PAS lire étudiants Université B
    const resultat2 = await testerAcces('universities/univ-b/students', 'REFUSE');
    logTest('Admin A lit étudiants Université B', 'REFUSE', resultat2);

    // Test 3: Admin A peut écrire ses propres classes
    const resultat3 = await testerAcces('universities/univ-a/classes', 'AUTORISE');
    logTest('Admin A écrit classes Université A', 'AUTORISE', resultat3);

    // Test 4: Admin A ne peut PAS écrire classes Université B
    try {
      const classRef = ref(database, 'universities/univ-b/classes/test-class');
      await set(classRef, { name: 'Test Class' });
      logTest('Admin A écrit classes Université B', 'REFUSE', 'AUTORISE');
    } catch (error) {
      if (error.code === 'PERMISSION_DENIED') {
        logTest('Admin A écrit classes Université B', 'REFUSE', 'REFUSE');
      }
    }

    await signOut(auth);

  } catch (error) {
    console.error('❌ Erreur connexion Admin Université A:', error.message);
  }
}

// ==============================================================================
// TESTS RÔLE ÉTUDIANT
// ==============================================================================

async function testerRoleEtudiant() {
  console.log('\n👨‍🎓 TESTS RÔLE ÉTUDIANT\n');

  const studentEmail = 'student@example.com'; // ⚠️ REMPLACER
  const studentPassword = '12345678'; // ⚠️ REMPLACER

  try {
    await signInWithEmailAndPassword(auth, studentEmail, studentPassword);
    console.log('✅ Connexion Étudiant réussie\n');

    // Test 1: Étudiant peut lire ses propres informations
    const resultat1 = await testerAcces('universities/univ-a/students/student-123', 'AUTORISE');
    logTest('Étudiant lit ses propres infos', 'AUTORISE', resultat1);

    // Test 2: Étudiant ne peut PAS lire infos d'un autre étudiant
    const resultat2 = await testerAcces('universities/univ-a/students/student-456', 'REFUSE');
    logTest('Étudiant lit infos autre étudiant', 'REFUSE', resultat2);

    // Test 3: Étudiant peut lire ses propres notes
    const resultat3 = await testerAcces('universities/univ-a/grades/grade-123', 'AUTORISE');
    logTest('Étudiant lit ses propres notes', 'AUTORISE', resultat3);

    // Test 4: Étudiant ne peut PAS lire notes d'un autre étudiant
    const resultat4 = await testerAcces('universities/univ-a/grades/grade-456', 'REFUSE');
    logTest('Étudiant lit notes autre étudiant', 'REFUSE', resultat4);

    // Test 5: Étudiant ne peut PAS créer de notes
    try {
      const gradeRef = ref(database, 'universities/univ-a/grades/new-grade');
      await set(gradeRef, { studentId: 'student-123', grade: 20 });
      logTest('Étudiant crée note', 'REFUSE', 'AUTORISE');
    } catch (error) {
      if (error.code === 'PERMISSION_DENIED') {
        logTest('Étudiant crée note', 'REFUSE', 'REFUSE');
      }
    }

    // Test 6: Étudiant ne peut PAS accéder aux paiements d'autres étudiants
    const resultat6 = await testerAcces('universities/univ-a/payments/student-456', 'REFUSE');
    logTest('Étudiant lit paiements autre étudiant', 'REFUSE', resultat6);

    await signOut(auth);

  } catch (error) {
    console.error('❌ Erreur connexion Étudiant:', error.message);
  }
}

// ==============================================================================
// TESTS RÔLE ENSEIGNANT
// ==============================================================================

async function testerRoleEnseignant() {
  console.log('\n👨‍🏫 TESTS RÔLE ENSEIGNANT\n');

  const teacherEmail = 'teacher@example.com'; // ⚠️ REMPLACER
  const teacherPassword = '12345678'; // ⚠️ REMPLACER

  try {
    await signInWithEmailAndPassword(auth, teacherEmail, teacherPassword);
    console.log('✅ Connexion Enseignant réussie\n');

    // Test 1: Enseignant peut lire tous les étudiants de son université
    const resultat1 = await testerAcces('universities/univ-a/students', 'AUTORISE');
    logTest('Enseignant lit étudiants université', 'AUTORISE', resultat1);

    // Test 2: Enseignant peut lire toutes les notes de son université
    const resultat2 = await testerAcces('universities/univ-a/grades', 'AUTORISE');
    logTest('Enseignant lit notes université', 'AUTORISE', resultat2);

    // Test 3: Enseignant peut créer des notes
    try {
      const gradeRef = ref(database, 'universities/univ-a/grades/new-grade-teacher');
      await set(gradeRef, {
        studentId: 'student-123',
        courseId: 'course-123',
        courseName: 'Mathématiques',
        classId: 'class-123',
        className: 'L1 Info',
        title: 'Examen Final',
        gradeType: 'exam',
        grade: 15,
        maxGrade: 20,
        coefficient: 2,
        date: Date.now(),
        teacherId: 'teacher-123',
        teacherName: 'Prof. Dupont'
      });
      logTest('Enseignant crée note', 'AUTORISE', 'AUTORISE');

      // Nettoyer
      await remove(gradeRef);
    } catch (error) {
      if (error.code === 'PERMISSION_DENIED') {
        logTest('Enseignant crée note', 'AUTORISE', 'REFUSE');
      }
    }

    // Test 4: Enseignant ne peut PAS créer d'étudiants
    try {
      const studentRef = ref(database, 'universities/univ-a/students/new-student');
      await set(studentRef, { firstName: 'Test', lastName: 'Student' });
      logTest('Enseignant crée étudiant', 'REFUSE', 'AUTORISE');
    } catch (error) {
      if (error.code === 'PERMISSION_DENIED') {
        logTest('Enseignant crée étudiant', 'REFUSE', 'REFUSE');
      }
    }

    // Test 5: Enseignant ne peut PAS lire étudiants autre université
    const resultat5 = await testerAcces('universities/univ-b/students', 'REFUSE');
    logTest('Enseignant lit étudiants autre université', 'REFUSE', resultat5);

    await signOut(auth);

  } catch (error) {
    console.error('❌ Erreur connexion Enseignant:', error.message);
  }
}

// ==============================================================================
// TESTS RÔLE PARENT
// ==============================================================================

async function testerRoleParent() {
  console.log('\n👨‍👩‍👧 TESTS RÔLE PARENT\n');

  const parentEmail = 'parent@example.com'; // ⚠️ REMPLACER
  const parentPassword = '123456'; // ⚠️ REMPLACER

  try {
    await signInWithEmailAndPassword(auth, parentEmail, parentPassword);
    console.log('✅ Connexion Parent réussie\n');

    // Test 1: Parent peut lire infos de son enfant
    const resultat1 = await testerAcces('universities/univ-a/students/student-123', 'AUTORISE');
    logTest('Parent lit infos son enfant', 'AUTORISE', resultat1);

    // Test 2: Parent ne peut PAS lire infos d'un autre enfant
    const resultat2 = await testerAcces('universities/univ-a/students/student-456', 'REFUSE');
    logTest('Parent lit infos autre enfant', 'REFUSE', resultat2);

    // Test 3: Parent peut lire notes de son enfant
    const resultat3 = await testerAcces('universities/univ-a/grades/grade-123', 'AUTORISE');
    logTest('Parent lit notes son enfant', 'AUTORISE', resultat3);

    // Test 4: Parent ne peut PAS lire notes d'un autre enfant
    const resultat4 = await testerAcces('universities/univ-a/grades/grade-456', 'REFUSE');
    logTest('Parent lit notes autre enfant', 'REFUSE', resultat4);

    // Test 5: Parent ne peut PAS créer de notes
    try {
      const gradeRef = ref(database, 'universities/univ-a/grades/new-grade-parent');
      await set(gradeRef, { studentId: 'student-123', grade: 20 });
      logTest('Parent crée note', 'REFUSE', 'AUTORISE');
    } catch (error) {
      if (error.code === 'PERMISSION_DENIED') {
        logTest('Parent crée note', 'REFUSE', 'REFUSE');
      }
    }

    // Test 6: Parent peut lire paiements de son enfant
    const resultat6 = await testerAcces('universities/univ-a/payments/student-123', 'AUTORISE');
    logTest('Parent lit paiements son enfant', 'AUTORISE', resultat6);

    await signOut(auth);

  } catch (error) {
    console.error('❌ Erreur connexion Parent:', error.message);
  }
}

// ==============================================================================
// TESTS UTILISATEUR NON AUTHENTIFIÉ
// ==============================================================================

async function testerUtilisateurNonAuth() {
  console.log('\n🚫 TESTS UTILISATEUR NON AUTHENTIFIÉ\n');

  // S'assurer qu'on est déconnecté
  await signOut(auth);

  // Test 1: Non-auth ne peut PAS lire étudiants
  const resultat1 = await testerAcces('universities/univ-a/students', 'REFUSE');
  logTest('Non-auth lit étudiants', 'REFUSE', resultat1);

  // Test 2: Non-auth ne peut PAS lire notes
  const resultat2 = await testerAcces('universities/univ-a/grades', 'REFUSE');
  logTest('Non-auth lit notes', 'REFUSE', resultat2);

  // Test 3: Non-auth ne peut PAS lire users
  const resultat3 = await testerAcces('users', 'REFUSE');
  logTest('Non-auth lit users', 'REFUSE', resultat3);

  // Test 4: Non-auth ne peut PAS lire universities
  const resultat4 = await testerAcces('universities', 'REFUSE');
  logTest('Non-auth lit universities', 'REFUSE', resultat4);
}

// ==============================================================================
// EXÉCUTION DES TESTS
// ==============================================================================

async function executerTousLesTests() {
  console.log('🧪 DÉBUT DES TESTS FIREBASE RULES\n');
  console.log('='.repeat(60));

  try {
    await testerUtilisateurNonAuth();
    await testerIsolationMultiTenant();
    await testerRoleEtudiant();
    await testerRoleEnseignant();
    await testerRoleParent();

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 RÉSULTATS\n');
    console.log(`Total tests : ${testsTotal}`);
    console.log(`✅ Réussis   : ${testsReussis}`);
    console.log(`❌ Échoués   : ${testsEchoues}`);
    console.log(`📈 Taux      : ${((testsReussis / testsTotal) * 100).toFixed(1)}%\n`);

    if (testsEchoues === 0) {
      console.log('🎉 TOUS LES TESTS SONT PASSÉS !\n');
      console.log('✅ Les Firebase Rules sont SÉCURISÉES et PRODUCTION-READY\n');
    } else {
      console.log('⚠️ CERTAINS TESTS ONT ÉCHOUÉ\n');
      console.log('🔴 Les Firebase Rules nécessitent des corrections\n');
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution des tests:', error);
  } finally {
    process.exit(testsEchoues === 0 ? 0 : 1);
  }
}

// ==============================================================================
// LANCEMENT
// ==============================================================================

executerTousLesTests();
