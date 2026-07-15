/**
 * AcademicMenuPage.jsx - Menu Académique
 *
 * Page de navigation pour tous les modules académiques
 */

import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Users,
  UserCheck,
  BookOpen,
  Award,
  Calendar,
  ClipboardList,
  GraduationCap,
  School
} from 'lucide-react';

export default function AcademicMenuPage() {
  const navigate = useNavigate();

  const academicModules = [
    {
      title: 'Étudiants',
      icon: Users,
      path: '/admin/students',
      gradient: 'from-blue-500 to-indigo-600',
      description: 'Gérer les étudiants, inscriptions, profils'
    },
    {
      title: 'Enseignants',
      icon: UserCheck,
      path: '/admin/teachers',
      gradient: 'from-purple-500 to-pink-600',
      description: 'Gérer les enseignants et leurs affectations'
    },
    {
      title: 'Classes',
      icon: School,
      path: '/admin/classes',
      gradient: 'from-cyan-500 to-blue-600',
      description: 'Créer et gérer les classes, niveaux'
    },
    {
      title: 'Cours',
      icon: BookOpen,
      path: '/admin/courses',
      gradient: 'from-orange-500 to-red-600',
      description: 'Catalogue des cours et matières'
    },
    {
      title: 'Notes',
      icon: Award,
      path: '/admin/grades',
      gradient: 'from-yellow-500 to-orange-600',
      description: 'Saisie et gestion des notes'
    },
    {
      title: 'Absences',
      icon: ClipboardList,
      path: '/admin/absences',
      gradient: 'from-red-500 to-orange-600',
      description: 'Pointage et justificatifs d\'absence'
    },
    {
      title: 'Calendrier Académique',
      icon: Calendar,
      path: '/admin/calendar',
      gradient: 'from-indigo-500 to-purple-600',
      description: 'Événements, examens, vacances'
    },
    {
      title: 'Année Académique',
      icon: Calendar,
      path: '/admin/academic-year-config',
      gradient: 'from-blue-600 to-cyan-600',
      description: 'Gestion des semestres et clôtures'
    },
    {
      title: 'Promotion Académique',
      icon: GraduationCap,
      path: '/admin/academic-promotion',
      gradient: 'from-emerald-500 to-teal-600',
      description: 'Passage en classe supérieure'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/dashboard/admin')}
              className="p-2 hover:bg-white rounded-xl transition shadow-sm"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🎓 Gestion Académique</h1>
              <p className="text-gray-600 mt-1">Choisissez un module académique</p>
            </div>
          </div>
        </div>

        {/* Grille des modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {academicModules.map((module, index) => {
            const Icon = module.icon;
            return (
              <button
                key={index}
                onClick={() => navigate(module.path)}
                className="glass rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 text-left group"
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${module.gradient} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {module.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {module.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
