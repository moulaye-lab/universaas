/**
 * FinancesMenuPage.jsx - Menu Finances
 *
 * Page de navigation pour tous les modules financiers
 */

import { useNavigate } from 'react-router-dom';
import { ChevronLeft, DollarSign, CreditCard, TrendingUp, FileText } from 'lucide-react';

export default function FinancesMenuPage() {
  const navigate = useNavigate();

  const financeModules = [
    {
      title: 'Comptabilité',
      icon: TrendingUp,
      path: '/dashboard/comptable',
      gradient: 'from-green-500 to-emerald-600',
      description: 'Journal de trésorerie, recettes et dépenses'
    },
    {
      title: 'Paiements Étudiants',
      icon: CreditCard,
      path: '/admin/payments',
      gradient: 'from-blue-500 to-cyan-600',
      description: 'Plans de paiement, échéances, relances'
    },
    {
      title: 'Recettes',
      icon: DollarSign,
      path: '/admin/revenues',
      gradient: 'from-green-500 to-teal-600',
      description: 'Enregistrer les recettes de l\'université'
    },
    {
      title: 'Dépenses',
      icon: FileText,
      path: '/admin/expenses',
      gradient: 'from-red-500 to-orange-600',
      description: 'Gérer les dépenses et factures'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <h1 className="text-3xl font-bold text-gray-900">💰 Gestion Financière</h1>
              <p className="text-gray-600 mt-1">Choisissez un module financier</p>
            </div>
          </div>
        </div>

        {/* Grille des modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {financeModules.map((module, index) => {
            const Icon = module.icon;
            return (
              <button
                key={index}
                onClick={() => navigate(module.path)}
                className="glass rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-16 h-16 bg-gradient-to-br ${module.gradient} rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
                      {module.title}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {module.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Stats rapides */}
        <div className="glass rounded-2xl p-6 mt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Vue d'ensemble financière</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Recettes totales</p>
              <p className="text-2xl font-bold text-green-600">-</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Dépenses totales</p>
              <p className="text-2xl font-bold text-red-600">-</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Solde</p>
              <p className="text-2xl font-bold text-blue-600">-</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
