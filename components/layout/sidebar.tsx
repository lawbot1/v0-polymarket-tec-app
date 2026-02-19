'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
} from 'lucide-react'
import { useState, useCallback } from 'react'
import type { LucideIcon } from 'lucide-react'

// Prefetch API data for faster page loads
const prefetchCache = new Set<string>()

async function prefetchData(href: string) {
  if (prefetchCache.has(href)) return
  prefetchCache.add(href)
  
  try {
    switch (href) {
      case '/':
        fetch('/api/polymarket/leaderboard?timeframe=week&sortBy=pnl&limit=50')
        break
      case '/markets':
        fetch('/api/polymarket/events?limit=20&active=true')
        break
      case '/insider-signals':
        fetch('/api/polymarket/leaderboard?timeframe=day&sortBy=pnl&limit=30')
        break
      case '/wallet-tracker':
        // No prefetch needed - user-specific
        break
    }
  } catch (e) {
    // Silent fail for prefetch
  }
}

type NavItem = {
  href: string
  label: string
  icon?: LucideIcon
  customIcon?: string
}

const navItems: NavItem[] = [
  { href: '/', label: 'Leaderboard', customIcon: '/icon-leaderboard-new.png' },
  { href: '/wallet-tracker', label: 'Wallet Tracker', customIcon: '/icon-wallet.png' },
  { href: '/insider-signals', label: 'Insider Signals', customIcon: '/icon-signals-new.png' },
  { href: '/markets', label: 'Markets', customIcon: '/icon-markets.png' },
  { href: '/dashboard', label: 'My Dashboard', customIcon: '/icon-dashboard.png' },
  { href: '/settings', label: 'Settings', customIcon: '/icon-settings.png' },
]

interface SidebarProps {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  const handleMouseEnter = useCallback((href: string) => {
    // Prefetch both the page and API data
    router.prefetch(href)
    prefetchData(href)
  }, [router])

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-200',
        collapsed ? 'w-16' : 'w-64',
        'max-lg:w-[280px] max-lg:max-w-[80vw]'
      )}
    >
      {/* Logo with mobile close button */}
      <div className="flex h-16 items-center justify-between border-b border-border px-2 overflow-hidden pt-2">
        <Link href="/" onClick={onNavigate} className="flex items-center justify-center flex-1 overflow-hidden translate-y-[10%]">
          <Image
            src="/vantake-logo-full.png"
            alt="Vantake"
            width={320}
            height={80}
            className={cn(
              'object-cover brightness-0 invert scale-[0.92]',
              collapsed ? 'h-10 w-10 scale-100 object-contain' : 'h-20 w-full'
            )}
            priority
          />
        </Link>
        {/* Mobile close button */}
        <button
          onClick={onNavigate}
          className="lg:hidden flex items-center justify-center h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              onMouseEnter={() => handleMouseEnter(item.href)}
              className={cn(
                'relative flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
              )}
            >
              {/* Active indicator - angular marker */}
              {isActive && (
                <div className="absolute left-0 top-0 h-full w-[3px] bg-primary" 
                     style={{ clipPath: 'polygon(0 0, 100% 4px, 100% calc(100% - 4px), 0 100%)' }} />
              )}
              {item.customIcon ? (
                <div className="h-12 w-12 flex-shrink-0 relative">
                  <Image
                    src={item.customIcon || "/placeholder.svg"}
                    alt={item.label}
                    width={48}
                    height={48}
                    className="h-12 w-12 object-contain"
                    style={{ 
                      filter: 'invert(1)',
                      mixBlendMode: 'screen'
                    }}
                  />
                </div>
              ) : Icon ? (
                <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-foreground')} />
              ) : null}
              {!collapsed && <span className="tracking-wide">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Angular separator */}
      <div className="sharp-separator mx-4" />

      {/* Polymarket Link */}
      <div className="py-2">
        <a
          href="https://polymarket.com"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-150',
            'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
          )}
        >
          <ExternalLink className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="tracking-wide">Polymarket</span>}
        </a>
      </div>

      {/* Collapse Button */}
      <div className="hidden lg:block border-t border-border p-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center bg-secondary p-2 text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors duration-150"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="ml-2 text-xs uppercase tracking-wider">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
