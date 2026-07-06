#!/usr/bin/env node

/**
 * Script pour créer 10 universités de test
 * Utilisé pour tester la pagination du Super Admin Dashboard
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get } from 'firebase/database';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.local') });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

const SUPER_ADMIN_EMAIL = process.env.TEST_SUPER_ADMIN_EMAIL || 'moulayef6@gmail.com';
const SUPER_ADMIN_PASSWORD = process.env.TEST_SUPER_ADMIN_PASSWORD || '41407878aA@';

// Liste d'universités françaises fictives
const universities = [
  { name: 'Université Lyon 3 Jean Moulin', city: 'Lyon', plan: 'premium' },
  { name: 'Université Toulouse 1 Capitole', city: 'Toulouse', plan: 'standard' },
  { name: 'Université Bordeaux Montaigne', city: 'Bordeaux', plan: 'premium' },
  { name: 'Université Lille 2 Droit et Santé', city: 'Lille', plan: 'standard' },
  { name: 'Université Strasbourg Robert Schuman', city: 'Strasbourg', plan: 'enterprise' },
  { name: 'Université Nantes Atlantique', city: 'Nantes', plan: 'standard' },
  { name: 'Université Montpellier Paul Valéry', city: 'Montpellier', plan: 'premium' },
  { name: 'Université Rennes 1 Sciences', city: 'Rennes', plan: 'standard' },
  { name: 'Université Grenoble Alpes', city: 'Grenoble', plan: 'premium' },
  { name: 'Université Nice Sophia Antipolis', city: 'Nice', plan: 'enterprise' },
];

const generateSlug = (name) => {
  return 'univ-' + name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 30) + '-' + new Date().getFullYear();
};

const getPlanPrice = (plan) => {
  const prices = { standard: 149, premium: 299, enterprise: 599 };
  return prices[plan] || 149;
};

const getPlanMaxStudents = (plan) => {
  const limits = { standard: 500, premium: 2000, enterprise: 10000 };
  return limits[plan] || 500;
};

async function create10Universities() {
  try {
    console.log('\n🏛️  Création de 10 universités de test\n');

    // Se connecter comme super admin
    console.log('🔐 Connexion super admin...');
    await signInWithEmailAndPassword(auth, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD);
    console.log('✅ Connecté\n');

    const superAdminUid = auth.currentUser.uid;

    for (let i = 0; i < universities.length; i++) {
      const uni = universities[i];
      const universitySlug = generateSlug(uni.name);
      const universityId = universitySlug;

      console.log(`\n[${i + 1}/10] 🏫 Création de ${uni.name}...`);

      // Vérifier si l'université existe déjà
      const universityRef = ref(database, `universities/${universityId}`);
      const universitySnap = await get(universityRef);

      if (universitySnap.exists()) {
        console.log(`⚠️  ${uni.name} existe déjà, on passe`);
        continue;
      }

      // 1. Créer le compte admin via API REST (ne déconnecte pas)
      const adminEmail = `admin@${uni.city.toLowerCase()}.fr`;
      const adminPassword = '12345678';

      const apiKey = process.env.VITE_FIREBASE_API_KEY;
      const createUserResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: adminEmail,
            password: adminPassword,
            returnSecureToken: false
          })
        }
      );

      if (!createUserResponse.ok) {
        const errorData = await createUserResponse.json();
        if (errorData.error?.message?.includes('EMAIL_EXISTS')) {
          console.log(`⚠️  Email ${adminEmail} existe déjà, on continue avec un suffixe`);
          // Réessayer avec un suffixe
          const retryEmail = `admin-${i}@${uni.city.toLowerCase()}.fr`;
          const retryResponse = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: retryEmail,
                password: adminPassword,
                returnSecureToken: false
              })
            }
          );

          if (!retryResponse.ok) {
            console.error(`❌ Impossible de créer ${retryEmail}`);
            continue;
          }

          const retryUserData = await retryResponse.json();
          var adminUid = retryUserData.localId;
          var finalAdminEmail = retryEmail;
        } else {
          console.error(`❌ Erreur création admin: ${errorData.error?.message}`);
          continue;
        }
      } else {
        const userData = await createUserResponse.json();
        var adminUid = userData.localId;
        var finalAdminEmail = adminEmail;
      }

      // 2. Créer le profil utilisateur admin
      await set(ref(database, `users/${adminUid}`), {
        email: finalAdminEmail,
        displayName: `Admin ${uni.city}`,
        firstName: 'Admin',
        lastName: uni.city,
        role: 'admin_universite',
        universityId: universityId,
        profileId: adminUid,
        loginMethod: 'email',
        mustChangePassword: true,
        temporaryPassword: adminPassword,
        createdAt: Date.now(),
        createdBy: superAdminUid,
      });

      // 3. Créer la structure de l'université
      const universityData = {
        info: {
          name: uni.name,
          slug: universitySlug,
          adminId: adminUid,
          adminEmail: finalAdminEmail,
          subscriptionPlan: uni.plan,
          subscriptionStatus: 'active',
          maxStudents: getPlanMaxStudents(uni.plan),
          currentStudents: Math.floor(Math.random() * 100) + 50, // 50-150 étudiants random
          price: getPlanPrice(uni.plan),
          createdAt: Date.now(),
          createdBy: superAdminUid,
          trialEndsAt: Date.now() + (30 * 24 * 60 * 60 * 1000),
        },
        students: { _placeholder: true },
        teachers: { _placeholder: true },
        courses: { _placeholder: true },
        grades: { _placeholder: true },
        payments: { _placeholder: true },
        liveSessions: { _placeholder: true },
        library: { _placeholder: true },
        notifications: {
          welcome: {
            title: 'Bienvenue sur UniverSaaS !',
            message: `Votre université ${uni.name} a été créée avec succès.`,
            type: 'info',
            createdAt: Date.now(),
            read: false,
          }
        },
        audit: {
          [Date.now()]: {
            action: 'university_created',
            userId: superAdminUid,
            details: {
              universityName: uni.name,
              adminEmail: finalAdminEmail,
              plan: uni.plan,
            },
            timestamp: Date.now(),
          }
        }
      };

      await set(ref(database, `universities/${universityId}`), universityData);

      console.log(`✅ ${uni.name} créée`);
      console.log(`   Email: ${finalAdminEmail}`);
      console.log(`   Plan: ${uni.plan} (${getPlanPrice(uni.plan)}€/mois)`);
    }

    // 4. Mettre à jour les stats de la plateforme
    console.log('\n📊 Mise à jour des stats plateforme...');
    const platformRef = ref(database, 'platform/analytics');
    const platformSnap = await get(platformRef);
    let platformStats = platformSnap.exists() ? platformSnap.val() : {
      totalUniversities: 0,
      activeUniversities: 0,
      totalStudents: 0,
      totalTeachers: 0,
      monthlyRevenue: 0,
      yearlyRevenue: 0,
      growthRate: 0,
    };

    // Recalculer depuis toutes les universités
    const allUniversitiesRef = ref(database, 'universities');
    const allUniversitiesSnap = await get(allUniversitiesRef);

    if (allUniversitiesSnap.exists()) {
      const allUnis = allUniversitiesSnap.val();
      const uniCount = Object.keys(allUnis).length;
      let totalRevenue = 0;
      let totalStudents = 0;

      Object.values(allUnis).forEach(uni => {
        if (uni.info) {
          totalRevenue += uni.info.price || 0;
          totalStudents += uni.info.currentStudents || 0;
        }
      });

      platformStats.totalUniversities = uniCount;
      platformStats.activeUniversities = uniCount;
      platformStats.totalStudents = totalStudents;
      platformStats.monthlyRevenue = totalRevenue;
      platformStats.yearlyRevenue = totalRevenue * 12;

      await set(platformRef, platformStats);
      console.log(`✅ Stats mises à jour (${uniCount} universités)`);
    }

    console.log('\n\n🎉 10 UNIVERSITÉS CRÉÉES AVEC SUCCÈS !\n');
    console.log('📋 RÉSUMÉ :\n');
    universities.forEach((uni, i) => {
      const email = i === 0 ? `admin@${uni.city.toLowerCase()}.fr` : `admin-${i}@${uni.city.toLowerCase()}.fr`;
      console.log(`${i + 1}. ${uni.name}`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: 12345678`);
      console.log(`   Plan: ${uni.plan}\n`);
    });

    console.log('🧪 TEST :');
    console.log('   Connectez-vous au dashboard super admin');
    console.log('   Vous devriez voir la pagination avec "Suivant" et "Précédent"\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erreur :', error);
    process.exit(1);
  }
}

create10Universities();
