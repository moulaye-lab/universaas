import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

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

async function checkStudent() {
  try {
    // Chercher l'étudiant Jade Lambert
    const studentsRef = ref(database, 'universities');
    const snap = await get(studentsRef);
    
    if (snap.exists()) {
      const universities = snap.val();
      
      for (const [univId, univData] of Object.entries(universities)) {
        if (univData.students) {
          for (const [studentId, studentData] of Object.entries(univData.students)) {
            if (studentData.email === 'jade.lambert1@uni.edu') {
              console.log('\n✅ Étudiant trouvé:');
              console.log('Université:', univId);
              console.log('ID étudiant:', studentId);
              console.log('Nom:', studentData.firstName, studentData.lastName);
              console.log('Email:', studentData.email);
              console.log('\nParents affiliés:', JSON.stringify(studentData.parents, null, 2));
              
              if (!studentData.parents || studentData.parents.length === 0) {
                console.log('\n⚠️ Aucun parent trouvé dans le champ "parents"');
                console.log('Champs de l\'étudiant:', Object.keys(studentData));
              }
              
              process.exit(0);
            }
          }
        }
      }
      
      console.log('❌ Étudiant jade.lambert1@uni.edu non trouvé');
    }
    
    process.exit(1);
  } catch (err) {
    console.error('Erreur:', err);
    process.exit(1);
  }
}

checkStudent();
