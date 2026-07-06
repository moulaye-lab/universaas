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

async function checkParentUsers() {
  try {
    const usersRef = database.ref('users');
    const snap = await usersRef.once('value');

    if (snap.exists()) {
      const users = snap.val();
      const parents = [];

      for (const [uid, userData] of Object.entries(users)) {
        if (userData.role === 'parent') {
          parents.push({
            uid,
            ...userData
          });
        }
      }

      console.log(`\n📊 Total parents trouvés: ${parents.length}\n`);

      parents.forEach(parent => {
        console.log(`-----------------------------------`);
        console.log(`👤 ${parent.displayName}`);
        console.log(`   Email: ${parent.email}`);
        console.log(`   Phone: ${parent.phone}`);
        console.log(`   UID: ${parent.uid}`);
        console.log(`   UniversityId: ${parent.universityId}`);

        if (parent.childrenAccess) {
          console.log(`   Children Access:`);
          for (const [univId, children] of Object.entries(parent.childrenAccess)) {
            console.log(`     Université: ${univId}`);
            for (const [studentId, access] of Object.entries(children)) {
              console.log(`       - Student ID: ${studentId} (${access ? 'Oui' : 'Non'})`);
            }
          }
        } else {
          console.log(`   Children Access: Aucun`);
        }
      });
    }

    process.exit(0);
  } catch (err) {
    console.error('Erreur:', err);
    process.exit(1);
  }
}

checkParentUsers();
