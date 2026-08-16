import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://spjjpppowxbpffsmfkir.supabase.co';
const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwampwcHBvd3hicGZmc21ma2lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3NTAzOTQsImV4cCI6MjEwMTMyNjM5NH0.UWmeUunnzAQQInNDDGz1qF5bg9aJCURz0F0NaQChOYs';

const isRealKey = (key?: string) => Boolean(key && key.length > 20 && !key.includes('your_'));
const activeKey = isRealKey(rawServiceKey) ? rawServiceKey! : supabaseAnonKey;

// Admin client
export const supabaseAdmin = createClient(supabaseUrl, activeKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Client factory — creates a client scoped to a specific user's JWT
export function supabaseForUser(userJwt: string) {
  // If fallback token, use admin client
  if (userJwt.startsWith('dev_token_')) {
    return supabaseAdmin;
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${userJwt}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Verify a Supabase JWT and return the user
export async function verifyUserJwt(jwt: string) {
  if (jwt.startsWith('dev_token_')) {
    const parts = jwt.split('_');
    const email = decodeURIComponent(parts[2] || 'user@example.com');
    return { id: '00000000-0000-0000-0000-000000000001', email };
  }
  const client = supabaseForUser(jwt);
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Error('Invalid or expired token');
  return user;
}
