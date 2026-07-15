/**
 * Pagination.jsx - Composant UI de pagination réutilisable
 *
 * Interface moderne de navigation entre pages avec:
 * - Boutons précédent/suivant
 * - Numéros de pages
 * - Sélecteur de taille de page
 * - Affichage du range actuel
 */

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  startItem,
  endItem,
  hasNextPage,
  hasPrevPage,
  goToPage,
  nextPage,
  prevPage,
  goToFirstPage,
  goToLastPage,
  changePageSize,
  pageSizeOptions = [10, 20, 50, 100],
}) {
  if (totalPages <= 1) return null;

  // Générer les numéros de pages à afficher
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 7; // Nombre maximum de numéros visibles

    if (totalPages <= maxVisible) {
      // Afficher toutes les pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Afficher avec ellipses
      if (currentPage <= 4) {
        // Début
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // Fin
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        // Milieu
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-4 py-3 bg-white rounded-lg border border-gray-200">
      {/* Info et sélecteur de taille */}
      <div className="flex items-center gap-4">
        <p className="text-sm text-gray-700">
          Affichage{' '}
          <span className="font-semibold">{startItem}</span> à{' '}
          <span className="font-semibold">{endItem}</span> sur{' '}
          <span className="font-semibold">{totalItems}</span> résultats
        </p>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Lignes:</label>
          <select
            value={pageSize}
            onChange={(e) => changePageSize(Number(e.target.value))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-2">
        {/* Première page */}
        <button
          onClick={goToFirstPage}
          disabled={!hasPrevPage}
          className={`p-2 rounded-lg transition ${
            hasPrevPage
              ? 'hover:bg-gray-100 text-gray-700'
              : 'text-gray-300 cursor-not-allowed'
          }`}
          title="Première page"
        >
          <ChevronsLeft className="w-5 h-5" />
        </button>

        {/* Page précédente */}
        <button
          onClick={prevPage}
          disabled={!hasPrevPage}
          className={`p-2 rounded-lg transition ${
            hasPrevPage
              ? 'hover:bg-gray-100 text-gray-700'
              : 'text-gray-300 cursor-not-allowed'
          }`}
          title="Page précédente"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Numéros de pages */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-400">
                  ...
                </span>
              );
            }

            return (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`min-w-[40px] px-3 py-2 rounded-lg text-sm font-medium transition ${
                  currentPage === page
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* Page suivante */}
        <button
          onClick={nextPage}
          disabled={!hasNextPage}
          className={`p-2 rounded-lg transition ${
            hasNextPage
              ? 'hover:bg-gray-100 text-gray-700'
              : 'text-gray-300 cursor-not-allowed'
          }`}
          title="Page suivante"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Dernière page */}
        <button
          onClick={goToLastPage}
          disabled={!hasNextPage}
          className={`p-2 rounded-lg transition ${
            hasNextPage
              ? 'hover:bg-gray-100 text-gray-700'
              : 'text-gray-300 cursor-not-allowed'
          }`}
          title="Dernière page"
        >
          <ChevronsRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
