import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        lock: {
          acquireLock: async <R>(
            name: string,
            acquireTimeout: number,
            fn: () => Promise<R>
          ): Promise<R> => {
            // Simple fallback when Navigator LockManager is not available or broken
            return await fn()
          },
        },
        storageKey: 'vantake-auth-token',
        flowType: 'pkce',
      },
    }
  )
}
