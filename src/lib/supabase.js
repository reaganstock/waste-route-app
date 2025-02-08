import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Helper functions for database operations
export const addHouse = async (houseData) => {
  const { data, error } = await supabase
    .from('houses')
    .insert([houseData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateHouseStatus = async (houseId, status, notes = '') => {
  const { data, error } = await supabase
    .from('houses')
    .update({ status, notes })
    .eq('id', houseId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const getRouteHouses = async (routeId) => {
  const { data, error } = await supabase
    .from('houses')
    .select('*')
    .eq('route_id', routeId)
    .order('created_at');
  
  if (error) throw error;
  return data;
};

export const createRoute = async (routeData) => {
  const { data, error } = await supabase
    .from('routes')
    .insert([routeData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateRouteStatus = async (routeId, status) => {
  const { data, error } = await supabase
    .from('routes')
    .update({ status })
    .eq('id', routeId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const addRouteHistory = async (historyData) => {
  const { data, error } = await supabase
    .from('route_history')
    .insert([historyData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}; 