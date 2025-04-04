import { AppState } from 'react-native';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// SecureStore adapter for Supabase auth storage
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    AsyncStorage.removeItem(key);
  },
};

// Initialize Supabase client with fallback values for safety
// Get values from expo constants first (for production), fall back to process.env (for development)
console.log('Constants.expoConfig:', JSON.stringify(Constants.expoConfig?.extra || {}, null, 2));

// Use a more verbose approach to track which source is being used
let supabaseUrl;
let supabaseAnonKey;
let serviceRoleKey;

if (Constants.expoConfig?.extra?.supabaseUrl) {
  console.log('Using supabaseUrl from Constants.expoConfig.extra');
  supabaseUrl = Constants.expoConfig.extra.supabaseUrl;
} else if (process.env.EXPO_PUBLIC_SUPABASE_URL) {
  console.log('Using supabaseUrl from process.env');
  supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
} else {
  console.log('Using fallback supabaseUrl');
  supabaseUrl = 'https://ppumccuvuckqrozhygew.supabase.co';
}

if (Constants.expoConfig?.extra?.supabaseAnonKey) {
  console.log('Using supabaseAnonKey from Constants.expoConfig.extra');
  supabaseAnonKey = Constants.expoConfig.extra.supabaseAnonKey;
} else if (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  console.log('Using supabaseAnonKey from process.env');
  supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
} else {
  console.log('Using fallback supabaseAnonKey');
  supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwdW1jY3V2dWNrcXJvemh5Z2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzMTM0MzUsImV4cCI6MjA1ODg4OTQzNX0.piRot1i-3iYFrrBnPZVYeJTi60GUS_HrkKxUWSJRvw0';
}

if (Constants.expoConfig?.extra?.supabaseServiceRoleKey) {
  console.log('Using supabaseServiceRoleKey from Constants.expoConfig.extra');
  serviceRoleKey = Constants.expoConfig.extra.supabaseServiceRoleKey;
} else if (process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
  console.log('Using supabaseServiceRoleKey from process.env');
  serviceRoleKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
} else {
  console.log('Using fallback supabaseServiceRoleKey');
  serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwdW1jY3V2dWNrcXJvemh5Z2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzMTM0MzUsImV4cCI6MjA1ODg4OTQzNX0.piRot1i-3iYFrrBnPZVYeJTi60GUS_HrkKxUWSJRvw0';
}

// Log what values we're using
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseAnonKey.substring(0, 10) + '...');
console.log('Supabase Service Role Key:', serviceRoleKey.substring(0, 10) + '...');

// Create the main client with anon key
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Create a function to get admin auth client
export const getAdminAuthClient = async () => {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/admin`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get admin auth client');
    }
    
    return response;
  } catch (error) {
    console.error('Admin auth client error:', error);
    throw error;
  }
};

// Helper functions for database operations
export const addHouse = async (houseData: any) => {
  const { data, error } = await supabase
    .from('houses')
    .insert([houseData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateHouseStatus = async (houseId: string, status: string, notes: string = '') => {
  const { data, error } = await supabase
    .from('houses')
    .update({ status, notes })
    .eq('id', houseId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const getRouteHouses = async (routeId: string) => {
  const { data, error } = await supabase
    .from('houses')
    .select('*')
    .eq('route_id', routeId)
    .order('created_at');
  
  if (error) throw error;
  return data;
};

export const createRoute = async (routeData: any) => {
  const { data, error } = await supabase
    .from('routes')
    .insert([routeData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateRouteStatus = async (routeId: string, status: string) => {
  const { data, error } = await supabase
    .from('routes')
    .update({ status })
    .eq('id', routeId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const addRouteHistory = async (historyData: any) => {
  const { data, error } = await supabase
    .from('route_history')
    .insert([historyData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Function to create a new user using Supabase Management API
export const createUserWithManagementAPI = async (email: string, password: string, userData: any) => {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: userData,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create user');
    }

    return await response.json();
  } catch (error) {
    console.error('Management API Error:', error);
    throw error;
  }
};

// Function to delete a user using Supabase Management API
export const deleteUserWithManagementAPI = async (userId: string) => {
  try {
    console.log(`Attempting to delete user with ID: ${userId}`);
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Delete user response error:', errorData);
      throw new Error(errorData.message || 'Failed to delete user');
    }

    console.log('User deleted successfully via Management API');
    return { success: true };
  } catch (error) {
    console.error('Delete User API Error:', error);
    throw error;
  }
};

// Tells Supabase Auth to continuously refresh the session automatically
// if the app is in the foreground
try {
  AppState.addEventListener('change', (state) => {
    try {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    } catch (error) {
      console.log('Error in Supabase auth refresh:', error);
    }
  });
} catch (error) {
  console.log('Error setting up AppState listener:', error);
} 