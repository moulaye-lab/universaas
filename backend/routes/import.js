/**
 * routes/import.js - Import CSV d'étudiants et enseignants
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');
const { getDatabase } = require('firebase-admin/database');
const { verifyToken } = require('../middleware/auth');

const db = getDatabase();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/import/students
 * Importer des étudiants via CSV
 */
router.post('/students', verifyToken, upload.single('file'), async (req, res) => {
  try {
    const { universityId } = req.user;

    if (!universityId) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const students = [];
    const errors = [];
    let lineNumber = 0;

    // Parser le CSV
    const stream = Readable.from(req.file.buffer.toString('utf-8'));

    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (row) => {
          lineNumber++;
          students.push({ ...row, lineNumber });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (students.length === 0) {
      return res.status(400).json({ error: 'Le fichier CSV est vide' });
    }

    // Traiter chaque étudiant
    const results = {
      success: 0,
      errors: [],
      total: students.length
    };

    const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyC_qd1R-M4tL_5wkY0B_0dWxYGKS7YB5Zw';

    for (const student of students) {
      try {
        const { matricule, prenom, nom, email, telephone, niveau, departement, dateNaissance, lieuNaissance, adresse, ville, codePostal, pays } = student;

        // Validation
        if (!matricule || !prenom || !nom || !email || !niveau) {
          results.errors.push({
            line: student.lineNumber,
            error: 'Champs obligatoires manquants (matricule, prenom, nom, email, niveau)',
            data: { matricule, prenom, nom, email }
          });
          continue;
        }

        // Vérifier si le matricule existe déjà
        const existingStudentRef = db.ref(`universities/${universityId}/students`);
        const existingSnapshot = await existingStudentRef.orderByChild('matricule').equalTo(matricule).once('value');

        if (existingSnapshot.exists()) {
          results.errors.push({
            line: student.lineNumber,
            error: `Le matricule ${matricule} existe déjà`,
            data: { matricule, prenom, nom }
          });
          continue;
        }

        // Générer mot de passe par défaut
        const defaultPassword = `${matricule}2025`;

        // Créer compte Firebase Auth via REST API
        const signUpResponse = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              password: defaultPassword,
              returnSecureToken: true
            })
          }
        );

        const authData = await signUpResponse.json();

        if (!signUpResponse.ok) {
          results.errors.push({
            line: student.lineNumber,
            error: authData.error?.message || 'Erreur création compte',
            data: { matricule, email }
          });
          continue;
        }

        const uid = authData.localId;

        // Créer profil étudiant
        const studentData = {
          uid,
          universityId,
          matricule,
          firstName: prenom,
          lastName: nom,
          displayName: `${prenom} ${nom}`,
          email,
          phone: telephone || '',
          role: 'etudiant',
          level: niveau,
          department: departement || '',
          dateOfBirth: dateNaissance || '',
          placeOfBirth: lieuNaissance || '',
          address: adresse || '',
          city: ville || '',
          postalCode: codePostal || '',
          country: pays || 'France',
          enrollmentDate: Date.now(),
          status: 'active',
          profileId: uid,
          createdAt: Date.now(),
          loginMethod: 'email',
          firstLogin: true
        };

        await db.ref(`users/${uid}`).set(studentData);
        await db.ref(`universities/${universityId}/students/${uid}`).set(studentData);

        results.success++;

      } catch (error) {
        results.errors.push({
          line: student.lineNumber,
          error: error.message,
          data: { matricule: student.matricule, email: student.email }
        });
      }
    }

    res.json(results);

  } catch (error) {
    console.error('Error importing students:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de l\'importation' });
  }
});

/**
 * POST /api/import/teachers
 * Importer des enseignants via CSV
 */
router.post('/teachers', verifyToken, upload.single('file'), async (req, res) => {
  try {
    const { universityId } = req.user;

    if (!universityId) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const teachers = [];
    let lineNumber = 0;

    // Parser le CSV
    const stream = Readable.from(req.file.buffer.toString('utf-8'));

    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (row) => {
          lineNumber++;
          teachers.push({ ...row, lineNumber });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (teachers.length === 0) {
      return res.status(400).json({ error: 'Le fichier CSV est vide' });
    }

    // Traiter chaque enseignant
    const results = {
      success: 0,
      errors: [],
      total: teachers.length
    };

    const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyC_qd1R-M4tL_5wkY0B_0dWxYGKS7YB5Zw';

    for (const teacher of teachers) {
      try {
        const { matricule, prenom, nom, email, telephone, specialite, grade, departement, dateNaissance, lieuNaissance, adresse, ville, codePostal, pays } = teacher;

        // Validation
        if (!matricule || !prenom || !nom || !email || !specialite) {
          results.errors.push({
            line: teacher.lineNumber,
            error: 'Champs obligatoires manquants (matricule, prenom, nom, email, specialite)',
            data: { matricule, prenom, nom, email }
          });
          continue;
        }

        // Vérifier si le matricule existe déjà
        const existingTeacherRef = db.ref(`universities/${universityId}/teachers`);
        const existingSnapshot = await existingTeacherRef.orderByChild('matricule').equalTo(matricule).once('value');

        if (existingSnapshot.exists()) {
          results.errors.push({
            line: teacher.lineNumber,
            error: `Le matricule ${matricule} existe déjà`,
            data: { matricule, prenom, nom }
          });
          continue;
        }

        // Générer mot de passe par défaut
        const defaultPassword = `${matricule}2025`;

        // Créer compte Firebase Auth via REST API
        const signUpResponse = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              password: defaultPassword,
              returnSecureToken: true
            })
          }
        );

        const authData = await signUpResponse.json();

        if (!signUpResponse.ok) {
          results.errors.push({
            line: teacher.lineNumber,
            error: authData.error?.message || 'Erreur création compte',
            data: { matricule, email }
          });
          continue;
        }

        const uid = authData.localId;

        // Créer profil enseignant
        const teacherData = {
          uid,
          universityId,
          matricule,
          firstName: prenom,
          lastName: nom,
          displayName: `${prenom} ${nom}`,
          email,
          phone: telephone || '',
          role: 'enseignant',
          specialization: specialite,
          grade: grade || 'Assistant',
          department: departement || '',
          dateOfBirth: dateNaissance || '',
          placeOfBirth: lieuNaissance || '',
          address: adresse || '',
          city: ville || '',
          postalCode: codePostal || '',
          country: pays || 'France',
          hireDate: Date.now(),
          status: 'active',
          profileId: uid,
          createdAt: Date.now(),
          loginMethod: 'email',
          firstLogin: true
        };

        await db.ref(`users/${uid}`).set(teacherData);
        await db.ref(`universities/${universityId}/teachers/${uid}`).set(teacherData);

        results.success++;

      } catch (error) {
        results.errors.push({
          line: teacher.lineNumber,
          error: error.message,
          data: { matricule: teacher.matricule, email: teacher.email }
        });
      }
    }

    res.json(results);

  } catch (error) {
    console.error('Error importing teachers:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de l\'importation' });
  }
});

module.exports = router;
