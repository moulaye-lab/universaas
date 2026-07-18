#!/usr/bin/env node
/**
 * addAcademicYearToCourses.mjs
 * Ajoute le champ academicYear aux cours existants
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, update } from 'firebase/database';

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
const ACADEMIC_YEAR = '2025-2026';

async function addAcademicYearToCourses() {
  try {
    console.log(`🔧 Ajout academicYear aux cours de ${UNIVERSITY_ID}...`);

    // Lire tous les cours
    const coursesRef = ref(database, `universities/${UNIVERSITY_ID}/courses`);
    const snapshot = await get(coursesRef);

    if (!snapshot.exists()) {
      console.log('❌ Aucun cours trouvé');
      return;
    }

    const courses = snapshot.val();
    const courseIds = Object.keys(courses);

    console.log(`📚 ${courseIds.length} cours trouvés`);

    // Mettre à jour chaque cours
    const updates = {};

    courseIds.forEach(courseId => {
      const course = courses[courseId];

      // Si le cours n'a pas déjà academicYear
      if (!course.academicYear) {
        updates[`universities/${UNIVERSITY_ID}/courses/${courseId}/academicYear`] = ACADEMIC_YEAR;
        console.log(`  ✅ ${course.courseName || course.name} - Ajout academicYear: ${ACADEMIC_YEAR}`);
      } else {
        console.log(`  ⏭️  ${course.courseName || course.name} - Déjà présent: ${course.academicYear}`);
      }
    });

    if (Object.keys(updates).length === 0) {
      console.log('\n✅ Tous les cours ont déjà academicYear');
      return;
    }

    // Appliquer toutes les mises à jour
    await update(ref(database), updates);

    console.log(`\n✅ ${Object.keys(updates).length} cours mis à jour avec succès`);

  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  }
}

addAcademicYearToCourses()
  .then(() => {
    console.log('\n✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Échec du script:', err);
    process.exit(1);
  });
