/**
 * seedGrades.mjs - Générer notes de test pour tous les étudiants
 *
 * Usage: node scripts/seedGrades.mjs
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, push } from 'firebase/database';
import { config } from 'dotenv';

config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Générer note aléatoire avec distribution réaliste
function generateGrade() {
  const rand = Math.random();

  // 60% entre 10-16 (admis)
  if (rand < 0.6) {
    return Math.floor(Math.random() * 7) + 10; // 10-16
  }
  // 30% entre 7-9 (limite)
  else if (rand < 0.9) {
    return Math.floor(Math.random() * 3) + 7; // 7-9
  }
  // 10% entre 16-20 (excellent)
  else {
    return Math.floor(Math.random() * 5) + 16; // 16-20
  }
}

async function seedGrades() {
  try {
    console.log('🎯 Génération des notes de test...\n');

    // Récupérer toutes les universités
    const universitiesRef = ref(database, 'universities');
    const universitiesSnap = await get(universitiesRef);

    if (!universitiesSnap.exists()) {
      console.log('❌ Aucune université trouvée');
      return;
    }

    const universities = universitiesSnap.val();

    for (const [universityId, universityData] of Object.entries(universities)) {
      console.log(`\n📚 Université: ${universityData.name || universityId}`);

      // Récupérer étudiants
      const studentsRef = ref(database, `universities/${universityId}/students`);
      const studentsSnap = await get(studentsRef);

      if (!studentsSnap.exists()) {
        console.log('  ⚠️  Aucun étudiant trouvé');
        continue;
      }

      const students = studentsSnap.val();

      // Récupérer cours
      const coursesRef = ref(database, `universities/${universityId}/courses`);
      const coursesSnap = await get(coursesRef);

      let courses = [];
      if (coursesSnap.exists()) {
        courses = Object.entries(coursesSnap.val()).map(([id, data]) => ({
          id,
          ...data
        }));
      }

      if (courses.length === 0) {
        console.log('  ⚠️  Aucun cours trouvé, création de cours par défaut...');

        // Créer 5 cours de base
        const defaultCourses = [
          { name: 'Mathématiques', code: 'MATH101', credits: 6, coefficient: 3 },
          { name: 'Physique', code: 'PHYS101', credits: 6, coefficient: 3 },
          { name: 'Informatique', code: 'INFO101', credits: 6, coefficient: 3 },
          { name: 'Anglais', code: 'ANG101', credits: 3, coefficient: 2 },
          { name: 'Communication', code: 'COM101', credits: 3, coefficient: 1 }
        ];

        for (const course of defaultCourses) {
          const courseRef = push(ref(database, `universities/${universityId}/courses`));
          await set(courseRef, {
            ...course,
            createdAt: Date.now()
          });
          courses.push({ id: courseRef.key, ...course });
        }
        console.log(`  ✅ ${defaultCourses.length} cours créés`);
      }

      console.log(`  📖 ${courses.length} cours trouvés`);

      // Générer notes pour chaque étudiant
      let gradesCount = 0;

      for (const [studentId, student] of Object.entries(students)) {
        if (student.status === 'inactive' || student.status === 'graduated') {
          continue;
        }

        // 3-4 notes par semestre et par cours
        for (const course of courses) {
          // Semestre 1
          for (let i = 0; i < 3; i++) {
            const gradeRef = push(ref(database, `universities/${universityId}/grades`));
            await set(gradeRef, {
              studentId,
              studentName: `${student.firstName} ${student.lastName}`,
              courseId: course.id,
              courseName: course.name,
              value: generateGrade(),
              coefficient: course.coefficient || 1,
              semester: 1,
              academicYear: '2025-2026',
              type: i === 0 ? 'exam' : (i === 1 ? 'homework' : 'participation'),
              date: Date.now() - (Math.random() * 90 * 24 * 60 * 60 * 1000), // 0-90 jours
              createdAt: Date.now(),
              createdBy: 'seed-script'
            });
            gradesCount++;
          }

          // Semestre 2
          for (let i = 0; i < 3; i++) {
            const gradeRef = push(ref(database, `universities/${universityId}/grades`));
            await set(gradeRef, {
              studentId,
              studentName: `${student.firstName} ${student.lastName}`,
              courseId: course.id,
              courseName: course.name,
              value: generateGrade(),
              coefficient: course.coefficient || 1,
              semester: 2,
              academicYear: '2025-2026',
              type: i === 0 ? 'exam' : (i === 1 ? 'homework' : 'participation'),
              date: Date.now() - (Math.random() * 30 * 24 * 60 * 60 * 1000), // 0-30 jours
              createdAt: Date.now(),
              createdBy: 'seed-script'
            });
            gradesCount++;
          }
        }
      }

      console.log(`  ✅ ${gradesCount} notes générées pour ${Object.keys(students).length} étudiants`);
    }

    console.log('\n✅ Génération terminée avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

seedGrades();
