import {createClient} from '@supabase/supabase-js';
// These are browser-safe *publishable* credentials, never service-role secrets.
const url=import.meta.env.VITE_SUPABASE_URL || 'https://damcmyqusdxucwozkoeh.supabase.co';
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_id7zKwH7BPmmohc7T3RZmA_DTjMaFVU';
export const client=url&&key?createClient(url,key,{
  auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
}):null;
