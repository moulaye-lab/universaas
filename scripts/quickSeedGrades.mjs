/**
 * quickSeedGrades.mjs - Génération rapide de notes avec Service Account
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

async function seedGrades() {
  try {
    console.log('🎯 Génération automatique des notes...\n');

    // Récupérer toutes les universités
    const universitiesSnap = await db.ref('universities').once('value');
    const universities = universitiesSnap.val();

    if (!universities) {
      console.log('❌ Aucune université trouvée');
      process.exit(0);
    }

    for (const [uniId, uniData] of Object.entries(universities)) {
      console.log(`📚 ${uniData.name || uniId}`);

      // Récupérer étudiants
      const studentsSnap = await db.ref(`universities/${uniId}/students`).once('value');
      const students = studentsSnap.val();

      if (!students) {
        console.log('  ⚠️  Aucun étudiant');
        continue;
      }

      const studentsList = Object.entries(students)
        .filter(([id, s]) => s.status !== 'inactive' && s.status !== 'graduated')
        .slice(0, 10); // Limiter à 10 étudiants pour le test

      console.log(`  👥 ${studentsList.length} étudiants actifs`);

      // Cours par défaut
      const courses = [
        { id: 'math-101', name: 'Mathématiques', coef: 3 },
        { id: 'phys-101', name: 'Physique', coef: 3 },
        { id: 'info-101', name: 'Informatique', coef: 3 },
        { id: 'ang-101', name: 'Anglais', coef: 2 }
      ];

      let gradesCount = 0;
      const gradesRef = db.ref(`universities/${uniId}/grades`);

      for (const [studentId, student] of studentsList) {
        // Pour chaque cours
        for (const course of courses) {
          // Semestre 1: 2-3 notes
          for (let i = 0; i < 3; i++) {
            const grade = Math.floor(Math.random() * 10) + 8; // 8-17
            await gradesRef.push({
              studentId,
              studentName: `${student.firstName} ${student.lastName}`,
              courseId: course.id,
              courseName: course.name,
              value: grade,
              coefficient: course.coef,
              semester: 1,
              academicYear: '2025-2026',
              type: i === 0 ? 'exam' : (i === 1 ? 'homework' : 'quiz'),
              date: Date.now() - (Math.random() * 90 * 24 * 60 * 60 * 1000),
              createdAt: Date.now(),
              createdBy: 'seed-admin'
            });
            gradesCount++;
          }

          // Semestre 2: 2-3 notes
          for (let i = 0; i < 3; i++) {
            const grade = Math.floor(Math.random() * 10) + 8; // 8-17
            await gradesRef.push({
              studentId,
              studentName: `${student.firstName} ${student.lastName}`,
              courseId: course.id,
              courseName: course.name,
              value: grade,
              coefficient: course.coef,
              semester: 2,
              academicYear: '2025-2026',
              type: i === 0 ? 'exam' : (i === 1 ? 'homework' : 'quiz'),
              date: Date.now() - (Math.random() * 30 * 24 * 60 * 60 * 1000),
              createdAt: Date.now(),
              createdBy: 'seed-admin'
            });
            gradesCount++;
          }
        }
      }

      console.log(`  ✅ ${gradesCount} notes créées\n`);
    }

    console.log('✨ Terminé ! Rafraîchissez votre application.\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

seedGrades();
