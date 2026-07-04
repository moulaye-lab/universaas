/**
 * PublicRoute - Routes accessibles UNIQUEMENT si NON connecté
 *
 * Utilisé pour:
 * - Page de connexion
 * - Page d'inscription
 * - Réinitialisation mot de passe
 *
 * Si l'utilisateur est connecté → redirection automatique vers son dashboard
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function PublicRoute({ children }) {
  const { currentUser, userProfile, loading } = useAuth();

  // Pendant le chargement - ne rien afficher
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  // Utilisateur connecté - redirection vers son dashboard
  if (currentUser && userProfile) {
    const roleRedirects = {
      'super_admin_plateforme': '/dashboard/super-admin',
      'admin_universite': '/dashboard/admin',
      'teacher': '/dashboard/teacher',
      'student': '/dashboard/student',
      'parent': '/dashboard/parent',
    };

    return <Navigate to={roleRedirects[userProfile.role] || '/'} replace />;
  }

  // Pas d'utilisateur - afficher la page publique
  return children;
}
