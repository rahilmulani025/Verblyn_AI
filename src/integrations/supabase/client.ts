// Supabase Client with resilient runtime fallback and environment validation
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Authoritative project defaults from project configuration
const DEFAULT_SUPABASE_URL = 'https://omazwpvkdqtsiakeulru.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_O6Qp_VU1ioECtOXRR-Z8GQ_OCyLV_o3';

// Safe environment resolution for Vite and test runners
const env = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env
  : ((typeof process !== 'undefined' && process.env) as Record<string, string | undefined>) || {};

export const SUPABASE_URL = env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const SUPABASE_PUBLISHABLE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;

if (process.env.NODE_ENV === 'development' && (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY)) {
  console.info('[Supabase Client] Using project fallback credentials for connection to:', SUPABASE_URL);
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof localStorage !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});