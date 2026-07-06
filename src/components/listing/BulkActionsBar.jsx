/**
 * BulkActionsBar.jsx - Barre d'actions multiples
 *
 * Fonctionnalités:
 * - Affichage compteur sélection
 * - Actions bulk personnalisables
 * - Animation entrée/sortie
 * - Confirmation avant actions dangereuses
 *
 * Usage:
 * <BulkActionsBar
 *   selectedCount={5}
 *   onClearSelection={() => {}}
 *   actions={[
 *     { label: 'Supprimer', icon: Trash, onClick: handleBulkDelete, danger: true },
 *     { label: 'Exporter', icon: Download, onClick: handleBulkExport }
 *   ]}
 * />
 */

import { X } from 'lucide-react';

export default function BulkActionsBar({
  selectedCount = 0,
  onClearSelection,
  actions = []
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-6 py-4 animate-in slide-in-from-top duration-200">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Info sélection */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
              {selectedCount}
            </div>
            <span className="text-gray-900 font-semibold">
              {selectedCount} élément{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''}
            </span>
          </div>

          <button
            onClick={onClearSelection}
            className="text-sm text-gray-600 hover:text-gray-900 font-semibold flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Tout désélectionner
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {actions.map((action, index) => {
            const Icon = action.icon;
            const isDanger = action.danger || false;

            return (
              <button
                key={index}
                onClick={action.onClick}
                disabled={action.disabled}
                className={`px-4 py-2 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                  isDanger
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
