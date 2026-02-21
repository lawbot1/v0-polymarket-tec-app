'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogIn, User, Settings, LogOut, LayoutDashboard } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export function AuthButton() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (mounted) {
          setUser(session?.user ?? null)
          setLoading(false)
        }
      } catch {
        if (mounted) setLoading(false)
      }
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return <div className="h-9 w-20 bg-secondary/30 animate-pulse" />
  }

  if (!user) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2 bg-transparent"
        onClick={() => router.push('/auth/login')}
      >
        <LogIn className="h-4 w-4" />
        Sign In
      </Button>
    )
  }

  const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User'
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-2 py-1 hover:bg-secondary/50 transition-colors">
          <div className="h-8 w-8 bg-foreground text-background flex items-center justify-center text-xs font-bold">
            {initials}
          </div>
          <span className="text-sm font-medium text-foreground hidden sm:inline">{displayName}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-card border-border">
        <DropdownMenuItem onClick={() => router.push('/dashboard')} className="cursor-pointer gap-2">
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer gap-2 text-red-400">
          <LogOut className="h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
