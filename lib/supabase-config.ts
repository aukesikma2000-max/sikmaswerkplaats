type SupabaseConfig = {
  url: string;
  publicKey: string;
};

type SupabaseConfigInput = {
  url?: string;
  publishableKey?: string;
  anonKey?: string;
};

function resolveSupabaseConfig(input?: SupabaseConfigInput): SupabaseConfig | null {
  const url = input?.url ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = input?.publishableKey ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const anonKey = input?.anonKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const publicKey = publishableKey || anonKey;

  if (!url || !publicKey) {
    return null;
  }

  return { url, publicKey };
}

export function hasSupabaseConfig(input?: SupabaseConfigInput): boolean {
  return Boolean(resolveSupabaseConfig(input));
}

export function getSupabaseConfig(): SupabaseConfig {
  const config = resolveSupabaseConfig();

  if (!config) {
    throw new Error(
      'Supabase configuratie ontbreekt. Zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (of NEXT_PUBLIC_SUPABASE_ANON_KEY) in je omgeving en herstart/deploy opnieuw.',
    );
  }

  return config;
}
