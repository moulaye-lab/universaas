/**
 * StatsBar.jsx - Barre de statistiques pour listings
 *
 * Affiche:
 * - Total entités
 * - Répartition par statut (actifs, inactifs, etc.)
 * - Pagination actuelle
 * - Bouton refresh
 *
 * Usage:
 * <StatsBar
 *   total={1247}
 *   stats={{ active: 1200, inactive: 40, suspended: 7 }}
 *   currentPage={1}
 *   totalPages={25}
 *   loading={false}
 *   onRefresh={() => {}}
 * />
 */

import { RefreshCw, Users, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function StatsBar({
  total = 0,
  stats = {},
  currentPage = 1,
  totalPages = 1,
  loading = false,
  onRefresh
}) {
  const statItems = [
    {
      key: 'active',
      label: 'Actifs',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      key: 'inactive',
      label: 'Inactifs',
      icon: XCircle,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50'
    },
    {
      key: 'suspended',
      label: 'Suspendus',
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      key: 'pending',
      label: 'En attente',
      icon: AlertCircle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    }
  ];

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Statistiques principales */}
        <div className="flex items-center gap-6 flex-wrap">
          {/* Total */}
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{total.toLocaleString('fr-FR')}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>

          {/* Séparateur */}
          <div className="h-12 w-px bg-gray-200" />

          {/* Stats par statut */}
          {statItems.map(item => {
            const count = stats[item.key] || 0;
            if (count === 0) return null;

            return (
              <div key={item.key} className="flex items-center gap-2">
                <div className={`p-2 ${item.bgColor} rounded-lg`}>
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{count.toLocaleString('fr-FR')}</p>
                  <p className="text-xs text-gray-500">{item.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination + Refresh */}
        <div className="flex items-center gap-4">
          {/* Info pagination */}
          <div className="text-sm text-gray-600">
            <span className="font-semibold">Page {currentPage}</span>
            <span className="text-gray-400"> / {totalPages}</span>
          </div>

          {/* Bouton refresh */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Actualiser"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
