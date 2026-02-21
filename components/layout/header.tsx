'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Bell, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthButton } from '@/components/auth/auth-button'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface HeaderProps {
  title?: string
  subtitle?: string
}

const navItems = [
  { href: '/', label: 'Leaderboard' },
  { href: '/wallet-tracker', label: 'Wallet Tracker' },
  { href: '/insider-signals', label: 'Signals' },
  { href: '/markets', label: 'Markets' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/settings', label: 'Settings' },
]

export function Header({ title, subtitle }: HeaderProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

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
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
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
          <Button variant="ghost" size="icon" className="relative h-9 w-9 hidden sm:flex">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-foreground" />
          </Button>

          <AuthButton />

          {/* Mobile burger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex items-center justify-center h-9 w-9 text-muted-foreground hover:text-foreground transition-colors"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-border bg-background px-4 py-2 flex flex-col gap-1">
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
