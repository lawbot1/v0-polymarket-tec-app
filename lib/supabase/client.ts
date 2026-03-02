import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Disable lock to fix mobile browser compatibility issues
        // Some mobile browsers don't fully support Navigator.locks API
        lock: (() => {}) as unknown as undefined,
        // Use localStorage for better mobile compatibility
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  )
}
