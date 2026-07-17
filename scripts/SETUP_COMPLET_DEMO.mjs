#!/usr/bin/env node
/**
 * SCRIPT FINAL - Setup complet pour démo instructeur
 * Utilise Firebase Admin SDK - DROITS COMPLETS - GARANTI
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger service account
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '../backend/firebase-admin-key.json'), 'utf8')
);

// Initialiser Firebase Admin
initializeApp({
  credential: cert(serviceAccount),
  databaseURL: 'https://university-saas-7b31e-default-rtdb.firebaseio.com'
});

const auth = getAuth();
const db = getDatabase();

console.log('🚀 SETUP COMPLET DÉMO - GARANTI\n');

async function createUser(email, password, userData) {
  try {
    // Créer compte Auth
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log(`   ℹ️  Compte Auth existe: ${email}`);
    } catch (e) {
      userRecord = await auth.createUser({ email, password });
      console.log(`   ✅ Compte Auth créé: ${email}`);
    }

    // Créer profil Database
    await db.ref(`users/${userRecord.uid}`).set({
      ...userData,
      email,
      profileId: userRecord.uid,
      createdAt: Date.now(),
      loginMethod: 'email'
    });
    console.log(`   ✅ Profil créé: /users/${userRecord.uid}`);

    return userRecord.uid;
  } catch (error) {
    console.error(`   ❌ Erreur: ${error.message}`);
    throw error;
  }
}

async function createUniversity(id, data, adminUid) {
  await db.ref(`universities/${id}`).set({
    info: {
      ...data,
      createdAt: Date.now(),
      createdBy: adminUid,
      status: 'active'
    },
    subscription: {
      plan: 'premium',
      startDate: Date.now(),
      status: 'active'
    }
  });
  console.log(`   ✅ Université créée: /universities/${id}`);

  // Ajouter slug public
  await db.ref(`universities/public_slugs/${id}`).set({
    slug: data.slug
  });
  console.log(`   ✅ Slug public ajouté`);

  // Ajouter dans tenants_management
  await db.ref(`system_admin/tenants_management/${id}`).set({
    universityId: id,
    name: data.name,
    slug: data.slug,
    adminEmail: data.adminEmail || 'admin@demo.com',
    adminUid: adminUid,
    plan: 'premium',
    status: 'active',
    createdAt: Date.now(),
    country: data.country || 'France',
    type: data.type || 'public'
  });
  console.log(`   ✅ Tenant management ajouté`);
}

async function main() {
  try {
    // 1. SUPER ADMIN
    console.log('\n1️⃣ SUPER ADMIN');
    const superAdminUid = await createUser(
      'superadmin@universaas.com',
      'SuperAdmin2026!',
      {
        displayName: 'Super Admin Plateforme',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin_plateforme'
      }
    );

    // 2. UNIVERSITÉ DÉMO
    console.log('\n2️⃣ UNIVERSITÉ DÉMO SORBONNE');
    const univId = 'univ-sorbonne-demo-2026';
    const adminUid = await createUser(
      'admin@sorbonne-demo.fr',
      'AdminDemo2026!',
      {
        displayName: 'Admin Sorbonne',
        firstName: 'Jean',
        lastName: 'Dupont',
        role: 'admin_universite',
        universityId: univId
      }
    );

    await createUniversity(
      univId,
      {
        name: 'Université Sorbonne - Démo',
        slug: 'sorbonne-demo',
        type: 'public',
        country: 'France',
        address: '1 rue Victor Cousin',
        city: 'Paris',
        postalCode: '75005',
        phone: '+33 1 40 46 22 11',
        adminEmail: 'admin@sorbonne-demo.fr',
        academicYearStart: 'septembre',
        gradeScale: '20',
        currency: 'EUR'
      },
      adminUid
    );

    // 3. ENSEIGNANT
    console.log('\n3️⃣ ENSEIGNANT TEST');
    const teacherUid = await createUser(
      'prof@sorbonne-demo.fr',
      'Prof2026!',
      {
        displayName: 'Marie Martin',
        firstName: 'Marie',
        lastName: 'Martin',
        role: 'teacher',
        universityId: univId,
        department: 'Mathématiques'
      }
    );

    await db.ref(`universities/${univId}/teachers/${teacherUid}`).set({
      uid: teacherUid,
      firstName: 'Marie',
      lastName: 'Martin',
      email: 'prof@sorbonne-demo.fr',
      department: 'Mathématiques',
      status: 'active',
      createdAt: Date.now()
    });
    console.log(`   ✅ Enseignant ajouté dans université`);

    // 4. ÉTUDIANT
    console.log('\n4️⃣ ÉTUDIANT TEST');
    const studentUid = await createUser(
      'etudiant@sorbonne-demo.fr',
      'Student2026!',
      {
        displayName: 'Pierre Dubois',
        firstName: 'Pierre',
        lastName: 'Dubois',
        role: 'student',
        universityId: univId,
        level: 'Licence 2'
      }
    );

    await db.ref(`universities/${univId}/students/${studentUid}`).set({
      uid: studentUid,
      matricule: 'ETU2026001',
      firstName: 'Pierre',
      lastName: 'Dubois',
      email: 'etudiant@sorbonne-demo.fr',
      level: 'Licence 2',
      department: 'Mathématiques',
      status: 'active',
      enrollmentDate: Date.now(),
      createdAt: Date.now()
    });
    console.log(`   ✅ Étudiant ajouté dans université`);

    console.log('\n✅ SETUP TERMINÉ!\n');
    console.log('📋 COMPTES CRÉÉS:');
    console.log('');
    console.log('🔥 SUPER ADMIN:');
    console.log('   Email: superadmin@universaas.com');
    console.log('   Pass:  SuperAdmin2026!');
    console.log('   URL:   https://university-saas.vercel.app/dashboard/super-admin');
    console.log('');
    console.log('👨‍💼 ADMIN UNIVERSITÉ:');
    console.log('   Email: admin@sorbonne-demo.fr');
    console.log('   Pass:  AdminDemo2026!');
    console.log('   URL:   https://university-saas.vercel.app/dashboard/admin');
    console.log('');
    console.log('👨‍🏫 ENSEIGNANT:');
    console.log('   Email: prof@sorbonne-demo.fr');
    console.log('   Pass:  Prof2026!');
    console.log('   URL:   https://university-saas.vercel.app/dashboard/teacher');
    console.log('');
    console.log('🎓 ÉTUDIANT:');
    console.log('   Email: etudiant@sorbonne-demo.fr');
    console.log('   Pass:  Student2026!');
    console.log('   URL:   https://university-saas.vercel.app/dashboard/student');
    console.log('');
    console.log('🎯 PRÊT POUR DÉMO INSTRUCTEUR!');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    process.exit(1);
  }
}

main();
