/**
 * Script de seed pour 100 étudiants répartis dans les universités
 *
 * Usage: node scripts/seedStudents.cjs
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Charger le service account
const serviceAccountPath = path.join(__dirname, 'service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Initialiser Firebase Admin SDK
admin.initializeApp({
  credential: admin.cert(serviceAccount),
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
});

const db = require('firebase-admin/database');
const database = db.getDatabase();

// Prénoms français
const firstNames = [
  'Lucas', 'Emma', 'Louis', 'Chloé', 'Hugo', 'Léa', 'Nathan', 'Manon', 'Arthur', 'Camille',
  'Enzo', 'Sarah', 'Gabriel', 'Inès', 'Raphaël', 'Clara', 'Tom', 'Zoé', 'Théo', 'Jade',
  'Maxime', 'Lisa', 'Alexandre', 'Léna', 'Antoine', 'Julie', 'Pierre', 'Marie', 'Paul', 'Sophie',
  'Nicolas', 'Laura', 'Thomas', 'Charlotte', 'Jules', 'Anaïs', 'Martin', 'Océane', 'Romain', 'Alice',
  'Benjamin', 'Louise', 'Florian', 'Margaux', 'Simon', 'Eva', 'Victor', 'Pauline', 'Quentin', 'Elise',
  'Dylan', 'Nina', 'Clément', 'Ambre', 'Baptiste', 'Margot', 'Mathis', 'Lucie', 'Ethan', 'Anna'
];

const lastNames = [
  'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau',
  'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier',
  'Morel', 'Girard', 'André', 'Lefevre', 'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'François', 'Martinez',
  'Legrand', 'Garnier', 'Faure', 'Rousseau', 'Blanc', 'Guerin', 'Muller', 'Henry', 'Roussel', 'Nicolas',
  'Perrin', 'Morin', 'Mathieu', 'Clement', 'Gauthier', 'Dumont', 'Lopez', 'Fontaine', 'Chevalier', 'Robin'
];

const departments = [
  'Mathématiques', 'Informatique', 'Physique', 'Chimie', 'Biologie', 'Médecine', 'Pharmacie',
  'Droit', 'Économie', 'Gestion', 'Lettres', 'Histoire', 'Géographie', 'Philosophie',
  'Psychologie', 'Sociologie', 'Langues Étrangères', 'Arts', 'Musique', 'Architecture',
  'Ingénierie Mécanique', 'Ingénierie Électrique', 'Sciences Politiques', 'Communication', 'Sport'
];

const levels = ['L1', 'L2', 'L3', 'M1', 'M2'];

// Générer un numéro de téléphone français
function generatePhone() {
  return `+33 6 ${Math.floor(10 + Math.random() * 90)} ${Math.floor(10 + Math.random() * 90)} ${Math.floor(10 + Math.random() * 90)} ${Math.floor(10 + Math.random() * 90)}`;
}

// Générer une date de naissance (18-25 ans)
function generateBirthDate() {
  const year = 2001 + Math.floor(Math.random() * 8); // 2001-2008
  const month = String(Math.floor(1 + Math.random() * 12)).padStart(2, '0');
  const day = String(Math.floor(1 + Math.random() * 28)).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Générer un matricule unique
function generateMatricule(universityCode, year, number) {
  return `${universityCode}${year}${String(number).padStart(4, '0')}`;
}

// Choisir aléatoirement dans un tableau
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

async function seedStudents() {
  console.log('🎓 Seed de 100 étudiants dans toutes les universités\n');

  try {
    // 1. Récupérer toutes les universités
    const universitiesRef = database.ref('universities');
    const universitiesSnap = await universitiesRef.once('value');

    if (!universitiesSnap.exists()) {
      console.error('❌ Aucune université trouvée dans la base de données');
      console.log('💡 Créez d\'abord des universités via le SuperAdmin');
      process.exit(1);
    }

    const universities = [];
    universitiesSnap.forEach(child => {
      const univ = child.val();
      if (univ.info) {
        universities.push({
          id: child.key,
          name: univ.info.name,
          shortName: univ.info.shortName || 'UNI',
          code: univ.info.shortName?.substring(0, 3).toUpperCase() || 'UNI'
        });
      }
    });

    console.log(`📚 ${universities.length} université(s) trouvée(s):`);
    universities.forEach(u => console.log(`  - ${u.name} (${u.code})`));
    console.log('');

    if (universities.length === 0) {
      console.error('❌ Aucune université valide trouvée');
      process.exit(1);
    }

    // 2. Répartir 100 étudiants équitablement
    const studentsPerUniversity = Math.ceil(100 / universities.length);
    const timestamp = Date.now();
    const currentYear = new Date().getFullYear();
    let totalCreated = 0;

    for (const university of universities) {
      console.log(`\n🏫 Création de ${studentsPerUniversity} étudiants pour ${university.name}...`);

      // Obtenir le dernier numéro de matricule pour cette université
      const studentsRef = database.ref(`universities/${university.id}/students`);
      const existingSnap = await studentsRef.once('value');
      let lastNumber = 0;

      if (existingSnap.exists()) {
        existingSnap.forEach(child => {
          const student = child.val();
          if (student.matricule) {
            const numPart = parseInt(student.matricule.slice(-4));
            if (numPart > lastNumber) lastNumber = numPart;
          }
        });
      }

      // Créer les étudiants pour cette université
      for (let i = 0; i < studentsPerUniversity && totalCreated < 100; i++) {
        lastNumber++;
        const firstName = randomChoice(firstNames);
        const lastName = randomChoice(lastNames);
        const department = randomChoice(departments);
        const level = randomChoice(levels);
        const matricule = generateMatricule(university.code, currentYear, lastNumber);
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${lastNumber}@${university.code.toLowerCase()}.edu`;

        const studentRef = studentsRef.push();
        await studentRef.set({
          id: studentRef.key,
          firstName,
          lastName,
          email,
          matricule,
          department,
          level,
          phone: generatePhone(),
          birthDate: generateBirthDate(),
          address: `${Math.floor(1 + Math.random() * 200)} Rue de la République, France`,
          emergencyContact: generatePhone(),
          status: 'active',
          universityId: university.id,
          createdAt: timestamp,
          createdBy: 'system-seed'
        });

        totalCreated++;
        console.log(`  ✅ ${firstName} ${lastName} (${matricule}) - ${department} ${level}`);
      }

      console.log(`✅ ${Math.min(studentsPerUniversity, 100 - (totalCreated - studentsPerUniversity))} étudiants créés pour ${university.name}`);
    }

    console.log(`\n🎉 Seed terminé avec succès!`);
    console.log(`📊 Résumé:`);
    console.log(`  - ${totalCreated} étudiants créés au total`);
    console.log(`  - Répartis dans ${universities.length} université(s)`);
    console.log(`  - ${departments.length} départements représentés`);
    console.log(`  - Niveaux: L1, L2, L3, M1, M2\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du seed:', error);
    process.exit(1);
  }
}

seedStudents();
