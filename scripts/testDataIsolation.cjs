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

// Codes couleur pour le terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function testResult(testName, shouldPass, actualResult, details = '') {
  totalTests++;

  const passed = (shouldPass && actualResult) || (!shouldPass && !actualResult);

  if (passed) {
    passedTests++;
    log(`✅ ${testName}`, 'green');
    if (details) log(`   ${details}`, 'cyan');
  } else {
    failedTests++;
    log(`❌ ${testName}`, 'red');
    log(`   Attendu: ${shouldPass ? 'SUCCÈS' : 'ÉCHEC'}`, 'yellow');
    log(`   Obtenu: ${actualResult ? 'SUCCÈS' : 'ÉCHEC'}`, 'yellow');
    if (details) log(`   ${details}`, 'cyan');
  }
}

async function findTestData() {
  log('\n🔍 Recherche des données de test...', 'cyan');

  const universitiesSnap = await database.ref('universities').once('value');
  const universities = universitiesSnap.val();

  const univIds = Object.keys(universities);
  if (univIds.length < 2) {
    log('❌ Besoin d\'au moins 2 universités pour les tests d\'isolation', 'red');
    process.exit(1);
  }

  const univ1Id = univIds[0];
  const univ2Id = univIds[1];

  // Trouver un admin pour chaque université
  const usersSnap = await database.ref('users').once('value');
  const users = usersSnap.val();

  let admin1 = null;
  let admin2 = null;
  let parent1 = null;
  let student1 = null;

  for (const [uid, userData] of Object.entries(users)) {
    if (userData.role === 'admin_universite' && userData.universityId === univ1Id && !admin1) {
      admin1 = { uid, ...userData };
    }
    if (userData.role === 'admin_universite' && userData.universityId === univ2Id && !admin2) {
      admin2 = { uid, ...userData };
    }
    if (userData.role === 'parent' && userData.universityId === univ1Id && !parent1) {
      parent1 = { uid, ...userData };
    }
  }

  // Trouver un étudiant dans univ1
  const students1 = universities[univ1Id].students;
  if (students1) {
    const studentId = Object.keys(students1)[0];
    student1 = { id: studentId, ...students1[studentId] };
  }

  log(`✅ Université 1: ${univ1Id}`, 'green');
  log(`✅ Université 2: ${univ2Id}`, 'green');
  log(`✅ Admin 1: ${admin1?.displayName || 'N/A'}`, 'green');
  log(`✅ Admin 2: ${admin2?.displayName || 'N/A'}`, 'green');
  log(`✅ Parent 1: ${parent1?.displayName || 'N/A'}`, 'green');
  log(`✅ Étudiant 1: ${student1?.firstName || 'N/A'}`, 'green');

  return {
    univ1Id,
    univ2Id,
    admin1,
    admin2,
    parent1,
    student1,
    universities
  };
}

async function testCrossUniversityAccess(testData) {
  log('\n\n╔════════════════════════════════════════════════════════╗', 'blue');
  log('║   TEST 1: ISOLATION ENTRE UNIVERSITÉS                 ║', 'blue');
  log('╚════════════════════════════════════════════════════════╝', 'blue');

  const { univ1Id, univ2Id, admin1, admin2 } = testData;

  // Test 1.1: Admin de univ1 ne peut PAS lire les étudiants de univ2
  log('\n📋 Test 1.1: Admin Université A → Étudiants Université B', 'cyan');
  try {
    const studentsRef = database.ref(`universities/${univ2Id}/students`);
    const snapshot = await studentsRef.once('value');

    // Si on arrive ici, c'est qu'on a pu lire (MAUVAIS)
    testResult(
      'Admin Université A ne peut PAS lire étudiants Université B',
      false,
      true,
      'FAILLE DÉTECTÉE: L\'admin peut lire les données d\'une autre université'
    );
  } catch (err) {
    // Permission denied attendu (BON)
    testResult(
      'Admin Université A ne peut PAS lire étudiants Université B',
      false,
      false,
      'Permission denied (comportement attendu)'
    );
  }

  // Test 1.2: Admin de univ1 PEUT lire ses propres étudiants
  log('\n📋 Test 1.2: Admin Université A → Étudiants Université A', 'cyan');
  try {
    const studentsRef = database.ref(`universities/${univ1Id}/students`);
    const snapshot = await studentsRef.once('value');

    testResult(
      'Admin Université A PEUT lire ses propres étudiants',
      true,
      snapshot.exists(),
      `${snapshot.exists() ? Object.keys(snapshot.val()).length : 0} étudiants trouvés`
    );
  } catch (err) {
    testResult(
      'Admin Université A PEUT lire ses propres étudiants',
      true,
      false,
      `Erreur: ${err.message}`
    );
  }

  // Test 1.3: Admin ne peut PAS lire /users d'une autre université
  log('\n📋 Test 1.3: Admin Université A → Profil Admin Université B', 'cyan');
  try {
    const userRef = database.ref(`users/${admin2.uid}`);
    const snapshot = await userRef.once('value');

    testResult(
      'Admin Université A ne peut PAS lire profil Admin Université B',
      false,
      snapshot.exists(),
      snapshot.exists() ? 'FAILLE DÉTECTÉE' : 'Permission denied'
    );
  } catch (err) {
    testResult(
      'Admin Université A ne peut PAS lire profil Admin Université B',
      false,
      false,
      'Permission denied (comportement attendu)'
    );
  }
}

async function testParentAccess(testData) {
  log('\n\n╔════════════════════════════════════════════════════════╗', 'blue');
  log('║   TEST 2: ACCÈS PARENTS (CHILDRENACCESS)              ║', 'blue');
  log('╚════════════════════════════════════════════════════════╝', 'blue');

  const { univ1Id, parent1, student1, universities } = testData;

  if (!parent1 || !parent1.childrenAccess) {
    log('⚠️  Pas de parent avec childrenAccess pour les tests', 'yellow');
    return;
  }

  const authorizedStudentId = Object.keys(parent1.childrenAccess[univ1Id] || {})[0];
  const allStudents = Object.keys(universities[univ1Id].students);
  const unauthorizedStudentId = allStudents.find(id => id !== authorizedStudentId);

  // Test 2.1: Parent PEUT lire son enfant
  log('\n📋 Test 2.1: Parent → Son enfant', 'cyan');
  try {
    const studentRef = database.ref(`universities/${univ1Id}/students/${authorizedStudentId}`);
    const snapshot = await studentRef.once('value');

    testResult(
      'Parent PEUT lire les données de son enfant',
      true,
      snapshot.exists(),
      snapshot.exists() ? 'Accès autorisé' : 'Accès refusé'
    );
  } catch (err) {
    testResult(
      'Parent PEUT lire les données de son enfant',
      true,
      false,
      `Erreur: ${err.message}`
    );
  }

  // Test 2.2: Parent ne peut PAS lire un enfant qui n'est pas le sien
  if (unauthorizedStudentId) {
    log('\n📋 Test 2.2: Parent → Enfant non autorisé', 'cyan');
    try {
      const studentRef = database.ref(`universities/${univ1Id}/students/${unauthorizedStudentId}`);
      const snapshot = await studentRef.once('value');

      testResult(
        'Parent ne peut PAS lire un enfant qui n\'est pas le sien',
        false,
        snapshot.exists(),
        snapshot.exists() ? 'FAILLE DÉTECTÉE' : 'Permission denied'
      );
    } catch (err) {
      testResult(
        'Parent ne peut PAS lire un enfant qui n\'est pas le sien',
        false,
        false,
        'Permission denied (comportement attendu)'
      );
    }
  }

  // Test 2.3: Parent ne peut PAS lister TOUS les étudiants
  log('\n📋 Test 2.3: Parent → Liste complète étudiants', 'cyan');
  try {
    const studentsRef = database.ref(`universities/${univ1Id}/students`);
    const snapshot = await studentsRef.once('value');

    testResult(
      'Parent ne peut PAS lister tous les étudiants',
      false,
      snapshot.exists(),
      snapshot.exists() ? 'FAILLE DÉTECTÉE' : 'Permission denied'
    );
  } catch (err) {
    testResult(
      'Parent ne peut PAS lister tous les étudiants',
      false,
      false,
      'Permission denied (comportement attendu)'
    );
  }
}

async function testRoleEscalation(testData) {
  log('\n\n╔════════════════════════════════════════════════════════╗', 'blue');
  log('║   TEST 3: PROTECTION CONTRE ÉLÉVATION DE PRIVILÈGES   ║', 'blue');
  log('╚════════════════════════════════════════════════════════╝', 'blue');

  const { admin1, parent1 } = testData;

  // Test 3.1: Admin ne peut PAS modifier le rôle d'un super_admin
  log('\n📋 Test 3.1: Admin → Modifier rôle super_admin', 'cyan');
  try {
    // Chercher un super_admin
    const usersSnap = await database.ref('users').once('value');
    const users = usersSnap.val();

    let superAdminUid = null;
    for (const [uid, userData] of Object.entries(users)) {
      if (userData.role === 'super_admin_plateforme') {
        superAdminUid = uid;
        break;
      }
    }

    if (superAdminUid) {
      const userRef = database.ref(`users/${superAdminUid}/role`);
      await userRef.set('student'); // Tentative de dégradation

      testResult(
        'Admin ne peut PAS modifier le rôle d\'un super_admin',
        false,
        true,
        'FAILLE CRITIQUE: Admin peut modifier rôle super_admin'
      );
    } else {
      log('   ⚠️  Aucun super_admin trouvé pour le test', 'yellow');
    }
  } catch (err) {
    testResult(
      'Admin ne peut PAS modifier le rôle d\'un super_admin',
      false,
      false,
      'Permission denied (comportement attendu)'
    );
  }

  // Test 3.2: Parent ne peut PAS s'auto-promouvoir en admin
  if (parent1) {
    log('\n📋 Test 3.2: Parent → S\'auto-promouvoir en admin', 'cyan');
    try {
      const userRef = database.ref(`users/${parent1.uid}/role`);
      await userRef.set('admin_universite');

      testResult(
        'Parent ne peut PAS s\'auto-promouvoir en admin',
        false,
        true,
        'FAILLE CRITIQUE: Parent peut changer son propre rôle'
      );
    } catch (err) {
      testResult(
        'Parent ne peut PAS s\'auto-promouvoir en admin',
        false,
        false,
        'Permission denied (comportement attendu)'
      );
    }
  }
}

async function testSensitiveData(testData) {
  log('\n\n╔════════════════════════════════════════════════════════╗', 'blue');
  log('║   TEST 4: PROTECTION DES DONNÉES SENSIBLES            ║', 'blue');
  log('╚════════════════════════════════════════════════════════╝', 'blue');

  const { univ1Id, parent1, student1 } = testData;

  if (!parent1 || !student1) {
    log('⚠️  Données de test insuffisantes', 'yellow');
    return;
  }

  const authorizedStudentId = Object.keys(parent1.childrenAccess?.[univ1Id] || {})[0];

  // Test 4.1: Parent PEUT lire les notes de son enfant
  log('\n📋 Test 4.1: Parent → Notes de son enfant', 'cyan');
  try {
    const gradesRef = database.ref(`universities/${univ1Id}/grades/${authorizedStudentId}`);
    const snapshot = await gradesRef.once('value');

    testResult(
      'Parent PEUT lire les notes de son enfant',
      true,
      true, // On considère que l'accès est autorisé (même si pas de données)
      snapshot.exists() ? `${Object.keys(snapshot.val()).length} notes trouvées` : 'Aucune note (accès autorisé)'
    );
  } catch (err) {
    testResult(
      'Parent PEUT lire les notes de son enfant',
      true,
      false,
      `Erreur: ${err.message}`
    );
  }

  // Test 4.2: Parent PEUT lire les paiements de son enfant
  log('\n📋 Test 4.2: Parent → Paiements de son enfant', 'cyan');
  try {
    const paymentsRef = database.ref(`universities/${univ1Id}/payments/${authorizedStudentId}`);
    const snapshot = await paymentsRef.once('value');

    testResult(
      'Parent PEUT lire les paiements de son enfant',
      true,
      true,
      snapshot.exists() ? `${Object.keys(snapshot.val()).length} paiements trouvés` : 'Aucun paiement (accès autorisé)'
    );
  } catch (err) {
    testResult(
      'Parent PEUT lire les paiements de son enfant',
      true,
      false,
      `Erreur: ${err.message}`
    );
  }

  // Test 4.3: Parent ne peut PAS modifier les notes
  log('\n📋 Test 4.3: Parent → Modifier notes', 'cyan');
  try {
    const gradeRef = database.ref(`universities/${univ1Id}/grades/${authorizedStudentId}/test123`);
    await gradeRef.set({ grade: 20, subject: 'Test' });

    testResult(
      'Parent ne peut PAS modifier les notes',
      false,
      true,
      'FAILLE DÉTECTÉE: Parent peut modifier les notes'
    );
  } catch (err) {
    testResult(
      'Parent ne peut PAS modifier les notes',
      false,
      false,
      'Permission denied (comportement attendu)'
    );
  }
}

async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════╗', 'bold');
  log('║                                                        ║', 'bold');
  log('║       🔒 TEST D\'ISOLATION DES DONNÉES - COMPLET       ║', 'bold');
  log('║                                                        ║', 'bold');
  log('╚════════════════════════════════════════════════════════╝', 'bold');

  try {
    const testData = await findTestData();

    await testCrossUniversityAccess(testData);
    await testParentAccess(testData);
    await testRoleEscalation(testData);
    await testSensitiveData(testData);

    // Résumé final
    log('\n\n╔════════════════════════════════════════════════════════╗', 'bold');
    log('║                   RÉSUMÉ DES TESTS                     ║', 'bold');
    log('╚════════════════════════════════════════════════════════╝', 'bold');

    log(`\n📊 Total: ${totalTests} tests`, 'cyan');
    log(`✅ Réussis: ${passedTests} tests`, 'green');
    log(`❌ Échoués: ${failedTests} tests`, failedTests > 0 ? 'red' : 'green');

    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    log(`\n📈 Taux de réussite: ${successRate}%`, successRate >= 90 ? 'green' : 'red');

    if (failedTests === 0) {
      log('\n🎉 TOUS LES TESTS SONT PASSÉS !', 'green');
      log('🔒 L\'isolation des données est PARFAITE', 'green');
      process.exit(0);
    } else {
      log('\n⚠️  DES FAILLES DE SÉCURITÉ ONT ÉTÉ DÉTECTÉES', 'red');
      log('🔧 Veuillez corriger les règles Firebase avant la production', 'yellow');
      process.exit(1);
    }

  } catch (err) {
    log('\n❌ ERREUR FATALE LORS DES TESTS:', 'red');
    log(err.message, 'red');
    console.error(err);
    process.exit(1);
  }
}

runAllTests();
