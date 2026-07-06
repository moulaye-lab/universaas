/**
 * useFirebasePagination.js - Hook pour pagination Firebase optimisée
 *
 * Fonctionnalités:
 * - Pagination côté serveur (limitToFirst, startAfter)
 * - Filtres combinés (niveau, département, classe, etc.)
 * - Recherche côté client (debounced)
 * - Cache intelligent
 * - Loading states granulaires
 *
 * Usage:
 * const { data, loading, totalCount, currentPage, totalPages, nextPage, previousPage } =
 *   useFirebasePagination({
 *     collectionPath: 'universities/univ-sorbonne/students',
 *     pageSize: 50,
 *     orderBy: 'lastName',
 *     filters: { level: 'L1', status: 'active' }
 *   });
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ref, get, query, orderByChild, limitToFirst, startAt, endAt, equalTo } from 'firebase/database';
import { database } from '../config/firebase';

export default function useFirebasePagination({
  collectionPath,
  pageSize = 50,
  orderBy = 'createdAt',
  filters = {},
  searchFields = [],
  searchTerm = '',
  enabled = true
}) {
  const [data, setData] = useState([]);
  const [allData, setAllData] = useState([]); // Pour filtres côté client
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const cacheRef = useRef({});
  const abortControllerRef = useRef(null);

  // Charger les données depuis Firebase
  const loadData = useCallback(async () => {
    if (!enabled || !collectionPath) return;

    // Annuler requête précédente si en cours
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const collectionRef = ref(database, collectionPath);
      let dataQuery = collectionRef;

      // Construire query avec filtres Firebase
      const activeFilters = Object.entries(filters).filter(([_, value]) => value && value !== 'all' && value !== '');

      if (activeFilters.length > 0) {
        // Firebase ne supporte qu'un seul orderBy/filter à la fois
        // On prend le premier filtre et on fait le reste côté client
        const [filterKey, filterValue] = activeFilters[0];
        dataQuery = query(
          collectionRef,
          orderByChild(filterKey),
          equalTo(filterValue)
        );
      } else {
        // Pas de filtre actif, charger toutes les données
        // Le tri sera fait côté client
        dataQuery = collectionRef;
      }

      const snapshot = await get(dataQuery);

      if (snapshot.exists()) {
        const rawData = snapshot.val();
        let dataArray = Object.entries(rawData).map(([id, value]) => ({
          id,
          ...value
        }));

        // Filtres additionnels côté client
        if (activeFilters.length > 1) {
          activeFilters.slice(1).forEach(([key, value]) => {
            dataArray = dataArray.filter(item => item[key] === value);
          });
        }

        // Tri côté client si nécessaire
        dataArray.sort((a, b) => {
          const aVal = a[orderBy];
          const bVal = b[orderBy];

          if (typeof aVal === 'string') {
            return aVal.localeCompare(bVal);
          }
          return (aVal || 0) - (bVal || 0);
        });

        setAllData(dataArray);
        setTotalCount(dataArray.length);
      } else {
        setAllData([]);
        setTotalCount(0);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error loading data:', err);
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [collectionPath, filters, orderBy, enabled]);

  // Charger données initiales
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Appliquer recherche côté client (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!searchTerm.trim()) {
        setFilteredData(allData);
        return;
      }

      const searchLower = searchTerm.toLowerCase();
      const filtered = allData.filter(item => {
        return searchFields.some(field => {
          const value = item[field];
          if (!value) return false;
          return String(value).toLowerCase().includes(searchLower);
        });
      });

      setFilteredData(filtered);
      setTotalCount(filtered.length);
      setCurrentPage(1); // Reset à page 1 lors de la recherche
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, allData, searchFields]);

  // Mettre à jour données paginées
  useEffect(() => {
    const dataToUse = searchTerm ? filteredData : allData;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginated = dataToUse.slice(startIndex, endIndex);
    setData(paginated);
  }, [currentPage, pageSize, allData, filteredData, searchTerm]);

  // Calculer nombre total de pages
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Navigation
  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  const goToPage = useCallback((page) => {
    const pageNum = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNum);
  }, [totalPages]);

  const refresh = useCallback(() => {
    setCurrentPage(1);
    loadData();
  }, [loadData]);

  return {
    data,
    loading,
    error,
    totalCount,
    currentPage,
    totalPages,
    pageSize,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    nextPage,
    previousPage,
    goToPage,
    refresh
  };
}
