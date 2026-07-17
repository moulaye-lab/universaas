/**
 * Vercel Serverless Function - Import CSV Étudiants
 * Route: /api/import/students
 */

import { authenticateUser } from '../_lib/auth-middleware.js';
import { getDatabase } from '../_lib/firebase-admin.js';
import multiparty from 'multiparty';
import csv from 'csv-parser';
import { Readable } from 'stream';

export const config = {
  api: {
    bodyParser: false, // Désactiver pour multipart/form-data
  },
};

function parseMultipartForm(req) {
  return new Promise((resolve, reject) => {
    const form = new multiparty.Form();
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

function parseCSV(buffer) {
  return new Promise((resolve, reject) => {
    const students = [];
    let lineNumber = 0;

    const stream = Readable.from(buffer.toString('utf-8'));

    stream
      .pipe(csv())
      .on('data', (row) => {
        lineNumber++;
        students.push({ ...row, lineNumber });
      })
      .on('end', () => resolve(students))
      .on('error', reject);
  });
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authentification
    const authResult = await authenticateUser(req, res);
    if (authResult.error) {
      return res.status(authResult.status).json({ error: authResult.message });
    }

    const userProfile = authResult.user;

    // Vérifier droits admin
    if (userProfile.role !== 'admin_universite') {
      return res.status(403).json({ error: 'Accès refusé - Admin uniquement' });
    }

    // Parser le formulaire multipart
    const { files } = await parseMultipartForm(req);

    if (!files || !files.file || files.file.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const file = files.file[0];
    const fileBuffer = await require('fs').promises.readFile(file.path);

    // Parser CSV
    const students = await parseCSV(fileBuffer);

    if (students.length === 0) {
      return res.status(400).json({ error: 'Le fichier CSV est vide' });
    }

    const db = getDatabase();
    const universityId = userProfile.universityId;

    const results = {
      success: 0,
      errors: [],
      total: students.length
    };

    // Traiter chaque étudiant
    for (const student of students) {
      try {
        const { matricule, prenom, nom, email, telephone, niveau, departement } = student;

        // Validation
        if (!matricule || !prenom || !nom || !email || !niveau) {
          results.errors.push({
            line: student.lineNumber,
            error: 'Champs obligatoires manquants',
            data: { matricule, prenom, nom, email }
          });
          continue;
        }

        // Vérifier si le matricule existe
        const existingRef = db.ref(`universities/${universityId}/students`);
        const existingSnapshot = await existingRef.orderByChild('matricule').equalTo(matricule).once('value');

        if (existingSnapshot.exists()) {
          results.errors.push({
            line: student.lineNumber,
            error: `Matricule ${matricule} existe déjà`,
            data: { matricule, prenom, nom }
          });
          continue;
        }

        // Créer compte Firebase Auth
        const defaultPassword = `${matricule}2025`;
        const signUpResponse = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${process.env.VITE_FIREBASE_API_KEY}`,
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
          role: 'student',
          level: niveau,
          department: departement || '',
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
          data: { matricule: student.matricule }
        });
      }
    }

    res.status(200).json(results);

  } catch (error) {
    console.error('Import error:', error.message);
    res.status(500).json({ error: 'Erreur lors de l\'import' });
  }
}
