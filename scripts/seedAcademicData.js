/**
 * Script de seed pour les départements et modèles de cours GLOBAUX
 *
 * Usage:
 * 1. Téléchargez le service account JSON depuis Firebase Console
 * 2. Placez-le dans scripts/service-account.json
 * 3. node scripts/seedAcademicData.js
 *
 * Utilise Firebase Admin SDK pour bypasser les règles de sécurité
 */

import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger le service account
const serviceAccountPath = join(__dirname, 'service-account.json');
let serviceAccount;

try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch (error) {
  console.error('❌ Erreur: fichier service-account.json introuvable');
  console.error('📝 Pour le créer:');
  console.error('   1. Firebase Console → Project Settings → Service Accounts');
  console.error('   2. Cliquez "Generate New Private Key"');
  console.error('   3. Placez le fichier téléchargé dans scripts/service-account.json');
  process.exit(1);
}

// Initialiser Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: serviceAccount.databaseURL || process.env.VITE_FIREBASE_DATABASE_URL,
});

const database = admin.database();

// === DÉPARTEMENTS ===
const departments = [
  { name: 'Mathématiques', code: 'MATH', description: 'Mathématiques pures et appliquées' },
  { name: 'Informatique', code: 'INFO', description: 'Informatique et sciences du numérique' },
  { name: 'Physique', code: 'PHYS', description: 'Physique théorique et expérimentale' },
  { name: 'Chimie', code: 'CHIM', description: 'Chimie générale, organique et analytique' },
  { name: 'Biologie', code: 'BIO', description: 'Sciences de la vie et de la terre' },
  { name: 'Médecine', code: 'MED', description: 'Sciences médicales et santé' },
  { name: 'Pharmacie', code: 'PHAR', description: 'Pharmacie et sciences pharmaceutiques' },
  { name: 'Droit', code: 'DROIT', description: 'Droit public et privé' },
  { name: 'Économie', code: 'ECO', description: 'Sciences économiques' },
  { name: 'Gestion', code: 'GEST', description: 'Management et gestion d\'entreprise' },
  { name: 'Lettres', code: 'LETT', description: 'Lettres modernes et classiques' },
  { name: 'Histoire', code: 'HIST', description: 'Histoire et civilisations' },
  { name: 'Géographie', code: 'GEO', description: 'Géographie humaine et physique' },
  { name: 'Philosophie', code: 'PHIL', description: 'Philosophie et épistémologie' },
  { name: 'Psychologie', code: 'PSY', description: 'Psychologie clinique et expérimentale' },
  { name: 'Sociologie', code: 'SOC', description: 'Sociologie et anthropologie' },
  { name: 'Langues Étrangères', code: 'LANG', description: 'Langues vivantes et civilisations' },
  { name: 'Arts', code: 'ARTS', description: 'Arts plastiques et histoire de l\'art' },
  { name: 'Musique', code: 'MUS', description: 'Musique et musicologie' },
  { name: 'Cinéma', code: 'CIN', description: 'Cinéma et études audiovisuelles' },
  { name: 'Architecture', code: 'ARCH', description: 'Architecture et urbanisme' },
  { name: 'Ingénierie Mécanique', code: 'MECA', description: 'Génie mécanique' },
  { name: 'Ingénierie Électrique', code: 'ELEC', description: 'Génie électrique et électronique' },
  { name: 'Ingénierie Civile', code: 'CIVIL', description: 'Génie civil et BTP' },
  { name: 'Sciences Politiques', code: 'SCPO', description: 'Sciences politiques et relations internationales' },
  { name: 'Communication', code: 'COM', description: 'Communication et médias' },
  { name: 'Journalisme', code: 'JOURN', description: 'Journalisme et presse' },
  { name: 'Éducation', code: 'EDU', description: 'Sciences de l\'éducation' },
  { name: 'Sport', code: 'STAPS', description: 'Sciences et techniques des activités physiques et sportives' },
  { name: 'Environnement', code: 'ENV', description: 'Sciences de l\'environnement' }
];

// === MODÈLES DE COURS PAR DÉPARTEMENT ===
const courseTemplates = {
  'Mathématiques': [
    { name: 'Algèbre Linéaire', code: 'MATH101', credits: 6, description: 'Espaces vectoriels, matrices, déterminants' },
    { name: 'Analyse I', code: 'MATH102', credits: 6, description: 'Suites, séries, fonctions continues' },
    { name: 'Analyse II', code: 'MATH201', credits: 6, description: 'Dérivées, intégrales, équations différentielles' },
    { name: 'Probabilités', code: 'MATH301', credits: 4, description: 'Probabilités discrètes et continues' },
    { name: 'Statistiques', code: 'MATH302', credits: 4, description: 'Statistiques descriptives et inférentielles' },
    { name: 'Géométrie', code: 'MATH103', credits: 4, description: 'Géométrie euclidienne et analytique' }
  ],
  'Informatique': [
    { name: 'Algorithmique', code: 'INFO101', credits: 6, description: 'Algorithmes et structures de données' },
    { name: 'Programmation I', code: 'INFO102', credits: 6, description: 'Python/Java de base' },
    { name: 'Programmation II', code: 'INFO201', credits: 6, description: 'POO et design patterns' },
    { name: 'Bases de Données', code: 'INFO202', credits: 4, description: 'SQL, modélisation, SGBD' },
    { name: 'Réseaux', code: 'INFO301', credits: 4, description: 'Protocoles TCP/IP, architecture réseaux' },
    { name: 'Systèmes d\'Exploitation', code: 'INFO302', credits: 4, description: 'Unix/Linux, processus, mémoire' },
    { name: 'Développement Web', code: 'INFO303', credits: 4, description: 'HTML, CSS, JavaScript, frameworks' },
    { name: 'Intelligence Artificielle', code: 'INFO401', credits: 6, description: 'ML, deep learning, NLP' }
  ],
  'Physique': [
    { name: 'Mécanique Classique', code: 'PHYS101', credits: 6, description: 'Cinématique, dynamique, lois de Newton' },
    { name: 'Électromagnétisme', code: 'PHYS201', credits: 6, description: 'Électrostatique, magnétisme, ondes EM' },
    { name: 'Thermodynamique', code: 'PHYS202', credits: 4, description: 'Chaleur, entropie, machines thermiques' },
    { name: 'Optique', code: 'PHYS203', credits: 4, description: 'Optique géométrique et ondulatoire' },
    { name: 'Mécanique Quantique', code: 'PHYS301', credits: 6, description: 'Équation de Schrödinger, spin' },
    { name: 'Physique Nucléaire', code: 'PHYS401', credits: 4, description: 'Noyaux atomiques, radioactivité' }
  ],
  'Chimie': [
    { name: 'Chimie Générale', code: 'CHIM101', credits: 6, description: 'Atomes, molécules, liaisons chimiques' },
    { name: 'Chimie Organique I', code: 'CHIM201', credits: 6, description: 'Composés organiques, réactions' },
    { name: 'Chimie Organique II', code: 'CHIM202', credits: 6, description: 'Synthèse organique avancée' },
    { name: 'Chimie Analytique', code: 'CHIM301', credits: 4, description: 'Techniques d\'analyse chimique' },
    { name: 'Chimie Physique', code: 'CHIM302', credits: 4, description: 'Thermochimie, cinétique chimique' },
    { name: 'Biochimie', code: 'CHIM401', credits: 4, description: 'Biomolécules, métabolisme' }
  ],
  'Biologie': [
    { name: 'Biologie Cellulaire', code: 'BIO101', credits: 6, description: 'Structure et fonction des cellules' },
    { name: 'Génétique', code: 'BIO201', credits: 6, description: 'ADN, hérédité, mutations' },
    { name: 'Écologie', code: 'BIO202', credits: 4, description: 'Écosystèmes, biodiversité' },
    { name: 'Physiologie', code: 'BIO301', credits: 6, description: 'Fonctionnement des organismes vivants' },
    { name: 'Microbiologie', code: 'BIO302', credits: 4, description: 'Bactéries, virus, champignons' },
    { name: 'Biologie Moléculaire', code: 'BIO401', credits: 6, description: 'Expression génique, biotechnologies' }
  ],
  'Droit': [
    { name: 'Introduction au Droit', code: 'DROIT101', credits: 6, description: 'Principes fondamentaux du droit' },
    { name: 'Droit Constitutionnel', code: 'DROIT102', credits: 6, description: 'Constitution, institutions' },
    { name: 'Droit Civil', code: 'DROIT201', credits: 6, description: 'Droit des personnes et de la famille' },
    { name: 'Droit Pénal', code: 'DROIT202', credits: 6, description: 'Infractions, sanctions pénales' },
    { name: 'Droit des Affaires', code: 'DROIT301', credits: 6, description: 'Sociétés, contrats commerciaux' },
    { name: 'Droit International', code: 'DROIT401', credits: 4, description: 'Relations internationales, traités' }
  ],
  'Économie': [
    { name: 'Microéconomie I', code: 'ECO101', credits: 6, description: 'Offre, demande, marchés' },
    { name: 'Macroéconomie I', code: 'ECO102', credits: 6, description: 'PIB, inflation, chômage' },
    { name: 'Microéconomie II', code: 'ECO201', credits: 6, description: 'Concurrence, monopole' },
    { name: 'Macroéconomie II', code: 'ECO202', credits: 6, description: 'Politique monétaire et fiscale' },
    { name: 'Économétrie', code: 'ECO301', credits: 4, description: 'Modèles statistiques économiques' },
    { name: 'Économie Internationale', code: 'ECO401', credits: 4, description: 'Commerce international, change' }
  ],
  'Gestion': [
    { name: 'Management Général', code: 'GEST101', credits: 6, description: 'Principes du management' },
    { name: 'Comptabilité Générale', code: 'GEST102', credits: 6, description: 'Bilan, compte de résultat' },
    { name: 'Marketing', code: 'GEST201', credits: 4, description: 'Stratégie marketing, mix marketing' },
    { name: 'Finance d\'Entreprise', code: 'GEST202', credits: 6, description: 'Investissement, financement' },
    { name: 'Ressources Humaines', code: 'GEST301', credits: 4, description: 'GRH, recrutement, formation' },
    { name: 'Stratégie d\'Entreprise', code: 'GEST401', credits: 6, description: 'Analyse stratégique, décision' }
  ],
  'Médecine': [
    { name: 'Anatomie I', code: 'MED101', credits: 8, description: 'Anatomie générale et descriptive' },
    { name: 'Physiologie I', code: 'MED102', credits: 8, description: 'Physiologie humaine' },
    { name: 'Anatomie II', code: 'MED201', credits: 8, description: 'Anatomie topographique' },
    { name: 'Pathologie Générale', code: 'MED301', credits: 6, description: 'Mécanismes des maladies' },
    { name: 'Pharmacologie', code: 'MED302', credits: 6, description: 'Médicaments et thérapeutique' },
    { name: 'Sémiologie', code: 'MED401', credits: 8, description: 'Examen clinique, diagnostic' }
  ],
  'Lettres': [
    { name: 'Littérature Française I', code: 'LETT101', credits: 6, description: 'Moyen Âge au XVIIIe siècle' },
    { name: 'Littérature Française II', code: 'LETT201', credits: 6, description: 'XIXe et XXe siècles' },
    { name: 'Linguistique', code: 'LETT102', credits: 4, description: 'Phonologie, syntaxe, sémantique' },
    { name: 'Grammaire', code: 'LETT103', credits: 4, description: 'Grammaire française approfondie' },
    { name: 'Littérature Comparée', code: 'LETT301', credits: 4, description: 'Étude comparée des littératures' },
    { name: 'Stylistique', code: 'LETT401', credits: 4, description: 'Analyse stylistique des textes' }
  ],
  'Histoire': [
    { name: 'Histoire Ancienne', code: 'HIST101', credits: 6, description: 'Antiquité grecque et romaine' },
    { name: 'Histoire Médiévale', code: 'HIST102', credits: 6, description: 'Moyen Âge européen' },
    { name: 'Histoire Moderne', code: 'HIST201', credits: 6, description: 'Renaissance aux Lumières' },
    { name: 'Histoire Contemporaine', code: 'HIST202', credits: 6, description: 'XIXe et XXe siècles' },
    { name: 'Méthodologie Historique', code: 'HIST301', credits: 4, description: 'Sources, critique historique' },
    { name: 'Histoire des Civilisations', code: 'HIST401', credits: 4, description: 'Civilisations mondiales' }
  ],
  'Philosophie': [
    { name: 'Histoire de la Philosophie', code: 'PHIL101', credits: 6, description: 'Philosophie antique et médiévale' },
    { name: 'Philosophie Moderne', code: 'PHIL201', credits: 6, description: 'Descartes à Kant' },
    { name: 'Éthique', code: 'PHIL202', credits: 4, description: 'Philosophie morale' },
    { name: 'Épistémologie', code: 'PHIL301', credits: 4, description: 'Théorie de la connaissance' },
    { name: 'Philosophie Politique', code: 'PHIL302', credits: 4, description: 'Théories politiques' },
    { name: 'Métaphysique', code: 'PHIL401', credits: 4, description: 'Questions fondamentales de l\'être' }
  ],
  'Langues Étrangères': [
    { name: 'Anglais I', code: 'LANG101', credits: 4, description: 'Anglais niveau débutant/intermédiaire' },
    { name: 'Anglais II', code: 'LANG201', credits: 4, description: 'Anglais niveau avancé' },
    { name: 'Espagnol I', code: 'LANG102', credits: 4, description: 'Espagnol niveau débutant' },
    { name: 'Allemand I', code: 'LANG103', credits: 4, description: 'Allemand niveau débutant' },
    { name: 'Arabe I', code: 'LANG104', credits: 4, description: 'Arabe littéraire niveau débutant' },
    { name: 'Chinois I', code: 'LANG105', credits: 4, description: 'Mandarin niveau débutant' }
  ],
  'Sport': [
    { name: 'Anatomie du Sport', code: 'STAPS101', credits: 4, description: 'Anatomie pour les sportifs' },
    { name: 'Physiologie de l\'Exercice', code: 'STAPS201', credits: 6, description: 'Physiologie musculaire et cardiaque' },
    { name: 'Biomécanique', code: 'STAPS202', credits: 4, description: 'Mécanique du mouvement humain' },
    { name: 'Entraînement Sportif', code: 'STAPS301', credits: 6, description: 'Méthodologie de l\'entraînement' },
    { name: 'Psychologie du Sport', code: 'STAPS302', credits: 4, description: 'Aspects psychologiques de la performance' },
    { name: 'Gestion Sportive', code: 'STAPS401', credits: 4, description: 'Management des organisations sportives' }
  ]
};

// === FONCTION PRINCIPALE ===
async function seedAcademicData() {
  console.log('🎓 Seed des données académiques GLOBALES (partagées par toutes les universités)\n');

  try {
    const timestamp = Date.now();

    // Seed Départements (globaux)
    console.log('📚 Création des départements globaux...');
    for (const dept of departments) {
      const deptRef = database.ref('departments').push();
      await deptRef.set({
        id: deptRef.key,
        name: dept.name,
        code: dept.code,
        description: dept.description,
        createdAt: timestamp,
        createdBy: 'system-seed'
      });
      console.log(`  ✅ ${dept.name} (${dept.code})`);
    }

    console.log(`\n✅ ${departments.length} départements créés\n`);

    // Seed Modèles de cours (globaux)
    console.log('📖 Création des modèles de cours globaux...');
    let totalCourses = 0;

    for (const [deptName, courses] of Object.entries(courseTemplates)) {
      console.log(`\n  ${deptName}:`);
      for (const course of courses) {
        const templateRef = database.ref('courseTemplates').push();
        await templateRef.set({
          id: templateRef.key,
          name: course.name,
          code: course.code,
          department: deptName,
          credits: course.credits,
          description: course.description,
          createdAt: timestamp,
          createdBy: 'system-seed'
        });
        console.log(`    ✅ ${course.name} (${course.code})`);
        totalCourses++;
      }
    }

    console.log(`\n✅ ${totalCourses} modèles de cours créés\n`);
    console.log('🎉 Seed terminé avec succès!\n');
    console.log('📊 Résumé:');
    console.log(`  - ${departments.length} départements GLOBAUX`);
    console.log(`  - ${totalCourses} modèles de cours GLOBAUX`);
    console.log(`  - Accessibles par TOUTES les universités\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du seed:', error);
    process.exit(1);
  }
}

// Lancer le seed (aucun argument nécessaire, c'est global)
seedAcademicData();
