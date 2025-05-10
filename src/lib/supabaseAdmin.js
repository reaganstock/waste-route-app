// Mock implementation of supabaseAdmin
// TODO: This is a temporary mock file. Replace with Convex functionality.

console.warn("USING MOCK SUPABASEADMIN - Please migrate to Convex");

export const supabaseAdmin = {
  from: (table) => {
    console.log(`[MOCK SUPABASEADMIN] Accessing table: ${table}`);
    
    return {
      select: (columns) => {
        console.log(`[MOCK SUPABASEADMIN] Selecting columns: ${columns || '*'}`);
        return supabaseAdmin.from(table);
      },
      insert: (data) => {
        console.log(`[MOCK SUPABASEADMIN] Inserting data into ${table}:`, data);
        return Promise.resolve({ data: { id: 'mock-id-' + Date.now() }, error: null });
      },
      update: (data) => {
        console.log(`[MOCK SUPABASEADMIN] Updating data in ${table}:`, data);
        return Promise.resolve({ data, error: null });
      },
      delete: () => {
        console.log(`[MOCK SUPABASEADMIN] Deleting from ${table}`);
        return Promise.resolve({ data: null, error: null });
      },
      eq: (column, value) => {
        console.log(`[MOCK SUPABASEADMIN] Filtering ${column} = ${value}`);
        return supabaseAdmin.from(table);
      },
      in: (column, values) => {
        console.log(`[MOCK SUPABASEADMIN] Filtering ${column} in [${values.join(', ')}]`);
        return supabaseAdmin.from(table);
      },
      match: (criteria) => {
        console.log(`[MOCK SUPABASEADMIN] Matching criteria:`, criteria);
        return supabaseAdmin.from(table);
      },
      single: () => {
        console.log(`[MOCK SUPABASEADMIN] Getting single result`);
        return Promise.resolve({ 
          data: { id: 'mock-id', created_at: new Date().toISOString() }, 
          error: null 
        });
      },
      then: (callback) => {
        return Promise.resolve({ 
          data: [{ id: 'mock-id', created_at: new Date().toISOString() }], 
          error: null 
        }).then(callback);
      }
    };
  },
  auth: {
    admin: {
      createUser: (userData) => {
        console.log(`[MOCK SUPABASEADMIN] Creating user:`, userData);
        return Promise.resolve({ 
          data: { id: 'mock-user-id-' + Date.now(), ...userData },
          error: null
        });
      },
      inviteUserByEmail: (email) => {
        console.log(`[MOCK SUPABASEADMIN] Inviting user by email: ${email}`);
        return Promise.resolve({ data: true, error: null });
      }
    }
  },
  storage: {
    from: (bucket) => {
      console.log(`[MOCK SUPABASEADMIN] Accessing storage bucket: ${bucket}`);
      return {
        upload: (path, file) => {
          console.log(`[MOCK SUPABASEADMIN] Uploading to ${path}`);
          return Promise.resolve({ data: { path }, error: null });
        },
        getPublicUrl: (path) => {
          console.log(`[MOCK SUPABASEADMIN] Getting public URL for ${path}`);
          return { data: { publicUrl: `https://mock-url.com/${path}` } };
        }
      };
    }
  }
};

// Helper functions if needed
export const adminCreateUser = async (userData) => {
  console.log('[MOCK SUPABASEADMIN] Admin creating user:', userData);
  return { id: 'mock-user-id-' + Date.now(), ...userData };
};

export const adminInviteUser = async (email) => {
  console.log(`[MOCK SUPABASEADMIN] Admin inviting user: ${email}`);
  return true;
}; 