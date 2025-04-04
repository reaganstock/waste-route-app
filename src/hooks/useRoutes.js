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

      // Add houses to the query to make sure we have complete data for calculations
      const { data, error: fetchError } = await supabase
        .from('routes')
        .select(`
          *,
          driver:profiles(id, full_name),
          houses(*)
        `)
        .order('date', { ascending: true });

      if (fetchError) throw fetchError;
      
      // Add debug logging for completed routes
      if (data && data.length > 0) {
        const completedRoutes = data.filter(r => r.status === 'completed');
        console.log(`DEBUG - Fetched ${completedRoutes.length} completed routes`);
        completedRoutes.forEach(r => {
          console.log(`DEBUG - Route ${r.id} (${r.name}): completed_houses=${r.completed_houses}, total_houses=${r.total_houses}, houses.length=${r.houses?.length || 0}`);
        });
      }
      
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