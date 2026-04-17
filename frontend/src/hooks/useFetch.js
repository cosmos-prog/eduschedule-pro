/**
 * EduSchedule Pro - Hook personnalisé useFetch
 * Gestion centralisée des appels API avec state de chargement
 */
import { useState, useEffect, useCallback } from 'react';

/**
 * Hook pour charger des données depuis l'API
 * @param {Function} fetchFn - Fonction qui retourne une promesse
 * @param {Array} deps - Dépendances pour le rechargement
 * @param {boolean} immediate - Charger immédiatement
 */
const useFetch = (fetchFn, deps = [], immediate = true) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchFn(...args);
      const result = response.data?.data ?? response.data;
      setData(result);
      return result;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Une erreur est survenue';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => execute(), [execute]);

  return { data, loading, error, execute, refresh, setData };
};

export default useFetch;
