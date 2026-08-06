import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/lib/supabase-config';

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  const { url, publicKey } = getSupabaseConfig();

  if (!supabase) {
    supabase = createClient(url, publicKey);
  }

  return supabase;
}
