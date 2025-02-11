import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Route = Database['public']['Tables']['routes']['Row'];
type House = Database['public']['Tables']['houses']['Row'];

type RouteWithHouses = Route & {
  houses: House[];
};

export const useRoute = (routeId: string) => {
  const [route, setRoute] = useState<RouteWithHouses | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRoute = async () => {
    try {
      setLoading(true);
      
      // Fetch route data
      const { data: routeData, error: routeError } = await supabase
        .from('routes')
        .select('*')
        .eq('id', routeId)
        .single();

      if (routeError) throw routeError;

      // Fetch houses for the route
      const { data: housesData, error: housesError } = await supabase
        .from('houses')
        .select('*')
        .eq('route_id', routeId);

      if (housesError) throw housesError;

      // Combine route with its houses
      const routeWithHouses = {
        ...routeData,
        houses: housesData || [],
      };

      setRoute(routeWithHouses);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
      setRoute(null);
    } finally {
      setLoading(false);
    }
  };

  const updateRoute = async (updates: Partial<Route>) => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .update(updates)
        .eq('id', routeId)
        .select()
        .single();

      if (error) throw error;

      setRoute(prev => prev ? { ...prev, ...data } : null);
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('An error occurred');
    }
  };

  const updateHouse = async (houseId: string, updates: Partial<House>) => {
    try {
      const { data, error } = await supabase
        .from('houses')
        .update(updates)
        .eq('id', houseId)
        .select()
        .single();

      if (error) throw error;

      setRoute(prev => 
        prev ? {
          ...prev,
          houses: prev.houses.map(house =>
            house.id === houseId ? { ...house, ...data } : house
          ),
        } : null
      );

      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('An error occurred');
    }
  };

  const deleteHouse = async (houseId: string) => {
    try {
      const { error } = await supabase
        .from('houses')
        .delete()
        .eq('id', houseId);

      if (error) throw error;

      setRoute(prev =>
        prev ? {
          ...prev,
          houses: prev.houses.filter(house => house.id !== houseId),
        } : null
      );
    } catch (err) {
      throw err instanceof Error ? err : new Error('An error occurred');
    }
  };

  useEffect(() => {
    if (routeId) {
      fetchRoute();
    }
  }, [routeId]);

  return {
    route,
    loading,
    error,
    fetchRoute,
    updateRoute,
    updateHouse,
    deleteHouse,
  };
}; 