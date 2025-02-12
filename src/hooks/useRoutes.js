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

      const { data, error: fetchError } = await supabase
        .from('routes')
        .select(`
          *,
          driver:profiles(id, full_name)
        `)
        .order('date', { ascending: true });

      if (fetchError) throw fetchError;
      setRoutes(data || []);
    } catch (error) {
      console.error('Error fetching routes:', error);
      setError(error.message);
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