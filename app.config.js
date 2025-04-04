import 'dotenv/config';

export default ({ config }) => {
  // Get environment variables
  const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ppumccuvuckqrozhygew.supabase.co';
  const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwdW1jY3V2dWNrcXJvemh5Z2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzMTM0MzUsImV4cCI6MjA1ODg4OTQzNX0.piRot1i-3iYFrrBnPZVYeJTi60GUS_HrkKxUWSJRvw0';

  // Make sure Supabase URL doesn't have any trailing slashes
  const cleanSupabaseUrl = SUPABASE_URL.replace(/\/$/, '');

  console.log('Config - Supabase URL:', cleanSupabaseUrl);
  console.log('Config - Supabase Key (first 10 chars):', SUPABASE_ANON_KEY.substring(0, 10) + '...');

  return {
    ...config,
    extra: {
      ...config.extra,
      supabaseUrl: cleanSupabaseUrl,
      supabaseAnonKey: SUPABASE_ANON_KEY,
    },
  };
}; 