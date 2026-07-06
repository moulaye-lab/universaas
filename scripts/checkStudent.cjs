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

async function checkStudent() {
  try {
    const universitiesRef = database.ref('universities');
    const snap = await universitiesRef.once('value');

    if (snap.exists()) {
      const universities = snap.val();

      for (const [univId, univData] of Object.entries(universities)) {
        if (univData.students) {
          for (const [studentId, studentData] of Object.entries(univData.students)) {
            if (studentData.email && studentData.email.includes('jade.lambert')) {
              console.log('\n✅ Étudiant trouvé:');
              console.log('Université:', univId);
              console.log('ID étudiant:', studentId);
              console.log('Nom:', studentData.firstName, studentData.lastName);
              console.log('Email:', studentData.email);
              console.log('\n📋 Champ "parents":', JSON.stringify(studentData.parents, null, 2));

              if (!studentData.parents) {
                console.log('\n⚠️ Le champ "parents" n\'existe pas');
              } else if (studentData.parents.length === 0) {
                console.log('\n⚠️ Le champ "parents" est vide []');
              }

              process.exit(0);
            }
          }
        }
      }

      console.log('❌ Étudiant Jade Lambert non trouvé');
    }

    process.exit(1);
  } catch (err) {
    console.error('Erreur:', err);
    process.exit(1);
  }
}

checkStudent();
