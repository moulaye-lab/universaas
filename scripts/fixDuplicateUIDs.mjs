/**
 * fixDuplicateUIDs.mjs - Script de correction des UIDs en doublon
 *
 * Problème: Certains étudiants/enseignants ont été créés avec leur UID Firebase
 * stocké à la fois comme clé ET comme champ `id` dans leurs données.
 * Cela crée des doublons qui perturbent la messagerie.
 *
 * Solution:
 * 1. Scanner tous les étudiants et enseignants
 * 2. Si data.id === key (UID), c'est un doublon
 * 3. Générer un nouvel ID unique pour le profil (student-xxx, teacher-xxx)
 * 4. Créer nouveau noeud avec nouvel ID
 * 5. Mettre à jour toutes les références (grades, messages, etc.)
 * 6. Mettre à jour user.profileId
 * 7. Supprimer ancien noeud
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { readFileSync } from 'fs';

// Charger service account
const serviceAccount = JSON.parse(
  readFileSync('./scripts/service-account.json', 'utf8')
);

// Initialiser Firebase Admin
initializeApp({
  credential: cert(serviceAccount),
  databaseURL: 'https://university-saas-7b31e-default-rtdb.firebaseio.com'
});

const db = getDatabase();

async function fixDuplicateUIDs() {
  try {
    console.log('🔍 Scan des UIDs en doublon...\n');

    // Récupérer toutes les universités
    const universitiesSnap = await db.ref('universities').once('value');
    const universities = universitiesSnap.val();

    if (!universities) {
      console.log('❌ Aucune université trouvée');
      process.exit(0);
    }

    let totalFixed = 0;

    for (const [uniId, uniData] of Object.entries(universities)) {
      console.log(`📚 Université: ${uniData.name || uniId}`);

      // === ÉTUDIANTS ===
      const studentsSnap = await db.ref(`universities/${uniId}/students`).once('value');
      const students = studentsSnap.val();

      if (students) {
        console.log(`\n👥 Vérification des étudiants...`);

        for (const [key, studentData] of Object.entries(students)) {
          // Si la clé (key) EST un UID Firebase (commence par un alphanumeric long)
          // ET qu'il correspond au champ id dans les données
          const isUID = key.length > 20 && !key.startsWith('student-');

          if (isUID && studentData.id === key) {
            console.log(`  ⚠️  Doublon détecté: ${studentData.firstName} ${studentData.lastName}`);
            console.log(`     UID: ${key}`);

            // Générer nouvel ID
            const newId = `student-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            console.log(`     Nouvel ID: ${newId}`);

            // Créer nouveau noeud avec nouvel ID
            const newStudentData = {
              ...studentData,
              id: newId,
              oldUID: key, // Garder trace de l'ancien UID
              migratedAt: Date.now()
            };

            await db.ref(`universities/${uniId}/students/${newId}`).set(newStudentData);

            // Mettre à jour user.profileId
            const userSnap = await db.ref(`users/${key}`).once('value');
            if (userSnap.exists()) {
              await db.ref(`users/${key}`).update({
                profileId: newId,
                updatedAt: Date.now()
              });
              console.log(`     ✅ User profileId mis à jour`);
            }

            // Mettre à jour les grades
            const gradesSnap = await db.ref(`universities/${uniId}/grades`).once('value');
            if (gradesSnap.exists()) {
              const grades = gradesSnap.val();
              let gradesUpdated = 0;

              for (const [gradeId, gradeData] of Object.entries(grades)) {
                if (gradeData.studentId === key) {
                  await db.ref(`universities/${uniId}/grades/${gradeId}`).update({
                    studentId: newId
                  });
                  gradesUpdated++;
                }
              }

              if (gradesUpdated > 0) {
                console.log(`     ✅ ${gradesUpdated} notes mises à jour`);
              }
            }

            // Mettre à jour les messages
            const messagesSnap = await db.ref(`universities/${uniId}/messages`).once('value');
            if (messagesSnap.exists()) {
              const messages = messagesSnap.val();
              let messagesUpdated = 0;

              for (const [msgId, msgData] of Object.entries(messages)) {
                let needUpdate = false;
                const updates = {};

                if (msgData.from === key) {
                  updates.from = newId;
                  needUpdate = true;
                }
                if (msgData.to === key) {
                  updates.to = newId;
                  needUpdate = true;
                }

                if (needUpdate) {
                  await db.ref(`universities/${uniId}/messages/${msgId}`).update(updates);
                  messagesUpdated++;
                }
              }

              if (messagesUpdated > 0) {
                console.log(`     ✅ ${messagesUpdated} messages mis à jour`);
              }
            }

            // Mettre à jour les paiements
            const paymentsSnap = await db.ref(`universities/${uniId}/payments`).once('value');
            if (paymentsSnap.exists()) {
              const payments = paymentsSnap.val();
              let paymentsUpdated = 0;

              for (const [payId, payData] of Object.entries(payments)) {
                if (payData.studentId === key) {
                  await db.ref(`universities/${uniId}/payments/${payId}`).update({
                    studentId: newId
                  });
                  paymentsUpdated++;
                }
              }

              if (paymentsUpdated > 0) {
                console.log(`     ✅ ${paymentsUpdated} paiements mis à jour`);
              }
            }

            // Supprimer ancien noeud
            await db.ref(`universities/${uniId}/students/${key}`).remove();
            console.log(`     ✅ Ancien noeud supprimé\n`);

            totalFixed++;
          }
        }
      }

      // === ENSEIGNANTS ===
      const teachersSnap = await db.ref(`universities/${uniId}/teachers`).once('value');
      const teachers = teachersSnap.val();

      if (teachers) {
        console.log(`\n👨‍🏫 Vérification des enseignants...`);

        for (const [key, teacherData] of Object.entries(teachers)) {
          const isUID = key.length > 20 && !key.startsWith('teacher-');

          if (isUID && teacherData.id === key) {
            console.log(`  ⚠️  Doublon détecté: ${teacherData.firstName} ${teacherData.lastName}`);
            console.log(`     UID: ${key}`);

            // Générer nouvel ID
            const newId = `teacher-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            console.log(`     Nouvel ID: ${newId}`);

            // Créer nouveau noeud
            const newTeacherData = {
              ...teacherData,
              id: newId,
              oldUID: key,
              migratedAt: Date.now()
            };

            await db.ref(`universities/${uniId}/teachers/${newId}`).set(newTeacherData);

            // Mettre à jour user.profileId
            const userSnap = await db.ref(`users/${key}`).once('value');
            if (userSnap.exists()) {
              await db.ref(`users/${key}`).update({
                profileId: newId,
                updatedAt: Date.now()
              });
              console.log(`     ✅ User profileId mis à jour`);
            }

            // Mettre à jour les cours
            const coursesSnap = await db.ref(`universities/${uniId}/courses`).once('value');
            if (coursesSnap.exists()) {
              const courses = coursesSnap.val();
              let coursesUpdated = 0;

              for (const [courseId, courseData] of Object.entries(courses)) {
                if (courseData.teacherId === key) {
                  await db.ref(`universities/${uniId}/courses/${courseId}`).update({
                    teacherId: newId
                  });
                  coursesUpdated++;
                }
              }

              if (coursesUpdated > 0) {
                console.log(`     ✅ ${coursesUpdated} cours mis à jour`);
              }
            }

            // Mettre à jour les grades
            const gradesSnap = await db.ref(`universities/${uniId}/grades`).once('value');
            if (gradesSnap.exists()) {
              const grades = gradesSnap.val();
              let gradesUpdated = 0;

              for (const [gradeId, gradeData] of Object.entries(grades)) {
                if (gradeData.teacherId === key) {
                  await db.ref(`universities/${uniId}/grades/${gradeId}`).update({
                    teacherId: newId
                  });
                  gradesUpdated++;
                }
              }

              if (gradesUpdated > 0) {
                console.log(`     ✅ ${gradesUpdated} notes mises à jour`);
              }
            }

            // Mettre à jour les messages
            const messagesSnap = await db.ref(`universities/${uniId}/messages`).once('value');
            if (messagesSnap.exists()) {
              const messages = messagesSnap.val();
              let messagesUpdated = 0;

              for (const [msgId, msgData] of Object.entries(messages)) {
                let needUpdate = false;
                const updates = {};

                if (msgData.from === key) {
                  updates.from = newId;
                  needUpdate = true;
                }
                if (msgData.to === key) {
                  updates.to = newId;
                  needUpdate = true;
                }

                if (needUpdate) {
                  await db.ref(`universities/${uniId}/messages/${msgId}`).update(updates);
                  messagesUpdated++;
                }
              }

              if (messagesUpdated > 0) {
                console.log(`     ✅ ${messagesUpdated} messages mis à jour`);
              }
            }

            // Supprimer ancien noeud
            await db.ref(`universities/${uniId}/teachers/${key}`).remove();
            console.log(`     ✅ Ancien noeud supprimé\n`);

            totalFixed++;
          }
        }
      }

      console.log(`\n`);
    }

    console.log(`\n✨ Terminé ! ${totalFixed} doublons corrigés.\n`);
    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

fixDuplicateUIDs();
