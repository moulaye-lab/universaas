/**
 * ProtectedRoute - Protection des routes par authentification et rôle
 *
 * Sécurité:
 * - Vérifie l'authentification
 * - Vérifie le rôle requis
 * - Redirection automatique si non autorisé
 * - Loading state pour éviter les flashes
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import Layout from './Layout';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, userProfile, loading } = useAuth();

  useEffect(() => {
    console.log('🛡️ ProtectedRoute useEffect:', { loading, currentUser: !!currentUser, userProfile: !!userProfile, role: userProfile?.role, allowedRoles });
  }, [loading, currentUser, userProfile, allowedRoles]);

  console.log('🛡️ ProtectedRoute RENDER:', { loading, currentUser: !!currentUser, userProfile: !!userProfile, role: userProfile?.role, allowedRoles });

  // Pendant le chargement - ne rien afficher
  if (loading) {
    console.log('⏳ ProtectedRoute: Affichage loader (loading=true)');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Vérification...</p>
        </div>
      </div>
    );
  }

  // Pas d'utilisateur - rediriger vers login
  if (!currentUser) {
    console.log('🚫 ProtectedRoute: Pas d\'utilisateur → redirection /login');
    return <Navigate to="/login" replace />;
  }

  // Utilisateur connecté mais rôle non autorisé
  if (allowedRoles && !allowedRoles.includes(userProfile?.role)) {
    console.error(`🚫 ProtectedRoute: Accès refusé. Rôle requis: ${allowedRoles.join(', ')}, rôle actuel: ${userProfile?.role}`);

    // Rediriger vers le dashboard approprié selon le rôle
    const roleRedirects = {
      'super_admin_plateforme': '/dashboard/super-admin',
      'admin_universite': '/dashboard/admin',
      'comptable': '/dashboard/comptable',
      'teacher': '/dashboard/teacher',
      'student': '/dashboard/student',
      'parent': '/dashboard/parent',
    };

    const redirectTo = roleRedirects[userProfile?.role] || '/login';
    console.log(`🔄 ProtectedRoute: Redirection vers ${redirectTo} (rôle non autorisé)`);
    return <Navigate to={redirectTo} replace />;
  }

  // Tout est OK - afficher la page avec le Layout
  console.log('✅ ProtectedRoute: Accès autorisé → affichage Layout');
  return <Layout>{children}</Layout>;
}
