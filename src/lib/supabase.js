// This is a temporary mock file to allow the app to run while migrating from Supabase to Convex
// It provides mock implementations of Supabase methods that log operations but don't connect to Supabase

console.warn('Using mock Supabase implementation. Please migrate to Convex.');

// Mock data for testing
const mockUsers = [
  { id: '1', email: 'admin@example.com', full_name: 'Admin User', role: 'admin' },
  { id: '2', email: 'driver@example.com', full_name: 'Driver User', role: 'driver' },
];

const mockProfiles = [
  { id: '1', user_id: '1', full_name: 'Admin User', avatar_url: 'https://via.placeholder.com/150' },
  { id: '2', user_id: '2', full_name: 'Driver User', avatar_url: 'https://via.placeholder.com/150' },
];

const mockTeams = [
  { id: '1', name: 'Team A', created_by: '1' },
  { id: '2', name: 'Team B', created_by: '1' },
];

const mockRoutes = [
  { id: '1', name: 'Route 1', team_id: '1', status: 'pending', created_by: '1', date: new Date().toISOString() },
  { id: '2', name: 'Route 2', team_id: '1', status: 'completed', created_by: '1', date: new Date().toISOString() },
];

const mockHouses = [
  { id: '1', address: '123 Main St', latitude: 37.7749, longitude: -122.4194, route_id: '1', status: 'pending' },
  { id: '2', address: '456 Market St', latitude: 37.7899, longitude: -122.4014, route_id: '1', status: 'pending' },
];

// Mock Supabase client
export const supabase = {
  from: (table) => {
    console.log(`[Mock Supabase] Querying table: ${table}`);
    
    return {
      select: (columns) => {
        console.log(`[Mock Supabase] Selecting columns: ${columns}`);
        return supabase.from(table);
      },
      insert: (data) => {
        console.log(`[Mock Supabase] Inserting data:`, data);
        return { data: { ...data, id: 'new-id' }, error: null };
      },
      update: (data) => {
        console.log(`[Mock Supabase] Updating data:`, data);
        return { data, error: null };
      },
      delete: () => {
        console.log(`[Mock Supabase] Deleting data`);
        return { data: null, error: null };
      },
      eq: (column, value) => {
        console.log(`[Mock Supabase] Filtering by ${column} = ${value}`);
        return supabase.from(table);
      },
      filter: (column, operator, value) => {
        console.log(`[Mock Supabase] Filtering by ${column} ${operator} ${value}`);
        return supabase.from(table);
      },
      order: (column, { ascending }) => {
        console.log(`[Mock Supabase] Ordering by ${column} (ascending: ${ascending})`);
        return supabase.from(table);
      },
      limit: (count) => {
        console.log(`[Mock Supabase] Limiting to ${count} results`);
        return supabase.from(table);
      },
      single: () => {
        console.log(`[Mock Supabase] Getting single result`);
        
        // Return mock data based on the table
        let mockData = null;
        
        if (table === 'users') mockData = mockUsers[0];
        if (table === 'profiles') mockData = mockProfiles[0];
        if (table === 'teams') mockData = mockTeams[0];
        if (table === 'routes') mockData = mockRoutes[0];
        if (table === 'houses') mockData = mockHouses[0];
        
        return Promise.resolve({ data: mockData, error: null });
      },
      then: (callback) => {
        console.log(`[Mock Supabase] Executing promise chain`);
        
        // Return mock data based on the table
        let mockData = [];
        
        if (table === 'users') mockData = mockUsers;
        if (table === 'profiles') mockData = mockProfiles;
        if (table === 'teams') mockData = mockTeams;
        if (table === 'routes') mockData = mockRoutes;
        if (table === 'houses') mockData = mockHouses;
        
        return Promise.resolve({ data: mockData, error: null }).then(callback);
      },
    };
  },
  auth: {
    signOut: () => {
      console.log(`[Mock Supabase] Signing out`);
      return Promise.resolve({ error: null });
    },
    signInWithPassword: ({ email, password }) => {
      console.log(`[Mock Supabase] Signing in with email: ${email}`);
      return Promise.resolve({ 
        data: { user: mockUsers.find(u => u.email === email) || mockUsers[0] }, 
        error: null 
      });
    },
    signUp: ({ email, password }) => {
      console.log(`[Mock Supabase] Signing up with email: ${email}`);
      return Promise.resolve({ 
        data: { user: { id: 'new-user', email } }, 
        error: null 
      });
    },
  },
  storage: {
    from: (bucket) => {
      return {
        upload: (path, file) => {
          console.log(`[Mock Supabase] Uploading file to ${bucket}/${path}`);
          return Promise.resolve({ data: { path }, error: null });
        },
        getPublicUrl: (path) => {
          console.log(`[Mock Supabase] Getting public URL for ${bucket}/${path}`);
          return { data: { publicUrl: `https://via.placeholder.com/150` } };
        },
      };
    },
  },
};

// Mock Supabase functions
export const updateHouseStatus = async (houseId, status, notes, userId) => {
  console.log(`[Mock Supabase] Updating house ${houseId} status to ${status}`);
  return { success: true };
};

export const addRouteHistory = async (routeId, userId, action, houseId, notes) => {
  console.log(`[Mock Supabase] Adding route history for ${routeId}: ${action}`);
  return { success: true };
};

export const updateRouteStatus = async (routeId, status, userId) => {
  console.log(`[Mock Supabase] Updating route ${routeId} status to ${status}`);
  return { success: true };
}; 