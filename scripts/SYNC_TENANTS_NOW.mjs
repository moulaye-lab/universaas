#!/usr/bin/env node
import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '../backend/firebase-admin-key.json'), 'utf8')
);

initializeApp({
  credential: cert(serviceAccount),
  databaseURL: 'https://university-saas-7b31e-default-rtdb.firebaseio.com'
});

const db = getDatabase();

const SUBSCRIPTION_PLANS = {
  basic: { maxStudents: 500, monthlyPrice: 99 },
  standard: { maxStudents: 1000, monthlyPrice: 199 },
  premium: { maxStudents: 5000, monthlyPrice: 499 },
  enterprise: { maxStudents: -1, monthlyPrice: 999 }
};

async function syncTenants() {
  console.log('🔄 SYNCHRONISATION TENANTS...\n');

  const universitiesRef = db.ref('universities');
  const universitiesSnap = await universitiesRef.once('value');

  if (!universitiesSnap.exists()) {
    console.log('❌ Aucune université trouvée');
    return;
  }

  const universities = universitiesSnap.val();
  let syncCount = 0;

  for (const [universityId, universityData] of Object.entries(universities)) {
    if (universityId === 'public_slugs') continue;

    const info = universityData.info || {};
    const studentsCount = universityData.students ? Object.keys(universityData.students).length : 0;
    const teachersCount = universityData.teachers ? Object.keys(universityData.teachers).length : 0;

    const tenantData = {
      universityId,
      name: info.name || 'Université sans nom',
      slug: info.slug || universityId,
      status: info.subscriptionStatus || info.status || 'active',
      plan: info.subscriptionPlan || 'standard',
      createdAt: info.createdAt || Date.now(),
      currentStudents: studentsCount,
      currentTeachers: teachersCount,
      maxStudents: SUBSCRIPTION_PLANS[info.subscriptionPlan || 'standard'].maxStudents,
      monthlyPrice: SUBSCRIPTION_PLANS[info.subscriptionPlan || 'standard'].monthlyPrice,
      lastSyncedAt: Date.now()
    };

    await db.ref(`system_admin/tenants_management/${universityId}`).set(tenantData);
    console.log(`✅ ${universityId} → ${info.name}`);
    syncCount++;
  }

  console.log(`\n🎉 ${syncCount} universités synchronisées!`);
  process.exit(0);
}

syncTenants().catch(err => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});
