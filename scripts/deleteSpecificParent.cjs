const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: '.env.local' });

const serviceAccountPath = path.join(__dirname, 'service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.cert(serviceAccount),
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
});

const db = require('firebase-admin/database');
const database = db.getDatabase();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function deleteParent(parentUid) {
  try {
    console.log(`\n🗑️  Suppression du parent ${parentUid}...`);

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

    console.log(`\n✅ Parent ${parentUid} complètement supprimé\n`);
    return true;

  } catch (err) {
    console.error(`\n❌ Erreur lors de la suppression:`, err);
    return false;
  }
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🗑️  SUPPRESSION DE PARENT SPÉCIFIQUE');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('📋 Parents avec displayName "v@parent.fr":\n');

  console.log('Parent 1:');
  console.log('  UID: kRVi6oLW5sOCIHUFiNDHS7jzG6l2');
  console.log('  DisplayName: v@parent.fr');
  console.log('  Email: v@parent.fr');
  console.log('  Phone: 0756097812');
  console.log('  Affilié à: Sarah David\n');

  console.log('Parent 2:');
  console.log('  UID: 6LLjroO53EQ54mr6wjZ6ZvR2UqX2');
  console.log('  DisplayName: v@parent.fr');
  console.log('  Email: v@parent2.fr');
  console.log('  Phone: 0758903300');
  console.log('  Affilié à: Sophie Petit\n');

  const choice = await question('Quel parent voulez-vous SUPPRIMER? (1 ou 2, ou "cancel" pour annuler): ');

  if (choice.toLowerCase() === 'cancel') {
    console.log('\n❌ Opération annulée');
    rl.close();
    process.exit(0);
    return;
  }

  let parentToDelete = null;
  let parentName = '';

  if (choice === '1') {
    parentToDelete = 'kRVi6oLW5sOCIHUFiNDHS7jzG6l2';
    parentName = 'v@parent.fr (Email: v@parent.fr, Phone: 0756097812, Sarah David)';
  } else if (choice === '2') {
    parentToDelete = '6LLjroO53EQ54mr6wjZ6ZvR2UqX2';
    parentName = 'v@parent.fr (Email: v@parent2.fr, Phone: 0758903300, Sophie Petit)';
  } else {
    console.log('\n❌ Choix invalide');
    rl.close();
    process.exit(1);
    return;
  }

  const confirm = await question(`\n⚠️  CONFIRMER la suppression de:\n${parentName}\n\n(oui/non): `);

  if (confirm.toLowerCase() !== 'oui') {
    console.log('\n❌ Suppression annulée');
    rl.close();
    process.exit(0);
    return;
  }

  await deleteParent(parentToDelete);

  console.log('\n✅ Opération terminée !');
  console.log('\n💡 Vous pouvez lancer "node scripts/checkParentUsers.cjs" pour vérifier.\n');

  rl.close();
  process.exit(0);
}

main();
