'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Bell, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthButton } from '@/components/auth/auth-button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title?: string
  subtitle?: string
}

const mainNavItems = [
  { href: '/', label: 'Leaderboard', icon: '/icon-leaderboard-new.png', description: 'Top traders ranking' },
  { href: '/wallet-tracker', label: 'Wallet Tracker', icon: '/icon-wallet.png', description: 'Track any wallet' },
  { href: '/insider-signals', label: 'Insider Signals', icon: '/icon-signals-new.png', description: 'Smart money moves' },
  { href: '/markets', label: 'Markets', icon: '/icon-markets.png', description: 'Browse all markets' },
]

const userNavItems = [
  { href: '/dashboard', label: 'My Dashboard', icon: '/icon-dashboard.png', description: 'Your portfolio' },
  { href: '/settings', label: 'Settings', icon: '/icon-settings.png', description: 'Account settings' },
]

export function Header({ title, subtitle }: HeaderProps) {
  const pathname = usePathname()
  
  const allItems = [...mainNavItems, ...userNavItems]
  const currentPage = allItems.find(item => item.href === pathname) || mainNavItems[0]

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <div className="flex h-14 items-center justify-between px-4 lg:px-6">
        {/* Left Side - Logo + Navigation Dropdown */}
        <div className="flex items-center gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0">
            <Image
              src="/vantake-main-logo.png"
              alt="Vantake"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
              priority
            />
          </Link>

          {/* Navigation Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-all group">
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                <span>{currentPage.label}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="start" 
              sideOffset={8}
              className="w-64 bg-card/95 backdrop-blur-sm border-border p-2"
            >
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1.5">
                Discover
              </DropdownMenuLabel>
              {mainNavItems.map((item) => (
                <DropdownMenuItem key={item.href} asChild className="p-0 focus:bg-transparent">
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 w-full px-3 py-2.5 transition-all cursor-pointer group/item',
                      pathname === item.href
                        ? 'bg-foreground text-background'
                        : 'text-foreground hover:bg-secondary'
                    )}
                  >
                    <div className={cn(
                      'flex items-center justify-center w-8 h-8 flex-shrink-0',
                      pathname === item.href ? 'bg-background/20' : 'bg-secondary'
                    )}>
                      <img
                        src={item.icon || "/placeholder.svg"}
                        alt=""
                        className="h-4 w-4 object-contain"
                        style={{ 
                          filter: pathname === item.href ? 'invert(0)' : 'invert(1)'
                        }}
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className={cn(
                        'text-[11px]',
                        pathname === item.href ? 'text-background/70' : 'text-muted-foreground'
                      )}>
                        {item.description}
                      </span>
                    </div>
                  </Link>
                </DropdownMenuItem>
              ))}
              
              <DropdownMenuSeparator className="my-2 bg-border" />
              
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1.5">
                Personal
              </DropdownMenuLabel>
              {userNavItems.map((item) => (
                <DropdownMenuItem key={item.href} asChild className="p-0 focus:bg-transparent">
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 w-full px-3 py-2.5 transition-all cursor-pointer',
                      pathname === item.href
                        ? 'bg-foreground text-background'
                        : 'text-foreground hover:bg-secondary'
                    )}
                  >
                    <div className={cn(
                      'flex items-center justify-center w-8 h-8 flex-shrink-0',
                      pathname === item.href ? 'bg-background/20' : 'bg-secondary'
                    )}>
                      <img
                        src={item.icon || "/placeholder.svg"}
                        alt=""
                        className="h-4 w-4 object-contain"
                        style={{ 
                          filter: pathname === item.href ? 'invert(0)' : 'invert(1)'
                        }}
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className={cn(
                        'text-[11px]',
                        pathname === item.href ? 'text-background/70' : 'text-muted-foreground'
                      )}>
                        {item.description}
                      </span>
                    </div>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="relative h-9 w-9 hidden sm:flex">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 bg-foreground" />
          </Button>

          <AuthButton />
        </div>
      </div>
    </header>
  )
}
