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

async function listAllStudents() {
  try {
    const universitiesRef = database.ref('universities');
    const snap = await universitiesRef.once('value');

    if (snap.exists()) {
      const universities = snap.val();

      for (const [univId, univData] of Object.entries(universities)) {
        console.log(`\n🏫 Université: ${univId}`);

        if (univData.students) {
          console.log(`\n📚 Total étudiants: ${Object.keys(univData.students).length}\n`);

          for (const [studentId, studentData] of Object.entries(univData.students)) {
            console.log(`-----------------------------------`);
            console.log(`👤 ${studentData.firstName} ${studentData.lastName}`);
            console.log(`   Email: ${studentData.email}`);
            console.log(`   ID: ${studentId}`);

            if (studentData.parents && Array.isArray(studentData.parents)) {
              console.log(`   Parents (${studentData.parents.length}/2):`);
              studentData.parents.forEach((parent, idx) => {
                console.log(`     ${idx + 1}. ${parent.displayName}`);
                console.log(`        Phone: ${parent.phone}`);
                console.log(`        ID: ${parent.id}`);
              });
            } else {
              console.log(`   Parents: Aucun`);
            }
          }
        } else {
          console.log('Aucun étudiant');
        }
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Erreur:', err);
    process.exit(1);
  }
}

listAllStudents();
