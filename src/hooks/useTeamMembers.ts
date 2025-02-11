import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Route = Database['public']['Tables']['routes']['Row'];

type TeamMember = Profile & {
  routes?: Route[];
};

export const useTeamMembers = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Fetch routes for all team members
      const { data: routesData, error: routesError } = await supabase
        .from('routes')
        .select('*')
        .in('driver_id', profilesData.map(p => p.id));

      if (routesError) throw routesError;

      // Combine profiles with their routes
      const membersWithRoutes = profilesData.map(profile => ({
        ...profile,
        routes: routesData.filter(route => route.driver_id === profile.id),
      }));

      setMembers(membersWithRoutes);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  const createTeamMember = async (memberData: Database['public']['Tables']['profiles']['Insert']) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([memberData])
        .select()
        .single();

      if (error) throw error;

      setMembers(prev => [{ ...data, routes: [] }, ...prev]);
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('An error occurred');
    }
  };

  const updateTeamMember = async (
    id: string,
    updates: Database['public']['Tables']['profiles']['Update']
  ) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setMembers(prev =>
        prev.map(member =>
          member.id === id ? { ...member, ...data } : member
        )
      );

      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('An error occurred');
    }
  };

  const deleteTeamMember = async (id: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMembers(prev => prev.filter(member => member.id !== id));
    } catch (err) {
      throw err instanceof Error ? err : new Error('An error occurred');
    }
  };

  const assignRoute = async (memberId: string, routeId: string) => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .update({ driver_id: memberId })
        .eq('id', routeId)
        .select()
        .single();

      if (error) throw error;

      setMembers(prev =>
        prev.map(member =>
          member.id === memberId
            ? {
                ...member,
                routes: [...(member.routes || []), data],
              }
            : member
        )
      );

      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('An error occurred');
    }
  };

  const unassignRoute = async (routeId: string) => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .update({ driver_id: null })
        .eq('id', routeId)
        .select()
        .single();

      if (error) throw error;

      setMembers(prev =>
        prev.map(member => ({
          ...member,
          routes: member.routes?.filter(route => route.id !== routeId),
        }))
      );

      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('An error occurred');
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  return {
    members,
    loading,
    error,
    fetchTeamMembers,
    createTeamMember,
    updateTeamMember,
    deleteTeamMember,
    assignRoute,
    unassignRoute,
  };
}; 