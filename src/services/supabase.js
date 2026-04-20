import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../config/supabaseConfig';

const supabaseUrl = SUPABASE_CONFIG.url.trim() || import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = SUPABASE_CONFIG.anonKey.trim() || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
