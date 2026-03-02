import { createBrowserClient, type SupabaseClient } from '@supabase/ssr'

// Singleton client instance to ensure consistent auth state across components
let browserClient: SupabaseClient | null = null

export function createClient() {
  if (browserClient) {
    return browserClient
  }
  
  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Disable navigator.locks to fix browser compatibility issues
        // This prevents "Navigator LockManager returned a null lock" errors
        storageKey: 'sb-auth-token',
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          'X-Client-Info': 'vantake-web',
        },
      },
    }
  )
  
  return browserClient
}
