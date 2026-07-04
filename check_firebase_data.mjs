import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';
import dotenv from 'dotenv';

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

async function checkData() {
  console.log('\n🔍 Vérification données Firebase...\n');

  // Vérifier les étudiants
  const studentsRef = ref(database, 'universities/univ-sorbonne-2026/students');
  const studentsSnap = await get(studentsRef);

  if (studentsSnap.exists()) {
    const students = studentsSnap.val();
    console.log('📚 Étudiants:');
    Object.keys(students).forEach(id => {
      console.log(`  ${id}: ${students[id].firstName} ${students[id].lastName}`);
    });
  } else {
    console.log('❌ Aucun étudiant');
  }

  // Vérifier les notes
  const gradesRef = ref(database, 'universities/univ-sorbonne-2026/grades');
  const gradesSnap = await get(gradesRef);

  if (gradesSnap.exists()) {
    const grades = gradesSnap.val();
    console.log('\n📝 Notes:');
    Object.keys(grades).forEach(id => {
      console.log(`  ${id}: ${Object.keys(grades[id]).length} cours`);
    });
  } else {
    console.log('\n❌ Aucune note');
  }

  // Vérifier user étudiant
  const usersRef = ref(database, 'users');
  const usersSnap = await get(usersRef);

  if (usersSnap.exists()) {
    const users = usersSnap.val();
    console.log('\n👤 User étudiant:');
    Object.keys(users).forEach(uid => {
      if (users[uid].role === 'student') {
        console.log(`  UID: ${uid}`);
        console.log(`  Email: ${users[uid].email}`);
        console.log(`  profileId: ${users[uid].profileId || 'NON DÉFINI'}`);
      }
    });
  }

  process.exit(0);
}

checkData().catch(console.error);
