/**
 * useDynamicFilterOptions.js - Hook pour charger les options de filtres dynamiquement
 *
 * Fonctionnalités:
 * - Charge départements depuis Firebase
 * - Charge classes depuis Firebase
 * - Cache les résultats
 * - Mise à jour automatique
 *
 * Usage:
 * const { departments, classes, loading } = useDynamicFilterOptions(universityId);
 */

import { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '../config/firebase';

export default function useDynamicFilterOptions(universityId) {
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadOptions = async () => {
      if (!universityId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Charger les départements globaux
        const deptsRef = ref(database, 'departments');
        const deptsSnap = await get(deptsRef);

        if (deptsSnap.exists()) {
          const deptsData = Object.entries(deptsSnap.val()).map(([id, data]) => ({
            value: data.name || data.id,
            label: data.name || data.id
          }));
          setDepartments(deptsData);
        }

        // Charger les classes de cette université
        const classesRef = ref(database, `universities/${universityId}/classes`);
        const classesSnap = await get(classesRef);

        if (classesSnap.exists()) {
          const classesData = Object.entries(classesSnap.val())
            .map(([id, data]) => ({
              value: id,
              label: data.name,
              level: data.level,
              domain: data.domain
            }))
            .sort((a, b) => a.label.localeCompare(b.label));

          setClasses(classesData);
        }

      } catch (err) {
        console.error('Error loading filter options:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadOptions();
  }, [universityId]);

  // Extraire les filières uniques depuis les classes
  const fieldOfStudies = [...new Set(classes.map(c => c.domain).filter(Boolean))]
    .sort()
    .map(domain => ({
      value: domain,
      label: domain
    }));

  return {
    departments,
    fieldOfStudies,
    classes,
    loading,
    error
  };
}
