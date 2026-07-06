/**
 * ManageTeachersPage.jsx - Page centralisée de gestion des enseignants
 *
 * Fonctionnalités:
 * - Créer un nouvel enseignant
 * - Voir la liste des enseignants
 * - Navigation rapide entre les deux
 */

import { useNavigate } from 'react-router-dom';
import { UserPlus, List, ArrowLeft, UserCheck, GraduationCap } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';

export default function ManageTeachersPage() {
  const navigate = useNavigate();

  const actions = [
    {
      title: 'Créer un Enseignant',
      description: 'Ajouter un nouvel enseignant à l\'université',
      icon: UserPlus,
      action: () => navigate('/admin/teachers/create'),
      gradient: 'from-green-500 to-green-600',
      color: 'green'
    },
    {
      title: 'Liste des Enseignants',
      description: 'Consulter, modifier ou supprimer des enseignants',
      icon: List,
      action: () => navigate('/admin/teachers'),
      gradient: 'from-green-400 to-emerald-500',
      color: 'emerald'
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
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center">
                <UserCheck className="w-8 h-8 text-white" />
              </div>
              Gestion des Enseignants
            </h1>
            <p className="text-gray-600 text-lg">
              Créer et gérer les enseignants de votre université
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
              <div className="mt-6 flex items-center gap-2 text-gray-400 group-hover:text-green-600 transition-colors">
                <span className="text-sm font-semibold">Accéder</span>
                <svg className="w-5 h-5 transform group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Info Card */}
        <div className="mt-8 glass rounded-2xl p-6 border-l-4 border-green-500">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Gestion complète des enseignants
              </h3>
              <ul className="text-gray-600 space-y-1 text-sm">
                <li>• Créer des comptes enseignants avec informations professionnelles</li>
                <li>• Consulter la liste complète avec recherche par nom, email ou spécialisation</li>
                <li>• Modifier les informations (prénom, nom, téléphone, spécialisation, bio)</li>
                <li>• Assigner des cours aux enseignants</li>
                <li>• Supprimer des comptes si nécessaire</li>
              </ul>
            </div>
          </div>
        </div>
        </div>
      </div>
    </AdminLayout>
  );
}
