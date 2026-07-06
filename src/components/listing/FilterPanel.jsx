/**
 * FilterPanel.jsx - Panneau de filtres hiérarchiques
 *
 * Fonctionnalités:
 * - Filtres hiérarchiques (année → filière → niveau → classe)
 * - Recherche instantanée
 * - Reset filtres
 * - Badge compteur filtres actifs
 * - Responsive (collapsible sur mobile)
 *
 * Usage:
 * <FilterPanel
 *   filters={filters}
 *   onFilterChange={setFilter}
 *   onReset={resetFilters}
 *   searchTerm={searchTerm}
 *   onSearchChange={setSearchTerm}
 *   activeFiltersCount={3}
 *   availableOptions={{
 *     academicYears: ['2024-2025', '2025-2026'],
 *     departments: ['Informatique', 'Droit'],
 *     levels: ['L1', 'L2', 'L3'],
 *     classes: [...],
 *     statuses: ['active', 'inactive']
 *   }}
 * />
 */

import { useState } from 'react';
import { Search, X, Filter, ChevronDown } from 'lucide-react';

export default function FilterPanel({
  filters = {},
  onFilterChange,
  onReset,
  searchTerm = '',
  onSearchChange,
  activeFiltersCount = 0,
  availableOptions = {},
  showFilters = []
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Définition des filtres disponibles
  const filterConfigs = {
    academicYear: {
      label: 'Année académique',
      placeholder: 'Toutes les années',
      options: availableOptions.academicYears || []
    },
    department: {
      label: 'Filière/Département',
      placeholder: 'Toutes les filières',
      options: availableOptions.departments || []
    },
    level: {
      label: 'Niveau',
      placeholder: 'Tous les niveaux',
      options: availableOptions.levels || ['L1', 'L2', 'L3', 'M1', 'M2', 'D1', 'D2', 'D3']
    },
    classId: {
      label: 'Classe',
      placeholder: 'Toutes les classes',
      options: availableOptions.classes || []
    },
    status: {
      label: 'Statut',
      placeholder: 'Tous les statuts',
      options: availableOptions.statuses || [
        { value: 'active', label: 'Actif' },
        { value: 'inactive', label: 'Inactif' },
        { value: 'suspended', label: 'Suspendu' },
        { value: 'pending', label: 'En attente' }
      ]
    }
  };

  // Filtrer les configs selon showFilters
  const visibleFilters = showFilters.length > 0
    ? showFilters.filter(key => filterConfigs[key])
    : Object.keys(filterConfigs);

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Header du panneau */}
      <div className="px-6 py-3 flex items-center justify-between border-b border-gray-100">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-semibold"
        >
          <Filter className="w-5 h-5" />
          <span>Filtres</span>
          {activeFiltersCount > 0 && (
            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full">
              {activeFiltersCount}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>

        {/* Bouton reset */}
        {activeFiltersCount > 0 && (
          <button
            onClick={onReset}
            className="text-sm text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Contenu filtres (collapsible) */}
      {isExpanded && (
        <div className="p-6 space-y-4">
          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="🔍 Rechercher..."
              className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Grille de filtres */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {visibleFilters.map(filterKey => {
              const config = filterConfigs[filterKey];
              const options = Array.isArray(config.options)
                ? config.options
                : Object.values(config.options);

              return (
                <div key={filterKey}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {config.label}
                  </label>
                  <select
                    value={filters[filterKey] || ''}
                    onChange={(e) => onFilterChange(filterKey, e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none cursor-pointer bg-white"
                  >
                    <option value="">{config.placeholder}</option>
                    {options.map(option => {
                      const value = typeof option === 'object' ? option.value : option;
                      const label = typeof option === 'object' ? option.label : option;

                      return (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              );
            })}
          </div>

          {/* Message aucun résultat */}
          {activeFiltersCount > 0 && (
            <div className="text-sm text-gray-500 italic">
              {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
