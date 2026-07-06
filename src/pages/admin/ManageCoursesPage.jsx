/**
 * ManageCoursesPage.jsx - Page centralisée de gestion des cours
 *
 * Fonctionnalités:
 * - Créer un nouveau cours
 * - Voir la liste des cours
 * - Navigation rapide entre les deux
 */

import { useNavigate } from 'react-router-dom';
import { BookPlus, List, ArrowLeft, BookOpen, GraduationCap } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';

export default function ManageCoursesPage() {
  const navigate = useNavigate();

  const actions = [
    {
      title: 'Créer un Cours',
      description: 'Ajouter un nouveau cours au catalogue',
      icon: BookPlus,
      action: () => navigate('/admin/courses/create'),
      gradient: 'from-purple-500 to-purple-600',
      color: 'purple'
    },
    {
      title: 'Liste des Cours',
      description: 'Consulter, modifier ou supprimer des cours',
      icon: List,
      action: () => navigate('/admin/courses'),
      gradient: 'from-indigo-500 to-purple-500',
      color: 'indigo'
    }
  ];

  return (
    <AdminLayout>
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2 flex items-center gap-3">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              Gestion des Cours
            </h1>
            <p className="text-gray-600 text-lg">
              Créer et gérer les cours de votre université
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="px-6 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold shadow flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour
          </button>
        </div>

        {/* Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className="group glass rounded-3xl p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 text-left"
            >
              {/* Icon */}
              <div className={`w-16 h-16 bg-gradient-to-br ${action.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <action.icon className="w-8 h-8 text-white" />
              </div>

              {/* Title */}
              <h2 className="text-2xl font-black text-gray-900 mb-2">
                {action.title}
              </h2>

              {/* Description */}
              <p className="text-gray-600">
                {action.description}
              </p>

              {/* Hover Arrow */}
              <div className="mt-6 flex items-center gap-2 text-gray-400 group-hover:text-purple-600 transition-colors">
                <span className="text-sm font-semibold">Accéder</span>
                <svg className="w-5 h-5 transform group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Info Card */}
        <div className="mt-8 glass rounded-2xl p-6 border-l-4 border-purple-500">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Gestion complète des cours
              </h3>
              <ul className="text-gray-600 space-y-1 text-sm">
                <li>• Créer des cours avec code, nom, description et crédits ECTS</li>
                <li>• Consulter le catalogue complet avec recherche et filtres</li>
                <li>• Assigner des enseignants aux cours</li>
                <li>• Gérer les inscriptions des étudiants</li>
                <li>• Configurer les horaires et salles de cours</li>
              </ul>
            </div>
          </div>
        </div>
        </div>
      </div>
    </AdminLayout>
  );
}
