/**
 * AdminLayout.jsx - Layout partagé pour toutes les pages admin
 *
 * Fonctionnalités:
 * - Header sticky avec déconnexion
 * - Visible sur toutes les pages admin
 * - Affiche le nom de l'université et l'utilisateur
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, BookOpen } from 'lucide-react';

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const { userProfile, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navbar Sticky */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-gray-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo + Nom Université */}
            <button
              onClick={() => navigate('/dashboard/admin')}
              className="flex items-center gap-4 hover:opacity-80 transition-opacity"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {userProfile?.universityName || 'Université'}
                </h1>
                <p className="text-xs text-gray-600">Dashboard Administrateur</p>
              </div>
            </button>

            {/* User Info + Déconnexion */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{userProfile?.displayName}</p>
                <p className="text-xs text-gray-600">{userProfile?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-all duration-300 hover:scale-110 border border-red-200"
                title="Se déconnecter"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main>
        {children}
      </main>
    </div>
  );
}
