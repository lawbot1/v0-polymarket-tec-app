'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePrivy } from '@privy-io/react-auth'

interface AuthUser {
  id: string
  privyId: string
  email?: string
  walletAddress?: string
  displayName?: string
}

const FALLBACK = {
  ready: true,
  authenticated: false,
  user: null,
  login: () => { console.warn('[Auth] Privy not available') },
  logout: async () => {},
}

// Safe wrapper around usePrivy that won't crash if provider context is missing
function usePrivySafe() {
  try {
    const privy = usePrivy()
    return privy
  } catch {
    // Privy context not available (e.g., error boundary caught iframe failure)
    return FALLBACK
  }
}

export function useAuth() {
  const { ready, authenticated, user, login, logout } = usePrivySafe()
  const [dbUser, setDbUser] = useState<AuthUser | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [synced, setSynced] = useState(false)

  // Sync Privy user to Supabase profiles table
  useEffect(() => {
    if (!ready || !authenticated || !user || synced) return

    const syncUser = async () => {
      setSyncing(true)
      try {
        const res = await fetch('/api/auth/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            privyId: user.id,
            email: user.email?.address || user.google?.email,
            walletAddress: user.wallet?.address,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          setDbUser({
            id: data.userId,
            privyId: user.id,
            email: user.email?.address || user.google?.email,
            walletAddress: user.wallet?.address,
            displayName: data.displayName,
          })
        }
      } catch (e) {
        console.error('[useAuth] sync failed:', e)
      } finally {
        setSyncing(false)
        setSynced(true)
      }
    }

    syncUser()
  }, [ready, authenticated, user, synced])

  // Reset on logout
  useEffect(() => {
    if (ready && !authenticated) {
      setDbUser(null)
      setSynced(false)
    }
  }, [ready, authenticated])

  const handleLogin = useCallback(() => {
    login()
  }, [login])

  const handleLogout = useCallback(async () => {
    await logout()
    setDbUser(null)
    setSynced(false)
  }, [logout])

  return {
    ready,
    authenticated,
    user: dbUser,
    userId: dbUser?.id ?? null,
    loading: !ready || syncing,
    login: handleLogin,
    logout: handleLogout,
  }
}
