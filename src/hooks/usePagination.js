/**
 * usePagination.js - Hook réutilisable pour pagination
 *
 * Gère la pagination côté client avec:
 * - Navigation entre pages
 * - Taille de page configurable
 * - Calcul des items visibles
 * - État persistant
 */

import { useState, useMemo } from 'react';

export function usePagination(items, itemsPerPage = 20) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(itemsPerPage);

  // Calculer le nombre total de pages
  const totalPages = Math.ceil((items?.length || 0) / pageSize);

  // Calculer les items de la page actuelle
  const paginatedItems = useMemo(() => {
    if (!items || items.length === 0) return [];

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return items.slice(startIndex, endIndex);
  }, [items, currentPage, pageSize]);

  // Navigation
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);

  // Changer la taille de page et réinitialiser à la page 1
  const changePageSize = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Réinitialiser la pagination
  const reset = () => {
    setCurrentPage(1);
    setPageSize(itemsPerPage);
  };

  // Informations utiles
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, items?.length || 0);
  const totalItems = items?.length || 0;

  return {
    // Items paginés
    paginatedItems,

    // État
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    startItem,
    endItem,

    // Navigation
    goToPage,
    nextPage,
    prevPage,
    goToFirstPage,
    goToLastPage,

    // Configuration
    changePageSize,
    reset,

    // Helpers
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}
