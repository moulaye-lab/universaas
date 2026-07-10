/**
 * Header.jsx - Header global de l'application
 *
 * Fonctionnalités:
 * - Logo et nom de l'université
 * - Informations utilisateur (nom, email, rôle)
 * - Bouton de déconnexion
 * - Visible sur toutes les pages
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, LogOut, User, Menu, X } from 'lucide-react';
import NotificationBell from './NotificationBell';

export default function Header() {
  const navigate = useNavigate();
  const { userProfile, signOut } = useAuth();
  const [university, setUniversity] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    loadUniversity();
  }, [userProfile]);

  const loadUniversity = async () => {
    if (!userProfile?.universityId) return;

    try {
      const univRef = ref(database, `universities/${userProfile.universityId}`);
      const univSnap = await get(univRef);

      if (univSnap.exists()) {
        setUniversity(univSnap.val());
      }
    } catch (err) {
      console.error('Error loading university:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const getRoleName = (role) => {
    const roleMap = {
      'super_admin_plateforme': 'Super Admin',
      'admin_universite': 'Administrateur',
      'comptable': 'Comptable',
      'teacher': 'Enseignant',
      'student': 'Étudiant',
      'parent': 'Parent'
    };
    return roleMap[role] || role;
  };

  const getDashboardRoute = () => {
    switch (userProfile?.role) {
      case 'super_admin_plateforme':
        return '/dashboard/super-admin';
      case 'admin_universite':
        return '/dashboard/admin';
      case 'comptable':
        return '/dashboard/comptable';
      case 'teacher':
        return '/dashboard/teacher';
      case 'student':
        return '/dashboard/student';
      case 'parent':
        return '/dashboard/parent';
      default:
        return '/';
    }
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-sm bg-white/95 border-b border-gray-200 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo et nom */}
          <button
            onClick={() => navigate(getDashboardRoute())}
            className="flex items-center gap-3 hover:opacity-80 transition"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-gray-900">
                {university?.name || 'Université'}
              </h1>
              <p className="text-xs text-gray-600">{getRoleName(userProfile?.role)}</p>
            </div>
          </button>

          {/* Desktop: Info utilisateur et déconnexion */}
          <div className="hidden md:flex items-center gap-4">
            <NotificationBell />
            <div className="h-10 w-px bg-gray-300"></div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{userProfile?.displayName}</p>
              <p className="text-xs text-gray-600">{userProfile?.email}</p>
            </div>
            <div className="h-10 w-px bg-gray-300"></div>
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-all duration-300 hover:scale-110 flex items-center gap-2"
              title="Déconnexion"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium hidden lg:inline">Déconnexion</span>
            </button>
          </div>

          {/* Mobile: Menu hamburger */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition"
          >
            {showMobileMenu ? (
              <X className="w-6 h-6 text-gray-600" />
            ) : (
              <Menu className="w-6 h-6 text-gray-600" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {showMobileMenu && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{userProfile?.displayName}</p>
                  <p className="text-xs text-gray-600">{userProfile?.email}</p>
                  <p className="text-xs text-indigo-600 font-medium mt-1">{getRoleName(userProfile?.role)}</p>
                </div>
                <NotificationBell />
              </div>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition flex items-center justify-center gap-2 font-medium"
              >
                <LogOut className="w-5 h-5" />
                Déconnexion
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
