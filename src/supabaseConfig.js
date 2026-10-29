// The OAuth exchange and the installed Auth session must use the same project.
export function puppyServiceConfig(env={}){
 return {
  url:(env.VITE_SUPABASE_URL||'https://damcmyqusdxucwozkoeh.supabase.co').replace(/\/$/,''),
  key:env.VITE_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_id7zKwH7BPmmohc7T3RZmA_DTjMaFVU'
 };
}
export const puppyService=puppyServiceConfig(import.meta.env||{});
