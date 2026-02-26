'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthButton } from '@/components/auth/auth-button'
import { NotificationBell } from '@/components/layout/notification-bell'
import { cn } from '@/lib/utils'
import { useState } from 'react'

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
  { href: '/copytrading', label: 'Copytrading', comingSoon: true },
  { href: '/settings', label: 'Settings' },
]

export function Header({ title, subtitle }: HeaderProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <div className="flex h-14 items-center justify-between px-3 sm:px-4 lg:px-6">
        {/* Left Side - Logo + Nav buttons inline */}
        <div className="flex items-center gap-1">
          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0 mr-2 lg:mr-4">
            <Image
              src="/vantake-main-logo.png"
              alt="Vantake"
              width={58}
              height={58}
              className="h-10 w-10 sm:h-[58px] sm:w-[58px] object-contain"
              priority
            />
          </Link>

          {/* Desktop Nav - inline buttons */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {navItems.map((item) => (
              item.comingSoon ? (
                <div
                  key={item.href}
                  className="relative px-4 py-2 text-sm font-medium rounded-lg text-muted-foreground/50 cursor-not-allowed whitespace-nowrap"
                >
                  {item.label}
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-score/20 text-score border border-score/30 rounded">
                    Soon
                  </span>
                </div>
              ) : (
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
              )
            ))}
          </nav>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex">
            <NotificationBell />
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
            item.comingSoon ? (
              <div
                key={item.href}
                className="relative px-3 py-2.5 text-sm font-medium rounded-lg text-muted-foreground/50 cursor-not-allowed flex items-center justify-between"
              >
                {item.label}
                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-score/20 text-score border border-score/30 rounded">
                  Soon
                </span>
              </div>
            ) : (
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
            )
          ))}
        </nav>
      )}
    </header>
  )
}
