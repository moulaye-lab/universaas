/**
 * useBulkSelection.js - Hook pour gérer la sélection multiple d'entités
 *
 * Fonctionnalités:
 * - Sélection/désélection individuelle
 * - Sélection/désélection tout
 * - Compteur sélectionnés
 * - Actions bulk
 *
 * Usage:
 * const {
 *   selectedIds,
 *   isSelected,
 *   isAllSelected,
 *   toggleSelect,
 *   toggleSelectAll,
 *   clearSelection,
 *   selectedCount
 * } = useBulkSelection(data);
 */

import { useState, useCallback, useMemo } from 'react';

export default function useBulkSelection(data = []) {
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Vérifier si un élément est sélectionné
  const isSelected = useCallback((id) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  // Vérifier si tous les éléments sont sélectionnés
  const isAllSelected = useMemo(() => {
    if (data.length === 0) return false;
    return data.every(item => selectedIds.has(item.id));
  }, [data, selectedIds]);

  // Toggle sélection d'un élément
  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Toggle sélection de tous les éléments
  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map(item => item.id)));
    }
  }, [data, isAllSelected]);

  // Effacer toutes les sélections
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Sélectionner plusieurs IDs
  const selectMultiple = useCallback((ids) => {
    setSelectedIds(new Set(ids));
  }, []);

  // Nombre d'éléments sélectionnés
  const selectedCount = selectedIds.size;

  // Obtenir les entités sélectionnées
  const selectedItems = useMemo(() => {
    return data.filter(item => selectedIds.has(item.id));
  }, [data, selectedIds]);

  return {
    selectedIds: Array.from(selectedIds),
    selectedIdsSet: selectedIds,
    selectedItems,
    selectedCount,
    isSelected,
    isAllSelected,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    selectMultiple
  };
}
