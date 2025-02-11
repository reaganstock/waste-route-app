import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Route = Database['public']['Tables']['routes']['Row'];
type House = Database['public']['Tables']['houses']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export type RouteWithDetails = Route & {
  houses: House[];
  driver?: Profile;
};

export const useRoutes = (routeId?: string) => {
  const [routes, setRoutes] = useState<RouteWithDetails[]>([]);
  const [route, setRoute] = useState<RouteWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('routes')
        .select(`
          *,
          driver:profiles!routes_driver_id_fkey(*),
          houses(*)
        `)
        .order('date', { ascending: false });

      if (routeId) {
        query = query.eq('id', routeId).single();
      }

      const { data, error: routesError } = await query;

      if (routesError) throw routesError;

      if (routeId) {
        setRoute(data);
      } else {
        setRoutes(data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  const createRoute = async (routeData: Omit<Route, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .insert([routeData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('An error occurred');
    }
  };

  const updateRoute = async (id: string, updates: Partial<Route>) => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('An error occurred');
    }
  };

  const addHouses = async (routeId: string, houses: Omit<House, 'id' | 'created_at' | 'updated_at' | 'route_id'>[]) => {
    try {
      const { data, error } = await supabase
        .from('houses')
        .insert(houses.map(house => ({ ...house, route_id: routeId })))
        .select();

      if (error) throw error;
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('An error occurred');
    }
  };

  useEffect(() => {
    fetchRoutes();

    const channel = supabase.channel('routes_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public',
          table: 'routes'
        }, 
        () => fetchRoutes()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [routeId]);

  return {
    routes,
    route,
    loading,
    error,
    fetchRoutes,
    createRoute,
    updateRoute,
    addHouses,
  };
}; 