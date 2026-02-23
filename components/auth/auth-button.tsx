'use client'

import { useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogIn, Settings, LogOut, LayoutDashboard } from 'lucide-react'

export function AuthButton() {
  const router = useRouter()
  const { ready, authenticated, user, login, logout } = usePrivy()

  if (!ready) {
    return <div className="h-9 w-20 bg-secondary/30 animate-pulse" />
  }

  if (!authenticated) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2 bg-transparent"
        onClick={login}
      >
        <LogIn className="h-4 w-4" />
        Sign In
      </Button>
    )
  }

  const displayName =
    user?.email?.address?.split('@')[0] ||
    user?.wallet?.address?.slice(0, 6) ||
    'User'
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
        <DropdownMenuItem
          onClick={async () => {
            await logout()
            router.push('/')
            router.refresh()
          }}
          className="cursor-pointer gap-2 text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
