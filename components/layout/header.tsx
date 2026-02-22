'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Bell, Menu, X, Wallet, Eye, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthButton } from '@/components/auth/auth-button'
import { cn } from '@/lib/utils'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface HeaderProps {
  title?: string
  subtitle?: string
}

const navItems = [
  { href: '/', label: 'Leaderboard' },
  { href: '/top-100', label: 'Vantake Top 100' },
  { href: '/wallet-tracker', label: 'Wallet Tracker' },
  { href: '/insider-signals', label: 'Signals' },
  { href: '/markets', label: 'Markets' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/copytrading', label: 'Copytrading' },
  { href: '/settings', label: 'Settings' },
]

interface WalletActivity {
  wallet_address: string
  wallet_name?: string
  action: string
  market: string
  amount: string
  time: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [trackedCount, setTrackedCount] = useState(0)
  const [activities, setActivities] = useState<WalletActivity[]>([])
  const [loadingNotifs, setLoadingNotifs] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  // Close notification panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    if (notifOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [notifOpen])

  // Load tracked wallets count when notif opens
  useEffect(() => {
    if (!notifOpen) return
    const loadTracked = async () => {
      setLoadingNotifs(true)
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          setTrackedCount(0)
          setActivities([])
          setLoadingNotifs(false)
          return
        }
        const { data: tracked } = await supabase
          .from('tracked_wallets')
          .select('wallet_address, wallet_name')
          .eq('user_id', session.user.id)
        
        setTrackedCount(tracked?.length ?? 0)
        // For now, no live activity feed -- show empty state
        setActivities([])
      } catch {
        setTrackedCount(0)
        setActivities([])
      } finally {
        setLoadingNotifs(false)
      }
    }
    loadTracked()
  }, [notifOpen])

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <div className="flex h-14 items-center justify-between px-4 lg:px-6">
        {/* Left Side - Logo + Nav buttons inline */}
        <div className="flex items-center gap-1">
          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0 mr-4">
            <Image
              src="/vantake-main-logo.png"
              alt="Vantake"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
              priority
            />
          </Link>

          {/* Desktop Nav - inline buttons */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap',
                  pathname === item.href
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 hidden sm:flex"
              onClick={() => setNotifOpen(!notifOpen)}
            >
              <Bell className="h-4 w-4 text-muted-foreground" />
            </Button>

            {/* Notification Panel */}
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">Wallet Activity</h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    <span>{trackedCount} tracked</span>
                  </div>
                </div>

                {/* Content */}
                <div className="max-h-80 overflow-y-auto">
                  {loadingNotifs ? (
                    <div className="px-4 py-8 text-center">
                      <div className="h-5 w-5 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-xs text-muted-foreground">Loading...</p>
                    </div>
                  ) : activities.length > 0 ? (
                    <div className="divide-y divide-border">
                      {activities.map((act, i) => (
                        <div key={i} className="px-4 py-3 hover:bg-secondary/30 transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-foreground">{act.wallet_name || act.wallet_address.slice(0, 8) + '...'}</span>
                            <span className="text-[10px] text-muted-foreground">{act.time}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              'text-xs font-medium px-1.5 py-0.5 rounded',
                              act.action === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                            )}>
                              {act.action}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">{act.market}</span>
                            <span className="text-xs font-mono text-foreground ml-auto">{act.amount}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-10 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center bg-secondary/50 rounded-xl mb-4">
                        <Wallet className="h-5 w-5 text-muted-foreground/50" />
                      </div>
                      {trackedCount === 0 ? (
                        <>
                          <p className="text-sm font-medium text-foreground mb-1">No wallets tracked yet</p>
                          <p className="text-xs text-muted-foreground mb-4 max-w-[240px] mx-auto">
                            Start tracking top traders to see their latest bets and activity right here
                          </p>
                          <Link
                            href="/"
                            onClick={() => setNotifOpen(false)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground bg-secondary hover:bg-secondary/80 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Browse Leaderboard
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-foreground mb-1">All quiet for now</p>
                          <p className="text-xs text-muted-foreground max-w-[240px] mx-auto">
                            Your tracked wallets haven't made any new moves recently. We'll notify you as soon as there's activity.
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                {trackedCount > 0 && (
                  <div className="border-t border-border px-4 py-2.5">
                    <Link
                      href="/wallet-tracker"
                      onClick={() => setNotifOpen(false)}
                      className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Manage tracked wallets
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          <AuthButton />

          {/* Mobile burger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden flex items-center justify-center h-9 w-9 text-muted-foreground hover:text-foreground transition-colors"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <nav className="lg:hidden border-t border-border bg-background px-4 py-2 flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
                pathname === item.href
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
