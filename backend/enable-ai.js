const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const serviceAccount = require('./firebase-admin-key.json');

initializeApp({
  credential: cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
});

const db = getDatabase();

// Activer l'IA pour toutes les universités
db.ref('universities').once('value', (snapshot) => {
  const universities = snapshot.val();

  if (!universities) {
    console.log('❌ Aucune université trouvée');
    process.exit(1);
  }

  const promises = Object.keys(universities).map(univId => {
    return db.ref(`universities/${univId}`).update({
      aiEnabled: true,
      aiAssistantName: 'Assistant Académique',
      aiPersonality: 'professional',
      aiLanguage: 'fr',
      aiFeatures: {
        studentSupport: true,
        teacherSupport: true,
        adminSupport: true,
        parentSupport: true,
        paymentReminders: true,
        gradeNotifications: true,
        scheduleAssistance: true,
        dataAnalytics: true
      },
      aiResponseStyle: 'balanced',
      aiContextAwareness: 'full'
    }).then(() => {
      console.log(`✅ IA activée pour université: ${univId} (${universities[univId].name})`);
    });
  });

  Promise.all(promises).then(() => {
    console.log('\n✅ Configuration IA terminée pour toutes les universités!');
    process.exit(0);
  }).catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
});
