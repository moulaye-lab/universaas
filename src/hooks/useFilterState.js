/**
 * useFilterState.js - Hook pour gérer l'état des filtres avec LocalStorage
 *
 * Fonctionnalités:
 * - Sauvegarde automatique dans LocalStorage
 * - Reset filtres
 * - Compteur filtres actifs
 * - URL params (optionnel)
 *
 * Usage:
 * const { filters, setFilter, resetFilters, activeFiltersCount } =
 *   useFilterState('students-filters', {
 *     academicYear: '',
 *     department: '',
 *     level: '',
 *     status: 'active'
 *   });
 */

import { useState, useEffect, useCallback } from 'react';

export default function useFilterState(storageKey, defaultFilters = {}) {
  const [filters, setFilters] = useState(() => {
    // Charger depuis LocalStorage si existe
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return { ...defaultFilters, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Error loading filters from localStorage:', error);
    }
    return defaultFilters;
  });

  // Sauvegarder dans LocalStorage à chaque changement
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(filters));
    } catch (error) {
      console.error('Error saving filters to localStorage:', error);
    }
  }, [filters, storageKey]);

  // Mettre à jour un filtre
  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Mettre à jour plusieurs filtres
  const setMultipleFilters = useCallback((newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  // Reset tous les filtres
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, [defaultFilters]);

  // Compter filtres actifs (différents de valeur par défaut)
  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    const defaultValue = defaultFilters[key];
    return value && value !== '' && value !== 'all' && value !== defaultValue;
  }).length;

  return {
    filters,
    setFilter,
    setMultipleFilters,
    resetFilters,
    activeFiltersCount
  };
}
