/**
 * Script de création du compte Super Admin
 * Utilise l'API REST Firebase
 */

console.log('🚀 Création du compte Super Admin...\n');

// Credentials du Super Admin
const SUPER_ADMIN = {
  email: 'superadmin@universaas.com',
  password: 'SuperAdmin2026!',
  displayName: 'Super Admin Plateforme',
  firstName: 'Super',
  lastName: 'Admin'
};

const FIREBASE_API_KEY = 'AIzaSyBJlc3Hhehr9P5cwUxmezEOU5UlysgtAmI';
const DATABASE_URL = 'https://university-saas-7b31e-default-rtdb.firebaseio.com';

async function createSuperAdmin() {
  try {
    // 1. Créer le compte Firebase Auth
    console.log('📝 Étape 1/2 : Création utilisateur Firebase Auth...');
    const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;

    const authResponse = await fetch(signUpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: SUPER_ADMIN.email,
        password: SUPER_ADMIN.password,
        returnSecureToken: true
      })
    });

    let idToken, uid;

    if (!authResponse.ok) {
      const error = await authResponse.json();
      if (error.error?.message === 'EMAIL_EXISTS') {
        console.log('⚠️  L\'utilisateur existe déjà. Connexion...');

        // Se connecter pour récupérer le token
        const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
        const signInResponse = await fetch(signInUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: SUPER_ADMIN.email,
            password: SUPER_ADMIN.password,
            returnSecureToken: true
          })
        });

        if (!signInResponse.ok) {
          throw new Error('Impossible de se connecter avec les credentials existants');
        }

        const signInData = await signInResponse.json();
        idToken = signInData.idToken;
        uid = signInData.localId;
        console.log(`✅ Connecté avec UID: ${uid}`);
      } else {
        throw new Error(`Erreur Firebase Auth : ${error.error?.message || 'Inconnue'}`);
      }
    } else {
      const authData = await authResponse.json();
      idToken = authData.idToken;
      uid = authData.localId;
      console.log(`✅ Utilisateur créé avec UID: ${uid}`);
    }

    // 2. Créer le profil dans Realtime Database
    console.log('\n📝 Étape 2/2 : Création du profil dans Realtime Database...');

    const userProfile = {
      email: SUPER_ADMIN.email,
      displayName: SUPER_ADMIN.displayName,
      firstName: SUPER_ADMIN.firstName,
      lastName: SUPER_ADMIN.lastName,
      role: 'super_admin_plateforme',
      createdAt: Date.now(),
      profileId: uid,
      loginMethod: 'email'
    };

    const dbUrl = `${DATABASE_URL}/users/${uid}.json?auth=${idToken}`;
    const dbResponse = await fetch(dbUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userProfile)
    });

    if (!dbResponse.ok) {
      const error = await dbResponse.text();
      throw new Error(`Erreur Realtime Database : ${error}`);
    }

    console.log('✅ Profil Super Admin créé dans Realtime Database');

    // 3. Afficher les informations de connexion
    console.log('\n🎉 SUPER ADMIN CRÉÉ AVEC SUCCÈS !');
    console.log('\n📋 Informations de connexion :');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email    : ${SUPER_ADMIN.email}`);
    console.log(`🔑 Password : ${SUPER_ADMIN.password}`);
    console.log(`🆔 UID      : ${uid}`);
    console.log(`🔗 URL Login: https://university-saas.vercel.app/login`);
    console.log(`🔗 URL Dashboard: https://university-saas.vercel.app/dashboard/super-admin`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ Le compte est prêt à être utilisé pour la démo !');
    console.log('💡 IMPORTANT : Synchroniser les tenants lors de la première connexion (bouton "Synchroniser")\n');

  } catch (error) {
    console.error('\n❌ ERREUR lors de la création du Super Admin:');
    console.error(error.message);
  }
}

// Exécution
createSuperAdmin();
