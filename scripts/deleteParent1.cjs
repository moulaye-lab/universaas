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

async function deleteParent() {
  const parentUid = 'kRVi6oLW5sOCIHUFiNDHS7jzG6l2';

  try {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🗑️  SUPPRESSION DU PARENT 1');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('Parent à supprimer:');
    console.log('  UID: kRVi6oLW5sOCIHUFiNDHS7jzG6l2');
    console.log('  DisplayName: v@parent.fr');
    console.log('  Email: v@parent.fr');
    console.log('  Phone: 0756097812');
    console.log('  Affilié à: Sarah David\n');

    console.log(`🗑️  Suppression en cours...\n`);

    // 1. Supprimer de Firebase Auth
    try {
      await admin.auth().deleteUser(parentUid);
      console.log(`  ✅ Supprimé de Firebase Auth`);
    } catch (authErr) {
      if (authErr.code === 'auth/user-not-found') {
        console.log(`  ⚠️  Utilisateur non trouvé dans Auth (déjà supprimé?)`);
      } else {
        console.log(`  ⚠️  Erreur Auth: ${authErr.message}`);
      }
    }

    // 2. Supprimer de /users
    await database.ref(`users/${parentUid}`).remove();
    console.log(`  ✅ Supprimé de /users`);

    // 3. Retirer de tous les étudiants
    const universitiesRef = database.ref('universities');
    const snap = await universitiesRef.once('value');

    if (snap.exists()) {
      const universities = snap.val();

      for (const [univId, univData] of Object.entries(universities)) {
        if (univData.students) {
          for (const [studentId, studentData] of Object.entries(univData.students)) {
            if (studentData.parents && Array.isArray(studentData.parents)) {
              const hasThisParent = studentData.parents.some(p => p.id === parentUid);

              if (hasThisParent) {
                const updatedParents = studentData.parents.filter(p => p.id !== parentUid);
                await database.ref(`universities/${univId}/students/${studentId}/parents`).set(updatedParents);
                console.log(`  ✅ Retiré de l'étudiant ${studentData.firstName} ${studentData.lastName}`);
              }
            }
          }
        }
      }
    }

    console.log(`\n✅ Parent ${parentUid} complètement supprimé !`);
    console.log('\n💡 Vérification: lancez "node scripts/checkParentUsers.cjs"\n');

    process.exit(0);

  } catch (err) {
    console.error(`\n❌ Erreur lors de la suppression:`, err);
    process.exit(1);
  }
}

deleteParent();
