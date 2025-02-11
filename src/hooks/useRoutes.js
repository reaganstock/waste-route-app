import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useRoutes = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: routesError } = await supabase
        .from('routes')
        .select(`
          *,
          driver:driver_id(*),
          houses:houses(*)
        `)
        .order('date', { ascending: true });

      if (routesError) throw routesError;

      setRoutes(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();

    // Subscribe to changes
    const routesSubscription = supabase
      .channel('routes_channel')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'routes' 
        }, 
        () => {
          fetchRoutes();
        }
      )
      .subscribe();

    return () => {
      routesSubscription.unsubscribe();
    };
  }, []);

  return { routes, loading, error, fetchRoutes };
}; 