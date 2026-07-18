#!/usr/bin/env node
/**
 * assignGradesToStudent.mjs
 * Assigne des notes S1 et S2 à l'étudiant existant
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyB7z-oH9_sYBUSINFNhRnOGZWqxgjfG5yQ",
  authDomain: "university-saas-7b31e.firebaseapp.com",
  databaseURL: "https://university-saas-7b31e-default-rtdb.firebaseio.com",
  projectId: "university-saas-7b31e",
  storageBucket: "university-saas-7b31e.firebasestorage.app",
  messagingSenderId: "820244927690",
  appId: "1:820244927690:web:8ab2e2b2c5be73c21aa7d9"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const UNIVERSITY_ID = 'univ-nice-sophia-2026';
const STUDENT_ID = '9VUwJwBJn3US9gou2ff9pjlSNzE3';
const ADMIN_UID = 'yetxF049XFgATjEsOMhyEcUuTx12';

const COURSES = [
  {
    id: '-OxpRKMkqU4JEPOlQIuN',
    name: 'Analyse I',
    credits: 6
  },
  {
    id: '-OxpRVHsyd3RDfhjcUPq',
    name: 'Analyse II',
    credits: 6
  }
];

async function assignGrades() {
  try {
    console.log('📝 Attribution des notes à l\'étudiant...\n');

    for (const course of COURSES) {
      // Note Semestre 1
      const gradeS1Id = `grade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const gradeS1 = {
        id: gradeS1Id,
        studentId: STUDENT_ID,
        courseId: course.id,
        courseName: course.name,
        semester: 1,
        value: Math.floor(Math.random() * 5) + 13, // Entre 13 et 17
        coefficient: course.credits,
        evaluationType: 'exam',
        createdAt: Date.now(),
        createdBy: ADMIN_UID,
        universityId: UNIVERSITY_ID
      };

      await set(ref(database, `universities/${UNIVERSITY_ID}/grades/${gradeS1Id}`), gradeS1);
      console.log(`  ✅ S1 - ${course.name}: ${gradeS1.value}/20`);

      // Petit délai pour éviter collision des IDs
      await new Promise(resolve => setTimeout(resolve, 10));

      // Note Semestre 2
      const gradeS2Id = `grade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const gradeS2 = {
        id: gradeS2Id,
        studentId: STUDENT_ID,
        courseId: course.id,
        courseName: course.name,
        semester: 2,
        value: Math.floor(Math.random() * 5) + 13, // Entre 13 et 17
        coefficient: course.credits,
        evaluationType: 'exam',
        createdAt: Date.now(),
        createdBy: ADMIN_UID,
        universityId: UNIVERSITY_ID
      };

      await set(ref(database, `universities/${UNIVERSITY_ID}/grades/${gradeS2Id}`), gradeS2);
      console.log(`  ✅ S2 - ${course.name}: ${gradeS2.value}/20\n`);

      await new Promise(resolve => setTimeout(resolve, 10));
    }

    console.log('✅ Notes assignées avec succès !');
    console.log('\n🧪 Teste sur: http://localhost:5173/admin/academic-promotion');

  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  }
}

assignGrades()
  .then(() => {
    console.log('\n✅ Script terminé');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Échec:', err);
    process.exit(1);
  });
