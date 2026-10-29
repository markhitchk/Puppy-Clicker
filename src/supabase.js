import { createClient } from "@supabase/supabase-js";
import {puppyService} from './supabaseConfig.js';
// These are browser-safe *publishable* credentials, never service-role secrets.
const {url,key}=puppyService;
export const client =
  url && key
    ? createClient(url, key, {
        auth: {
          flowType: "pkce",
          persistSession: true,
          autoRefreshToken: true,
          // Discord returns a provider code handled by puppyOAuth, not an Auth PKCE code.
          detectSessionInUrl: false,
        },
      })
    : null;
