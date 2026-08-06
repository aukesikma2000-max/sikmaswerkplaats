type SupabaseConfig = {
  url: string;
  publicKey: string;
};

export function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const publicKey = publishableKey || anonKey;

  if (!url || !publicKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and a Supabase public key (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY) must be set',
    );
  }

  return { url, publicKey };
}
