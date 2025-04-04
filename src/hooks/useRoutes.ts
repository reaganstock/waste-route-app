import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';
import { useAuth } from '../contexts/AuthContext';

type Route = Database['public']['Tables']['routes']['Row'];
type House = Database['public']['Tables']['houses']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

// Extend the User type to include our custom properties
type ExtendedUser = {
  id: string;
  team_id?: string;
  profile?: {
    team_id?: string;
    role?: string;
  };
  user_metadata?: {
    role?: string;
  };
}

export type RouteWithDetails = Route & {
  houses: House[];
  driver?: Profile;
};

export const useRoutes = (routeId?: string) => {
  const [routes, setRoutes] = useState<RouteWithDetails[]>([]);
  const [route, setRoute] = useState<RouteWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // Cast user to our extended type
  const { user } = useAuth() as { user: ExtendedUser | null };

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the user's team ID
      let teamId = null;
      if (user?.team_id) {
        teamId = user.team_id;
      } else if (user?.profile?.team_id) {
        teamId = user.profile.team_id;
      }

      // Get user role
      const userRole = user?.user_metadata?.role || user?.profile?.role;
      const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

      if (!teamId && !routeId) {
        console.error("No team ID found for current user");
        setRoutes([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('routes')
        .select(`
          *,
          driver:profiles!routes_driver_id_fkey(*),
          houses(*)
        `)
        .order('date', { ascending: false });

      if (routeId) {
        // When fetching a specific route, ensure it belongs to the user's team
        query = query.eq('id', routeId);
        if (teamId) {
          query = query.eq('team_id', teamId);
        }
      } else {
        // When fetching all routes, filter by team_id
        if (teamId) {
          query = query.eq('team_id', teamId);
        }

        // If user is not an owner or admin, only show routes assigned to them
        if (!isOwnerOrAdmin) {
          query = query.eq('driver_id', user?.id);
        }
      }

      const { data, error: routesError } = routeId 
        ? await query.maybeSingle() 
        : await query;

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
      // Ensure the team_id is set when creating a route
      let teamId = null;
      if (user?.team_id) {
        teamId = user.team_id;
      } else if (user?.profile?.team_id) {
        teamId = user.profile.team_id;
      }

      if (!teamId) {
        throw new Error('Could not determine team ID. Please ensure you are assigned to a team.');
      }

      const routeWithTeam = {
        ...routeData,
        team_id: teamId
      };

      const { data, error } = await supabase
        .from('routes')
        .insert([routeWithTeam])
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