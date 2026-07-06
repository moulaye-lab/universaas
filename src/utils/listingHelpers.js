/**
 * listingHelpers.js - Fonctions utilitaires pour les systèmes de listing
 *
 * Fonctions:
 * - formatEntityName: Formate le nom selon le type d'entité
 * - getStatusBadge: Retourne le badge de statut
 * - generateCSVData: Génère données CSV
 * - sortData: Tri avancé
 * - filterByDateRange: Filtre par plage de dates
 */

/**
 * Formate le nom complet d'une entité
 */
export function formatEntityName(entity, type) {
  switch (type) {
    case 'students':
      return `${entity.firstName} ${entity.lastName}`;
    case 'teachers':
      return `${entity.firstName} ${entity.lastName}`;
    case 'parents':
      return entity.displayName;
    case 'courses':
      return entity.name;
    case 'classes':
      return entity.name;
    default:
      return entity.name || entity.displayName || 'N/A';
  }
}

/**
 * Retourne la configuration du badge de statut
 */
export function getStatusBadge(status) {
  const configs = {
    active: {
      label: 'Actif',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      icon: '✓'
    },
    inactive: {
      label: 'Inactif',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-700',
      icon: '○'
    },
    suspended: {
      label: 'Suspendu',
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      icon: '⊘'
    },
    pending: {
      label: 'En attente',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
      icon: '⏳'
    },
    archived: {
      label: 'Archivé',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-500',
      icon: '📦'
    }
  };

  return configs[status] || configs.active;
}

/**
 * Génère les données CSV à partir d'entités
 */
export function generateCSVData(entities, columns, entityType) {
  const headers = columns.map(col => col.label);

  const rows = entities.map(entity => {
    return columns.map(col => {
      const value = entity[col.key];

      // Formatage spécial selon le type de colonne
      if (col.format === 'date' && value) {
        return new Date(value).toLocaleDateString('fr-FR');
      }

      if (col.format === 'name') {
        return formatEntityName(entity, entityType);
      }

      if (col.format === 'status') {
        return getStatusBadge(value).label;
      }

      // Tableau → jointure
      if (Array.isArray(value)) {
        return value.join(', ');
      }

      return value || 'N/A';
    });
  });

  return { headers, rows };
}

/**
 * Tri avancé des données
 */
export function sortData(data, sortKey, sortDirection = 'asc') {
  return [...data].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];

    // Null/undefined en dernier
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    // Comparaison selon le type
    let comparison = 0;

    if (typeof aVal === 'string') {
      comparison = aVal.localeCompare(bVal, 'fr', { sensitivity: 'base' });
    } else if (typeof aVal === 'number') {
      comparison = aVal - bVal;
    } else if (aVal instanceof Date) {
      comparison = aVal.getTime() - bVal.getTime();
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });
}

/**
 * Filtre par plage de dates
 */
export function filterByDateRange(data, dateField, startDate, endDate) {
  if (!startDate && !endDate) return data;

  return data.filter(item => {
    const itemDate = item[dateField];
    if (!itemDate) return false;

    const date = new Date(itemDate);

    if (startDate && date < new Date(startDate)) return false;
    if (endDate && date > new Date(endDate)) return false;

    return true;
  });
}

/**
 * Calcule les statistiques d'une liste
 */
export function calculateStats(data, statusField = 'status') {
  const stats = {
    total: data.length,
    active: 0,
    inactive: 0,
    suspended: 0,
    pending: 0,
    archived: 0
  };

  data.forEach(item => {
    const status = item[statusField];
    if (status && stats.hasOwnProperty(status)) {
      stats[status]++;
    }
  });

  return stats;
}

/**
 * Groupe les données par champ
 */
export function groupBy(data, field) {
  return data.reduce((acc, item) => {
    const key = item[field] || 'Non défini';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});
}

/**
 * Génère les options de filtre depuis les données
 */
export function generateFilterOptions(data, field) {
  const uniqueValues = new Set();

  data.forEach(item => {
    const value = item[field];
    if (value) {
      if (Array.isArray(value)) {
        value.forEach(v => uniqueValues.add(v));
      } else {
        uniqueValues.add(value);
      }
    }
  });

  return Array.from(uniqueValues).sort().map(value => ({
    value,
    label: value
  }));
}

/**
 * Highlight recherche dans texte
 */
export function highlightSearch(text, searchTerm) {
  if (!searchTerm || !text) return text;

  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
}

/**
 * Debounce fonction
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Retourne la classe CSS pour une colonne selon son type
 */
export function getColumnClass(column) {
  const baseClass = 'px-4 py-3';

  if (column.align === 'center') return `${baseClass} text-center`;
  if (column.align === 'right') return `${baseClass} text-right`;

  return `${baseClass} text-left`;
}

/**
 * Formate une valeur selon son type pour affichage
 */
export function formatCellValue(value, format) {
  if (value == null) return 'N/A';

  switch (format) {
    case 'date':
      return new Date(value).toLocaleDateString('fr-FR');
    case 'datetime':
      return new Date(value).toLocaleString('fr-FR');
    case 'number':
      return Number(value).toLocaleString('fr-FR');
    case 'currency':
      return `${Number(value).toLocaleString('fr-FR')} €`;
    case 'percentage':
      return `${Number(value).toFixed(1)}%`;
    case 'boolean':
      return value ? '✓ Oui' : '✗ Non';
    default:
      return value;
  }
}
