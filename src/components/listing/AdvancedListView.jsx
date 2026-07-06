/**
 * AdvancedListView.jsx - Composant de listing avancé réutilisable
 *
 * Fonctionnalités complètes:
 * - Pagination Firebase (50 entités/page)
 * - Filtres hiérarchiques (année, filière, niveau, classe, statut)
 * - Recherche instantanée (debounced)
 * - Tri par colonnes
 * - Sélection multiple + actions bulk
 * - Export CSV
 * - Loading states + empty states
 * - Actions par ligne (voir, modifier, supprimer)
 * - Responsive (mobile, tablet, desktop)
 *
 * Usage:
 * <AdvancedListView
 *   entityType="students"
 *   collectionPath="universities/univ-sorbonne/students"
 *   title="Gestion des Étudiants"
 *   columns={[...]}
 *   filters={['academicYear', 'department', 'level', 'classId', 'status']}
 *   searchFields={['firstName', 'lastName', 'matricule']}
 *   rowActions={[...]}
 *   bulkActions={[...]}
 *   onCreateNew={() => navigate('/admin/students/create')}
 * />
 */

import { useState, useMemo } from 'react';
import { Eye, Edit, Trash2, Download, Plus, Loader } from 'lucide-react';
import useFirebasePagination from '../../hooks/useFirebasePagination';
import useFilterState from '../../hooks/useFilterState';
import useBulkSelection from '../../hooks/useBulkSelection';
import { StatsBar, FilterPanel, PaginationControls, BulkActionsBar } from './index';
import { calculateStats, formatCellValue, getStatusBadge } from '../../utils/listingHelpers';
import { exportToCSV } from '../../utils/csvExporter';

export default function AdvancedListView({
  // Configuration de base
  entityType = 'items',
  collectionPath,
  title = 'Liste',

  // Colonnes
  columns = [],

  // Filtres
  filters: filtersList = [],
  availableOptions = {},
  defaultFilters = {},

  // Recherche
  searchFields = [],
  searchPlaceholder = 'Rechercher...',

  // Actions
  rowActions = [],
  bulkActions = [],
  onCreateNew = null,

  // Pagination
  pageSize = 50,
  orderBy = 'createdAt',

  // Callbacks
  onRowClick = null,

  // Options
  enableBulkSelection = true,
  enableExport = true,
  showStats = true
}) {
  // State local
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: orderBy, direction: 'asc' });

  // Gestion des filtres
  const {
    filters,
    setFilter,
    resetFilters,
    activeFiltersCount
  } = useFilterState(`${entityType}-filters`, defaultFilters);

  // Pagination Firebase
  const {
    data,
    loading,
    error,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    nextPage,
    previousPage,
    goToPage,
    refresh
  } = useFirebasePagination({
    collectionPath,
    pageSize,
    orderBy: sortConfig.key,
    filters,
    searchFields,
    searchTerm,
    enabled: !!collectionPath
  });

  // Sélection multiple
  const {
    selectedIds,
    selectedCount,
    isSelected,
    isAllSelected,
    toggleSelect,
    toggleSelectAll,
    clearSelection
  } = useBulkSelection(data);

  // Calculer stats
  const stats = useMemo(() => calculateStats(data), [data]);

  // Tri des données localement (déjà triées par Firebase, mais on peut re-trier)
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let comparison = 0;

      if (typeof aVal === 'string') {
        comparison = aVal.localeCompare(bVal, 'fr', { sensitivity: 'base' });
      } else if (typeof aVal === 'number') {
        comparison = aVal - bVal;
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  // Gérer le tri
  const handleSort = (columnKey) => {
    setSortConfig(prev => ({
      key: columnKey,
      direction: prev.key === columnKey && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Gérer l'export CSV
  const handleExport = () => {
    const csvColumns = columns.map(col => ({
      key: col.key,
      label: col.label,
      format: col.format
    }));

    exportToCSV(sortedData, csvColumns, {
      filename: entityType,
      entityType,
      includeTimestamp: true
    });
  };

  // Rendu loading
  if (loading && data.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  // Rendu erreur
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-xl">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Erreur de chargement</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-black text-gray-900">{title}</h1>
              <p className="text-gray-600 mt-1">
                {totalCount.toLocaleString('fr-FR')} résultat{totalCount > 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Bouton export */}
              {enableExport && data.length > 0 && (
                <button
                  onClick={handleExport}
                  className="px-4 py-2.5 bg-white border-2 border-gray-200 hover:border-blue-500 text-gray-700 rounded-xl font-semibold transition-all flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  <span className="hidden sm:inline">Exporter CSV</span>
                </button>
              )}

              {/* Bouton créer */}
              {onCreateNew && (
                <button
                  onClick={onCreateNew}
                  className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">Créer</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      {showStats && (
        <StatsBar
          total={totalCount}
          stats={stats}
          currentPage={currentPage}
          totalPages={totalPages}
          loading={loading}
          onRefresh={refresh}
        />
      )}

      {/* Filtres */}
      <FilterPanel
        filters={filters}
        onFilterChange={setFilter}
        onReset={resetFilters}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        activeFiltersCount={activeFiltersCount}
        availableOptions={availableOptions}
        showFilters={filtersList}
      />

      {/* Actions Bulk */}
      {enableBulkSelection && (
        <BulkActionsBar
          selectedCount={selectedCount}
          onClearSelection={clearSelection}
          actions={bulkActions}
        />
      )}

      {/* Table */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {sortedData.length === 0 ? (
          // Empty state
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📭</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun résultat</h3>
            <p className="text-gray-600 mb-6">
              {activeFiltersCount > 0 || searchTerm
                ? 'Aucun élément ne correspond aux filtres appliqués.'
                : 'Aucun élément disponible.'}
            </p>
            {(activeFiltersCount > 0 || searchTerm) && (
              <button
                onClick={() => {
                  resetFilters();
                  setSearchTerm('');
                }}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Table Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    {/* Checkbox sélection tout */}
                    {enableBulkSelection && (
                      <th className="px-4 py-4 text-left w-12">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={toggleSelectAll}
                          className="w-5 h-5 rounded border-2 border-gray-300 text-blue-500 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                    )}

                    {/* Colonnes */}
                    {columns.map(col => (
                      <th
                        key={col.key}
                        className={`px-4 py-4 text-left ${col.sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                        onClick={() => col.sortable && handleSort(col.key)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-700">{col.label}</span>
                          {col.sortable && sortConfig.key === col.key && (
                            <span className="text-blue-500">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}

                    {/* Colonne actions */}
                    {rowActions.length > 0 && (
                      <th className="px-4 py-4 text-center w-32">
                        <span className="text-sm font-bold text-gray-700">Actions</span>
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {sortedData.map((item, index) => (
                    <tr
                      key={item.id}
                      className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                        onRowClick ? 'cursor-pointer' : ''
                      }`}
                      onClick={() => onRowClick && onRowClick(item)}
                    >
                      {/* Checkbox */}
                      {enableBulkSelection && (
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected(item.id)}
                            onChange={() => toggleSelect(item.id)}
                            className="w-5 h-5 rounded border-2 border-gray-300 text-blue-500 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                      )}

                      {/* Données */}
                      {columns.map(col => {
                        let value = item[col.key];

                        // Formatage spécial
                        if (col.render) {
                          value = col.render(item);
                        } else if (col.format === 'status') {
                          const badge = getStatusBadge(value);
                          return (
                            <td key={col.key} className="px-4 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.bgColor} ${badge.textColor}`}>
                                {badge.icon} {badge.label}
                              </span>
                            </td>
                          );
                        } else {
                          value = formatCellValue(value, col.format);
                        }

                        return (
                          <td key={col.key} className="px-4 py-4 text-gray-900">
                            {value}
                          </td>
                        );
                      })}

                      {/* Actions */}
                      {rowActions.length > 0 && (
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            {rowActions.map((action, actionIndex) => {
                              const Icon = action.icon;
                              return (
                                <button
                                  key={actionIndex}
                                  onClick={() => action.onClick(item)}
                                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title={action.label}
                                >
                                  <Icon className="w-5 h-5" />
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards Mobile */}
            <div className="md:hidden space-y-4 p-4">
              {sortedData.map(item => (
                <div
                  key={item.id}
                  className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200 hover:border-blue-400 transition-all"
                  onClick={() => onRowClick && onRowClick(item)}
                >
                  {/* Checkbox mobile */}
                  {enableBulkSelection && (
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="checkbox"
                        checked={isSelected(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 rounded border-2 border-gray-300 text-blue-500 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-xs text-gray-500">Sélectionner</span>
                    </div>
                  )}

                  {/* Données mobile */}
                  <div className="space-y-2">
                    {columns.slice(0, 3).map(col => {
                      let value = item[col.key];
                      if (col.render) {
                        value = col.render(item);
                      } else {
                        value = formatCellValue(value, col.format);
                      }

                      return (
                        <div key={col.key}>
                          <span className="text-xs text-gray-500 font-semibold">{col.label}: </span>
                          <span className="text-sm text-gray-900">{value}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions mobile */}
                  {rowActions.length > 0 && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                      {rowActions.map((action, actionIndex) => {
                        const Icon = action.icon;
                        return (
                          <button
                            key={actionIndex}
                            onClick={(e) => {
                              e.stopPropagation();
                              action.onClick(item);
                            }}
                            className="flex-1 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-1"
                          >
                            <Icon className="w-4 h-4" />
                            <span>{action.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {sortedData.length > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          onPrevious={previousPage}
          onNext={nextPage}
          disabled={loading}
        />
      )}
    </div>
  );
}
