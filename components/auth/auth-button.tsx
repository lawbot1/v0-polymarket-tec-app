'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogIn, User, Settings, LogOut, LayoutDashboard, Wallet } from 'lucide-react'

export function AuthButton() {
  const router = useRouter()
  const { ready, authenticated, user, loading, login, logout } = useAuth()

  if (!ready || loading) {
    return <div className="h-9 w-20 bg-secondary/30 animate-pulse rounded-lg" />
  }

  if (!authenticated || !user) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2 bg-transparent rounded-lg"
        onClick={login}
      >
        <LogIn className="h-4 w-4" />
        Sign In
      </Button>
    )
  }

  const displayName = user.displayName || user.email?.split('@')[0] || user.walletAddress?.slice(0, 8) || 'User'
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-2 py-1 hover:bg-secondary/50 transition-colors rounded-lg">
          <div className="h-8 w-8 bg-foreground text-background flex items-center justify-center text-xs font-bold rounded-lg">
            {initials}
          </div>
          <span className="text-sm font-medium text-foreground hidden sm:inline">{displayName}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 bg-card border-border">
        {user.walletAddress && (
          <>
            <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-1.5">
              <Wallet className="h-3 w-3" />
              {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={() => router.push('/dashboard')} className="cursor-pointer gap-2">
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="cursor-pointer gap-2 text-red-400">
          <LogOut className="h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
