/**
 * AuthContext - Gestion centralisée de l'authentification
 *
 * Sécurité Production-Ready:
 * - État auth partagé globalement
 * - Rechargement automatique du profil
 * - Protection contre les race conditions
 * - Déconnexion sécurisée avec cleanup
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, database } from '../config/firebase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔄 AuthContext: Initialisation listener onAuthStateChanged');

    // Écoute des changements d'auth Firebase
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔐 AuthContext: onAuthStateChanged déclenché', user ? `User: ${user.uid}` : 'Pas d\'utilisateur');

      if (user) {
        // Utilisateur connecté - charger son profil complet
        try {
          console.log('📥 AuthContext: Chargement profil utilisateur...');
          const userRef = ref(database, `users/${user.uid}`);
          const snapshot = await get(userRef);

          if (snapshot.exists()) {
            const profile = snapshot.val();
            console.log('✅ AuthContext: Profil chargé', profile.role);
            setCurrentUser(user);
            setUserProfile(profile);
          } else {
            // Profil introuvable - déconnexion sécurisée
            console.error('❌ AuthContext: Profil utilisateur introuvable');
            await firebaseSignOut(auth);
            setCurrentUser(null);
            setUserProfile(null);
          }
        } catch (error) {
          console.error('❌ AuthContext: Erreur chargement profil:', error);
          // En cas d'erreur, on déconnecte pour éviter les états incohérents
          await firebaseSignOut(auth);
          setCurrentUser(null);
          setUserProfile(null);
        }
      } else {
        // Pas d'utilisateur - cleanup
        console.log('🔓 AuthContext: Pas d\'utilisateur connecté');
        setCurrentUser(null);
        setUserProfile(null);
      }

      console.log('✅ AuthContext: Loading terminé');
      setLoading(false);
    });

    return () => {
      console.log('🛑 AuthContext: Cleanup listener');
      unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Erreur déconnexion:', error);
      throw error;
    }
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    signOut,
    isAuthenticated: !!currentUser,
    role: userProfile?.role || null,
    universityId: userProfile?.universityId || null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
