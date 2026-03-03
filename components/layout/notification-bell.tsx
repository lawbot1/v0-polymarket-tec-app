'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, ArrowUpRight, ArrowDownRight, Check, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  trader_name: string | null
  trader_address: string | null
  trade_data: {
    market?: string
    outcome?: string
    side?: string
    size?: number
    price?: number
    value?: number
    slug?: string
  } | null
  read: boolean
  created_at: string
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=15')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch {
      // silently fail
    }
  }, [])

  // Fetch on mount and poll every 30s
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAllRead = async () => {
    setLoading(true)
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch {
      // silently fail
    }
    setLoading(false)
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const formatValue = (val: number) => {
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`
    return `$${val.toFixed(0)}`
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[380px] rounded-lg border border-border bg-card shadow-xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-medium text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={loading}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Check className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Trade alerts from tracked wallets will appear here
                </p>
              </div>
            ) : (
              notifications.map((notification) => {
                const trade = notification.trade_data
                const isBuy = trade?.side === 'BUY'
                const traderDisplay = notification.trader_name ||
                  (notification.trader_address
                    ? `${notification.trader_address.slice(0, 6)}...${notification.trader_address.slice(-4)}`
                    : 'Unknown')

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      'flex gap-3 px-4 py-3 border-b border-border/50 transition-colors hover:bg-secondary/30',
                      !notification.read && 'bg-secondary/20'
                    )}
                  >
                    {/* Icon */}
                    <div className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-0.5',
                      isBuy ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                    )}>
                      {isBuy ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-foreground truncate">
                          {traderDisplay}
                          <span className={cn(
                            'ml-1.5 text-[10px] font-semibold uppercase',
                            isBuy ? 'text-success' : 'text-destructive'
                          )}>
                            {trade?.side || 'TRADE'}
                          </span>
                        </p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatTime(notification.created_at)}
                        </span>
                      </div>

                      {trade?.market && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {trade.market}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-1">
                        {trade?.outcome && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {trade.outcome} @ {((trade.price || 0) * 100).toFixed(0)}c
                          </span>
                        )}
                        {trade?.value && (
                          <span className="text-[10px] font-mono font-medium text-foreground">
                            {formatValue(trade.value)}
                          </span>
                        )}
                        {trade?.slug && (
                          <Link
                            href={`/markets/${trade.slug}`}
                            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                            onClick={() => setIsOpen(false)}
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                          </Link>
                        )}
                      </div>

                      {/* Unread indicator */}
                      {!notification.read && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-foreground" />
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border px-4 py-2.5">
              <Link
                href="/settings"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Notification settings
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
