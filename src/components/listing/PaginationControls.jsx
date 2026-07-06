/**
 * PaginationControls.jsx - Contrôles de pagination
 *
 * Fonctionnalités:
 * - Navigation précédent/suivant
 * - Numéros de pages (avec ellipses)
 * - Saut à une page spécifique
 * - Info page actuelle / total
 * - Responsive (compact sur mobile)
 *
 * Usage:
 * <PaginationControls
 *   currentPage={5}
 *   totalPages={20}
 *   onPageChange={(page) => goToPage(page)}
 *   onPrevious={previousPage}
 *   onNext={nextPage}
 *   disabled={loading}
 * />
 */

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function PaginationControls({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onPrevious,
  onNext,
  disabled = false,
  maxVisiblePages = 7
}) {
  // Générer les numéros de pages visibles
  const generatePageNumbers = () => {
    const pages = [];

    if (totalPages <= maxVisiblePages) {
      // Si peu de pages, tout afficher
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Logique avec ellipses
      const leftSiblingIndex = Math.max(currentPage - 1, 1);
      const rightSiblingIndex = Math.min(currentPage + 1, totalPages);

      const showLeftEllipsis = leftSiblingIndex > 2;
      const showRightEllipsis = rightSiblingIndex < totalPages - 1;

      // Toujours afficher première page
      pages.push(1);

      if (showLeftEllipsis) {
        pages.push('...');
      }

      // Pages autour de la page actuelle
      for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }

      if (showRightEllipsis) {
        pages.push('...');
      }

      // Toujours afficher dernière page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = generatePageNumbers();
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <div className="bg-white border-t border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Info mobile */}
        <div className="text-sm text-gray-600 md:hidden">
          Page <span className="font-bold">{currentPage}</span> sur{' '}
          <span className="font-bold">{totalPages}</span>
        </div>

        {/* Contrôles principaux */}
        <div className="flex items-center gap-2 mx-auto">
          {/* Première page */}
          <button
            onClick={() => onPageChange(1)}
            disabled={disabled || !hasPrevious}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors hidden sm:block"
            title="Première page"
          >
            <ChevronsLeft className="w-5 h-5" />
          </button>

          {/* Précédent */}
          <button
            onClick={onPrevious}
            disabled={disabled || !hasPrevious}
            className="px-4 py-2 rounded-lg text-gray-700 font-semibold hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Précédent</span>
          </button>

          {/* Numéros de pages */}
          <div className="hidden md:flex items-center gap-1">
            {pageNumbers.map((page, index) => {
              if (page === '...') {
                return (
                  <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-400">
                    ...
                  </span>
                );
              }

              const isActive = page === currentPage;

              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  disabled={disabled}
                  className={`min-w-[40px] px-3 py-2 rounded-lg font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gray-100'
                  } disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          {/* Info desktop (entre les boutons) */}
          <div className="px-3 py-2 text-sm text-gray-600 md:hidden">
            {currentPage} / {totalPages}
          </div>

          {/* Suivant */}
          <button
            onClick={onNext}
            disabled={disabled || !hasNext}
            className="px-4 py-2 rounded-lg text-gray-700 font-semibold hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          >
            <span className="hidden sm:inline">Suivant</span>
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dernière page */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={disabled || !hasNext}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors hidden sm:block"
            title="Dernière page"
          >
            <ChevronsRight className="w-5 h-5" />
          </button>
        </div>

        {/* Saut à la page (desktop uniquement) */}
        <div className="hidden lg:flex items-center gap-2">
          <span className="text-sm text-gray-600">Aller à la page :</span>
          <input
            type="number"
            min="1"
            max={totalPages}
            value={currentPage}
            onChange={(e) => {
              const page = parseInt(e.target.value, 10);
              if (page >= 1 && page <= totalPages) {
                onPageChange(page);
              }
            }}
            disabled={disabled}
            className="w-20 px-3 py-1.5 border-2 border-gray-200 rounded-lg text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none disabled:opacity-30"
          />
        </div>
      </div>
    </div>
  );
}
