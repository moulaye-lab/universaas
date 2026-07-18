#!/usr/bin/env node
/**
 * seedStudentsWithGrades.mjs
 * Crée 10 étudiants avec notes + 1 étudiant avec parents
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, update } from 'firebase/database';
import { getAuth } from 'firebase/auth';

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
const ADMIN_UID = 'yetxF049XFgATjEsOMhyEcUuTx12';

// Récupérer classes et cours depuis Firebase
async function getClassesAndCourses() {
  const classesSnap = await get(ref(database, `universities/${UNIVERSITY_ID}/classes`));
  const coursesSnap = await get(ref(database, `universities/${UNIVERSITY_ID}/courses`));

  const classes = classesSnap.exists() ? Object.entries(classesSnap.val()).map(([id, data]) => ({ id, ...data })) : [];
  const courses = coursesSnap.exists() ? Object.entries(coursesSnap.val()).map(([id, data]) => ({ id, ...data })) : [];

  return { classes, courses };
}

// Générer matricule unique
function generateMatricule(level, index) {
  const year = new Date().getFullYear();
  const levelCode = level.replace('L', '1').replace('M', '2').replace('D', '3');
  return `${year}${levelCode}${String(index).padStart(4, '0')}`;
}

// Créer un étudiant
async function createStudent(studentData) {
  const studentId = `student-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  await set(ref(database, `universities/${UNIVERSITY_ID}/students/${studentId}`), {
    ...studentData,
    id: studentId,
    createdAt: Date.now(),
    createdBy: ADMIN_UID
  });

  // Incrémenter occupiedSeats de la classe
  const classRef = ref(database, `universities/${UNIVERSITY_ID}/classes/${studentData.classId}/occupiedSeats`);
  const classSnap = await get(classRef);
  const currentSeats = classSnap.exists() ? classSnap.val() : 0;
  await set(classRef, currentSeats + 1);

  return studentId;
}

// Créer notes pour un étudiant
async function createGrades(studentId, courses) {
  const grades = [];

  for (const course of courses) {
    // Note Semestre 1
    const gradeS1Id = `grade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const gradeS1 = {
      id: gradeS1Id,
      studentId,
      courseId: course.id,
      courseName: course.courseName || course.name,
      semester: 1,
      value: Math.floor(Math.random() * 8) + 10, // Entre 10 et 17
      coefficient: course.credits || 3,
      evaluationType: 'exam',
      createdAt: Date.now(),
      createdBy: ADMIN_UID,
      universityId: UNIVERSITY_ID
    };

    await set(ref(database, `universities/${UNIVERSITY_ID}/grades/${gradeS1Id}`), gradeS1);
    grades.push(gradeS1);

    // Note Semestre 2
    const gradeS2Id = `grade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const gradeS2 = {
      id: gradeS2Id,
      studentId,
      courseId: course.id,
      courseName: course.courseName || course.name,
      semester: 2,
      value: Math.floor(Math.random() * 8) + 10, // Entre 10 et 17
      coefficient: course.credits || 3,
      evaluationType: 'exam',
      createdAt: Date.now(),
      createdBy: ADMIN_UID,
      universityId: UNIVERSITY_ID
    };

    await set(ref(database, `universities/${UNIVERSITY_ID}/grades/${gradeS2Id}`), gradeS2);
    grades.push(gradeS2);
  }

  return grades;
}

// Créer un parent via API REST signUp
async function createParentAccount(parentData) {
  const API_KEY = "AIzaSyB7z-oH9_sYBUSINFNhRnOGZWqxgjfG5yQ";

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: parentData.email,
      password: parentData.password,
      returnSecureToken: true
    })
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  const parentUid = data.localId;

  // Créer profil dans /users
  await set(ref(database, `users/${parentUid}`), {
    email: parentData.email,
    displayName: `${parentData.firstName} ${parentData.lastName}`,
    firstName: parentData.firstName,
    lastName: parentData.lastName,
    phoneNumber: parentData.phoneNumber,
    role: 'parent',
    universityId: UNIVERSITY_ID,
    profileId: parentUid,
    loginMethod: 'email',
    createdAt: Date.now(),
    createdBy: ADMIN_UID,
    mustChangePassword: true,
    temporaryPassword: parentData.password
  });

  return parentUid;
}

async function seedData() {
  try {
    console.log('🌱 Début du seed...\n');

    const { classes, courses } = await getClassesAndCourses();

    if (classes.length === 0) {
      console.error('❌ Aucune classe trouvée. Créez des classes d\'abord.');
      return;
    }

    if (courses.length === 0) {
      console.error('❌ Aucun cours trouvé. Créez des cours d\'abord.');
      return;
    }

    console.log(`📚 ${classes.length} classes trouvées`);
    console.log(`📖 ${courses.length} cours trouvés\n`);

    const createdStudents = [];

    // ========================================
    // 1. Créer 10 étudiants normaux avec notes
    // ========================================
    console.log('👨‍🎓 Création de 10 étudiants avec notes...\n');

    const firstNames = ['Pierre', 'Marie', 'Jean', 'Sophie', 'Luc', 'Emma', 'Thomas', 'Julie', 'Paul', 'Clara'];
    const lastNames = ['Dupont', 'Martin', 'Bernard', 'Dubois', 'Laurent', 'Simon', 'Michel', 'Lefebvre', 'Leroy', 'Moreau'];

    for (let i = 0; i < 10; i++) {
      const classData = classes[i % classes.length];
      const studentData = {
        firstName: firstNames[i],
        lastName: lastNames[i],
        email: `etudiant${i + 1}@nice.fr`,
        phoneNumber: `+33612345${String(i).padStart(3, '0')}`,
        dateOfBirth: new Date(2004 + Math.floor(i / 3), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).getTime(),
        gender: i % 2 === 0 ? 'male' : 'female',
        nationality: 'Française',
        address: `${10 + i} Rue de Nice, 06000 Nice`,
        universityId: UNIVERSITY_ID,
        level: classData.level,
        classId: classData.id,
        className: classData.name,
        domain: classData.domain,
        matricule: generateMatricule(classData.level, i + 1),
        status: 'active',
        enrollmentDate: Date.now(),
        academicYear: '2025-2026'
      };

      const studentId = await createStudent(studentData);

      // Créer notes pour cet étudiant (uniquement cours de son niveau)
      const studentCourses = courses.filter(c => c.level === classData.level);
      if (studentCourses.length > 0) {
        await createGrades(studentId, studentCourses.slice(0, 3)); // Max 3 cours
      }

      createdStudents.push({ ...studentData, id: studentId });
      console.log(`  ✅ ${studentData.firstName} ${studentData.lastName} - ${classData.name} - Notes créées`);
    }

    // ========================================
    // 2. Créer 1 étudiant avec 2 parents
    // ========================================
    console.log('\n👨‍👩‍👦 Création étudiant avec parents...\n');

    const studentClass = classes[0];
    const studentWithParentsData = {
      firstName: 'Lucas',
      lastName: 'Rousseau',
      email: 'lucas.rousseau@nice.fr',
      phoneNumber: '+33612340000',
      dateOfBirth: new Date(2005, 5, 15).getTime(),
      gender: 'male',
      nationality: 'Française',
      address: '100 Boulevard Victor Hugo, 06000 Nice',
      universityId: UNIVERSITY_ID,
      level: studentClass.level,
      classId: studentClass.id,
      className: studentClass.name,
      domain: studentClass.domain,
      matricule: generateMatricule(studentClass.level, 99),
      status: 'active',
      enrollmentDate: Date.now(),
      academicYear: '2025-2026'
    };

    const studentWithParentsId = await createStudent(studentWithParentsData);

    // Notes pour cet étudiant
    const studentCourses = courses.filter(c => c.level === studentClass.level);
    if (studentCourses.length > 0) {
      await createGrades(studentWithParentsId, studentCourses.slice(0, 3));
    }

    console.log(`  ✅ Étudiant: ${studentWithParentsData.firstName} ${studentWithParentsData.lastName}`);

    // Créer Parent 1 (Père)
    const parent1Data = {
      email: 'papa.rousseau@gmail.com',
      password: 'Parent123456',
      firstName: 'Marc',
      lastName: 'Rousseau',
      phoneNumber: '+33612340001'
    };

    const parent1Uid = await createParentAccount(parent1Data);

    // Lier parent1 à l'étudiant
    await set(ref(database, `users/${parent1Uid}/children/${UNIVERSITY_ID}/${studentWithParentsId}`), {
      studentId: studentWithParentsId,
      studentName: `${studentWithParentsData.firstName} ${studentWithParentsData.lastName}`,
      relationship: 'father',
      addedAt: Date.now()
    });

    await set(ref(database, `users/${parent1Uid}/childrenAccess/${UNIVERSITY_ID}/${studentWithParentsId}`), true);

    console.log(`  ✅ Parent 1 (Père): ${parent1Data.firstName} ${parent1Data.lastName} - ${parent1Data.email}`);

    // Créer Parent 2 (Mère)
    const parent2Data = {
      email: 'maman.rousseau@gmail.com',
      password: 'Parent123456',
      firstName: 'Sophie',
      lastName: 'Rousseau',
      phoneNumber: '+33612340002'
    };

    const parent2Uid = await createParentAccount(parent2Data);

    // Lier parent2 à l'étudiant
    await set(ref(database, `users/${parent2Uid}/children/${UNIVERSITY_ID}/${studentWithParentsId}`), {
      studentId: studentWithParentsId,
      studentName: `${studentWithParentsData.firstName} ${studentWithParentsData.lastName}`,
      relationship: 'mother',
      addedAt: Date.now()
    });

    await set(ref(database, `users/${parent2Uid}/childrenAccess/${UNIVERSITY_ID}/${studentWithParentsId}`), true);

    console.log(`  ✅ Parent 2 (Mère): ${parent2Data.firstName} ${parent2Data.lastName} - ${parent2Data.email}`);

    // ========================================
    // Résumé
    // ========================================
    console.log('\n✅ Seed terminé avec succès !\n');
    console.log('📊 Résumé:');
    console.log(`  - ${createdStudents.length} étudiants normaux créés avec notes`);
    console.log(`  - 1 étudiant avec 2 parents créé`);
    console.log(`  - Total: ${createdStudents.length + 1} étudiants`);
    console.log('\n🔑 Comptes parents:');
    console.log(`  - Père: papa.rousseau@gmail.com / Parent123456`);
    console.log(`  - Mère: maman.rousseau@gmail.com / Parent123456`);
    console.log('\n🧪 Test sur: http://localhost:5173');

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    throw error;
  }
}

seedData()
  .then(() => {
    console.log('\n✅ Script terminé');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Échec:', err);
    process.exit(1);
  });
