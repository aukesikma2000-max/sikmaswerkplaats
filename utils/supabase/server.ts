import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseConfig } from '@/lib/supabase-config';

export const createClient = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  const { url, publicKey } = getSupabaseConfig();

  return createServerClient(url, publicKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // This can occur in Server Components; middleware refresh handles it.
        }
      },
    },
  });
};
