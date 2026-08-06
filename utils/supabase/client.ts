import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseConfig } from '@/lib/supabase-config';

export const createClient = () => {
  const { url, publicKey } = getSupabaseConfig();

  return createBrowserClient(url, publicKey);
};
