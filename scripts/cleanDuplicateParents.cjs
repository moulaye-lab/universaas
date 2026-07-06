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

async function findDuplicateParents() {
  console.log('\n🔍 Recherche des parents en double...\n');

  try {
    const universitiesRef = database.ref('universities');
    const snap = await universitiesRef.once('value');

    if (!snap.exists()) {
      console.log('❌ Aucune université trouvée');
      return { emailDuplicates: [], phoneDuplicates: [] };
    }

    const universities = snap.val();
    const parentsMap = new Map(); // Map<parentId, parentFullData>

    // Collecter tous les parents
    for (const [univId, univData] of Object.entries(universities)) {
      if (univData.students) {
        for (const [studentId, studentData] of Object.entries(univData.students)) {
          if (studentData.parents && Array.isArray(studentData.parents)) {
            for (const parent of studentData.parents) {
              if (!parentsMap.has(parent.id)) {
                // Charger les données complètes du parent
                const parentRef = database.ref(`users/${parent.id}`);
                const parentSnap = await parentRef.once('value');

                if (parentSnap.exists()) {
                  const parentData = parentSnap.val();
                  parentsMap.set(parent.id, {
                    uid: parent.id,
                    ...parentData,
                    affiliations: [{
                      univId,
                      studentId,
                      studentName: `${studentData.firstName} ${studentData.lastName}`
                    }]
                  });
                } else {
                  parentsMap.set(parent.id, {
                    uid: parent.id,
                    displayName: parent.displayName,
                    phone: parent.phone,
                    email: 'UNKNOWN',
                    affiliations: [{
                      univId,
                      studentId,
                      studentName: `${studentData.firstName} ${studentData.lastName}`
                    }]
                  });
                }
              } else {
                // Ajouter l'affiliation à un parent existant
                parentsMap.get(parent.id).affiliations.push({
                  univId,
                  studentId,
                  studentName: `${studentData.firstName} ${studentData.lastName}`
                });
              }
            }
          }
        }
      }
    }

    // Détecter les doublons par email
    const emailGroups = new Map();
    const phoneGroups = new Map();

    for (const parent of parentsMap.values()) {
      // Grouper par email
      if (parent.email && parent.email !== 'UNKNOWN') {
        if (!emailGroups.has(parent.email)) {
          emailGroups.set(parent.email, []);
        }
        emailGroups.get(parent.email).push(parent);
      }

      // Grouper par téléphone
      if (parent.phone) {
        if (!phoneGroups.has(parent.phone)) {
          phoneGroups.set(parent.phone, []);
        }
        phoneGroups.get(parent.phone).push(parent);
      }
    }

    // Filtrer pour garder uniquement les doublons
    const emailDuplicates = Array.from(emailGroups.entries())
      .filter(([email, parents]) => parents.length > 1)
      .map(([email, parents]) => ({ email, parents }));

    const phoneDuplicates = Array.from(phoneGroups.entries())
      .filter(([phone, parents]) => parents.length > 1)
      .map(([phone, parents]) => ({ phone, parents }));

    return { emailDuplicates, phoneDuplicates };

  } catch (err) {
    console.error('❌ Erreur:', err);
    return { emailDuplicates: [], phoneDuplicates: [] };
  }
}

async function displayDuplicates(emailDuplicates, phoneDuplicates) {
  if (emailDuplicates.length === 0 && phoneDuplicates.length === 0) {
    console.log('✅ Aucun doublon détecté !');
    return;
  }

  console.log('\n📊 RAPPORT DES DOUBLONS\n');
  console.log('═══════════════════════════════════════════════════════\n');

  if (emailDuplicates.length > 0) {
    console.log(`🔴 ${emailDuplicates.length} email(s) en double:\n`);

    emailDuplicates.forEach((dup, index) => {
      console.log(`\n--- DOUBLON EMAIL #${index + 1}: ${dup.email} ---`);
      dup.parents.forEach((parent, idx) => {
        console.log(`\n  Parent ${idx + 1}:`);
        console.log(`    UID: ${parent.uid}`);
        console.log(`    Nom: ${parent.displayName}`);
        console.log(`    Téléphone: ${parent.phone || 'NON DÉFINI'}`);
        console.log(`    Email: ${parent.email}`);
        console.log(`    Enfants affiliés (${parent.affiliations.length}):`);
        parent.affiliations.forEach(aff => {
          console.log(`      - ${aff.studentName} (${aff.studentId})`);
        });
      });
    });
  }

  if (phoneDuplicates.length > 0) {
    console.log(`\n\n🔴 ${phoneDuplicates.length} téléphone(s) en double:\n`);

    phoneDuplicates.forEach((dup, index) => {
      console.log(`\n--- DOUBLON TÉLÉPHONE #${index + 1}: ${dup.phone} ---`);
      dup.parents.forEach((parent, idx) => {
        console.log(`\n  Parent ${idx + 1}:`);
        console.log(`    UID: ${parent.uid}`);
        console.log(`    Nom: ${parent.displayName}`);
        console.log(`    Téléphone: ${parent.phone}`);
        console.log(`    Email: ${parent.email || 'NON DÉFINI'}`);
        console.log(`    Enfants affiliés (${parent.affiliations.length}):`);
        parent.affiliations.forEach(aff => {
          console.log(`      - ${aff.studentName} (${aff.studentId})`);
        });
      });
    });
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
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
        throw authErr;
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

async function cleanDuplicates() {
  const { emailDuplicates, phoneDuplicates } = await findDuplicateParents();

  await displayDuplicates(emailDuplicates, phoneDuplicates);

  if (emailDuplicates.length === 0 && phoneDuplicates.length === 0) {
    rl.close();
    process.exit(0);
    return;
  }

  console.log('\n⚠️  ATTENTION: Cette opération va supprimer des comptes parents.\n');
  console.log('📝 Pour chaque doublon, vous devrez choisir quel parent GARDER et lequel SUPPRIMER.\n');

  const proceed = await question('Voulez-vous continuer? (oui/non): ');

  if (proceed.toLowerCase() !== 'oui') {
    console.log('\n❌ Opération annulée');
    rl.close();
    process.exit(0);
    return;
  }

  // Traiter les doublons d'email
  for (const dup of emailDuplicates) {
    console.log(`\n\n═══════════════════════════════════════════════════════`);
    console.log(`📧 DOUBLON EMAIL: ${dup.email}`);
    console.log(`═══════════════════════════════════════════════════════\n`);

    dup.parents.forEach((parent, idx) => {
      console.log(`\nParent ${idx + 1}:`);
      console.log(`  UID: ${parent.uid}`);
      console.log(`  Nom: ${parent.displayName}`);
      console.log(`  Téléphone: ${parent.phone || 'NON DÉFINI'}`);
      console.log(`  Enfants: ${parent.affiliations.map(a => a.studentName).join(', ')}`);
    });

    const toDelete = await question(`\nQuel parent voulez-vous SUPPRIMER? (1-${dup.parents.length}, ou "skip" pour passer): `);

    if (toDelete.toLowerCase() === 'skip') {
      console.log('⏭️  Doublon ignoré');
      continue;
    }

    const parentIndex = parseInt(toDelete) - 1;
    if (parentIndex >= 0 && parentIndex < dup.parents.length) {
      const parentToDelete = dup.parents[parentIndex];
      const confirm = await question(`\n⚠️  CONFIRMER la suppression de "${parentToDelete.displayName}" (${parentToDelete.uid})? (oui/non): `);

      if (confirm.toLowerCase() === 'oui') {
        await deleteParent(parentToDelete.uid);
      } else {
        console.log('❌ Suppression annulée pour ce parent');
      }
    } else {
      console.log('❌ Choix invalide, doublon ignoré');
    }
  }

  // Traiter les doublons de téléphone
  for (const dup of phoneDuplicates) {
    console.log(`\n\n═══════════════════════════════════════════════════════`);
    console.log(`📱 DOUBLON TÉLÉPHONE: ${dup.phone}`);
    console.log(`═══════════════════════════════════════════════════════\n`);

    dup.parents.forEach((parent, idx) => {
      console.log(`\nParent ${idx + 1}:`);
      console.log(`  UID: ${parent.uid}`);
      console.log(`  Nom: ${parent.displayName}`);
      console.log(`  Email: ${parent.email || 'NON DÉFINI'}`);
      console.log(`  Enfants: ${parent.affiliations.map(a => a.studentName).join(', ')}`);
    });

    const toDelete = await question(`\nQuel parent voulez-vous SUPPRIMER? (1-${dup.parents.length}, ou "skip" pour passer): `);

    if (toDelete.toLowerCase() === 'skip') {
      console.log('⏭️  Doublon ignoré');
      continue;
    }

    const parentIndex = parseInt(toDelete) - 1;
    if (parentIndex >= 0 && parentIndex < dup.parents.length) {
      const parentToDelete = dup.parents[parentIndex];
      const confirm = await question(`\n⚠️  CONFIRMER la suppression de "${parentToDelete.displayName}" (${parentToDelete.uid})? (oui/non): `);

      if (confirm.toLowerCase() === 'oui') {
        await deleteParent(parentToDelete.uid);
      } else {
        console.log('❌ Suppression annulée pour ce parent');
      }
    } else {
      console.log('❌ Choix invalide, doublon ignoré');
    }
  }

  console.log('\n\n✅ Nettoyage terminé !');
  console.log('\n💡 Lancez à nouveau ce script pour vérifier qu\'il ne reste plus de doublons.\n');

  rl.close();
  process.exit(0);
}

cleanDuplicates();
