/**
 * Script simplifié pour ajouter 10 cours, assigner 5 à un enseignant et inscrire des étudiants
 * Usage: node scripts/addCoursesAndAssignSimple.js
 */

import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Démarrage du script...\n');

// Configuration Firebase depuis .env.local
const envPath = join(__dirname, '..', '.env.local');
let firebaseConfig = {};

try {
  const envContent = readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');

  lines.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      const cleanKey = key.trim();
      const cleanValue = value.trim().replace(/['"]/g, '');

      if (cleanKey === 'VITE_FIREBASE_DATABASE_URL') {
        firebaseConfig.databaseURL = cleanValue;
      } else if (cleanKey === 'VITE_FIREBASE_PROJECT_ID') {
        firebaseConfig.projectId = cleanValue;
      }
    }
  });

  console.log('✅ Configuration Firebase chargée');
  console.log(`   Project ID: ${firebaseConfig.projectId}\n`);

} catch (error) {
  console.error('❌ Erreur lors de la lecture de .env.local');
  process.exit(1);
}

// Initialiser Firebase Admin
const app = initializeApp({
  databaseURL: firebaseConfig.databaseURL,
  projectId: firebaseConfig.projectId
});

const db = getDatabase(app);

// Email de l'enseignant à chercher
const TEACHER_EMAIL = 'enseignant.test@nice.fr';

// Données des 10 nouveaux cours
const coursesData = [
  {
    name: 'Intelligence Artificielle Avancée',
    code: 'IA-401',
    description: 'Apprentissage profond, réseaux de neurones et applications pratiques',
    credits: 6,
    level: 'Master 1',
    semester: 1,
    department: 'Informatique',
    capacity: 30
  },
  {
    name: 'Blockchain et Cryptomonnaies',
    code: 'BC-301',
    description: 'Technologies blockchain, smart contracts et applications décentralisées',
    credits: 4,
    level: 'Licence 3',
    semester: 2,
    department: 'Informatique',
    capacity: 40
  },
  {
    name: 'Cybersécurité Appliquée',
    code: 'CS-402',
    description: 'Sécurité des systèmes, cryptographie et tests de pénétration',
    credits: 5,
    level: 'Master 1',
    semester: 1,
    department: 'Informatique',
    capacity: 25
  },
  {
    name: 'Data Science et Big Data',
    code: 'DS-501',
    description: 'Analyse de données massives, machine learning et visualisation',
    credits: 6,
    level: 'Master 2',
    semester: 1,
    department: 'Informatique',
    capacity: 35
  },
  {
    name: 'Cloud Computing et DevOps',
    code: 'CC-403',
    description: 'Infrastructure cloud, conteneurisation et intégration continue',
    credits: 5,
    level: 'Master 1',
    semester: 2,
    department: 'Informatique',
    capacity: 30
  },
  {
    name: 'Réalité Virtuelle et Augmentée',
    code: 'VR-302',
    description: 'Technologies immersives, Unity, développement 3D interactif',
    credits: 4,
    level: 'Licence 3',
    semester: 2,
    department: 'Informatique',
    capacity: 20
  },
  {
    name: 'IoT et Systèmes Embarqués',
    code: 'IOT-303',
    description: 'Internet des objets, capteurs, Arduino et applications pratiques',
    credits: 4,
    level: 'Licence 3',
    semester: 1,
    department: 'Informatique',
    capacity: 25
  },
  {
    name: 'Architecture Microservices',
    code: 'AMS-502',
    description: 'Design patterns, API REST, gRPC et orchestration de services',
    credits: 5,
    level: 'Master 2',
    semester: 1,
    department: 'Informatique',
    capacity: 30
  },
  {
    name: 'Programmation Quantique',
    code: 'QC-503',
    description: 'Informatique quantique, Qiskit et algorithmes quantiques',
    credits: 6,
    level: 'Master 2',
    semester: 2,
    department: 'Physique',
    capacity: 15
  },
  {
    name: 'Éthique et IA Responsable',
    code: 'ETH-404',
    description: 'Enjeux éthiques, biais algorithmiques et régulation de l\'IA',
    credits: 3,
    level: 'Master 1',
    semester: 2,
    department: 'Informatique',
    capacity: 40
  }
];

async function findTeacherByEmail(email) {
  console.log(`🔍 Recherche de l'enseignant ${email}...`);

  const usersRef = db.ref('users');
  const snapshot = await usersRef.once('value');

  if (snapshot.exists()) {
    const users = snapshot.val();
    for (const [uid, userData] of Object.entries(users)) {
      if (userData.email === email && userData.role === 'teacher') {
        console.log(`✅ Enseignant trouvé: ${userData.displayName} (${uid})`);
        return { uid, ...userData };
      }
    }
  }

  console.error(`❌ Enseignant non trouvé avec l'email ${email}`);
  return null;
}

async function findStudents(universityId, count = 2) {
  console.log(`🔍 Recherche de ${count} étudiants dans l'université...`);

  const studentsRef = db.ref(`universities/${universityId}/students`);
  const snapshot = await studentsRef.once('value');

  if (snapshot.exists()) {
    const studentsData = snapshot.val();
    const students = Object.entries(studentsData)
      .map(([id, data]) => ({ id, ...data }))
      .slice(0, count);

    console.log(`✅ ${students.length} étudiant(s) trouvé(s):`);
    students.forEach(s => console.log(`   - ${s.firstName} ${s.lastName}`));

    return students;
  }

  console.error(`❌ Aucun étudiant trouvé`);
  return [];
}

async function createCourses(universityId) {
  console.log(`\n📚 Création de ${coursesData.length} cours...`);

  const coursesRef = db.ref(`universities/${universityId}/courses`);
  const createdCourses = [];

  for (let i = 0; i < coursesData.length; i++) {
    const courseData = coursesData[i];
    const newCourseRef = coursesRef.push();

    await newCourseRef.set({
      id: newCourseRef.key,
      ...courseData,
      teacherId: null,
      teacherName: null,
      enrolledStudents: [],
      academicYear: '2025-2026',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    createdCourses.push({ id: newCourseRef.key, ...courseData });
    console.log(`   ✓ ${i + 1}. ${courseData.name} (${courseData.code})`);
  }

  console.log(`✅ ${createdCourses.length} cours créés avec succès`);
  return createdCourses;
}

async function assignCoursesToTeacher(universityId, teacher, courses) {
  console.log(`\n👨‍🏫 Assignation de 5 cours à ${teacher.displayName}...`);

  const coursesToAssign = courses.slice(0, 5);

  for (let i = 0; i < coursesToAssign.length; i++) {
    const course = coursesToAssign[i];
    const courseRef = db.ref(`universities/${universityId}/courses/${course.id}`);

    await courseRef.update({
      teacherId: teacher.uid,
      teacherName: teacher.displayName,
      updatedAt: Date.now()
    });

    console.log(`   ✓ ${i + 1}. ${course.name} assigné`);
  }

  console.log(`✅ ${coursesToAssign.length} cours assignés à l'enseignant`);
  return coursesToAssign;
}

async function enrollStudentsInCourses(universityId, courses, students) {
  console.log(`\n👥 Inscription de ${students.length} étudiants à chaque cours...`);

  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];
    console.log(`\n   Cours ${i + 1}: ${course.name}`);

    const courseRef = db.ref(`universities/${universityId}/courses/${course.id}`);
    const studentIds = students.map(s => s.id);

    // Ajouter les étudiants au cours
    await courseRef.update({
      enrolledStudents: studentIds,
      updatedAt: Date.now()
    });

    // Ajouter le cours à chaque étudiant
    for (const student of students) {
      const studentRef = db.ref(`universities/${universityId}/students/${student.id}`);
      const snapshot = await studentRef.once('value');
      const studentData = snapshot.val();

      const currentCourses = studentData.enrolledCourses || [];
      if (!currentCourses.includes(course.id)) {
        currentCourses.push(course.id);

        await studentRef.update({
          enrolledCourses: currentCourses,
          updatedAt: Date.now()
        });
      }

      console.log(`      ✓ ${student.firstName} ${student.lastName} inscrit`);
    }
  }

  console.log(`✅ Inscription terminée`);
}

async function main() {
  try {
    // 1. Trouver l'enseignant
    const teacher = await findTeacherByEmail(TEACHER_EMAIL);
    if (!teacher) {
      console.error('❌ Impossible de continuer sans enseignant');
      process.exit(1);
    }

    const universityId = teacher.universityId;
    if (!universityId) {
      console.error('❌ Enseignant sans université');
      process.exit(1);
    }

    console.log(`✅ Université: ${universityId}`);

    // 2. Créer 10 cours
    const createdCourses = await createCourses(universityId);

    // 3. Assigner 5 cours à l'enseignant
    const assignedCourses = await assignCoursesToTeacher(universityId, teacher, createdCourses);

    // 4. Trouver 2 étudiants
    const students = await findStudents(universityId, 2);
    if (students.length < 2) {
      console.warn('⚠️  Pas assez d\'étudiants trouvés, inscription partielle');
    }

    // 5. Inscrire les étudiants aux 5 cours
    if (students.length > 0) {
      await enrollStudentsInCourses(universityId, assignedCourses, students);
    }

    console.log('\n✅ Script terminé avec succès !');
    console.log('\n📊 Résumé:');
    console.log(`   • ${createdCourses.length} cours créés`);
    console.log(`   • ${assignedCourses.length} cours assignés à ${teacher.displayName}`);
    console.log(`   • ${students.length} étudiant(s) inscrit(s) à chaque cours assigné`);
    console.log(`   • ${createdCourses.length - assignedCourses.length} cours restent sans enseignant`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  }
}

main();
