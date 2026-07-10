/**
 * useTimeout - Hook React pour gérer setTimeout avec cleanup automatique
 *
 * Évite les memory leaks en nettoyant automatiquement les timers
 * quand le composant est démonté.
 *
 * Usage:
 * const setTimeoutSafe = useTimeout();
 * setTimeoutSafe(() => setSuccess(''), 3000);
 */

import { useEffect, useRef } from 'react';

export function useTimeout() {
  const timeoutIdsRef = useRef(new Set());

  useEffect(() => {
    // Cleanup: Clear tous les timers quand le composant se démonte
    return () => {
      timeoutIdsRef.current.forEach(id => clearTimeout(id));
      timeoutIdsRef.current.clear();
    };
  }, []);

  const setTimeoutSafe = (callback, delay) => {
    const id = setTimeout(() => {
      callback();
      timeoutIdsRef.current.delete(id);
    }, delay);

    timeoutIdsRef.current.add(id);
    return id;
  };

  return setTimeoutSafe;
}
