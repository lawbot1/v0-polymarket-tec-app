'use client'

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Wallet, TrendingUp, Trophy, Target, Zap, RefreshCw, Star } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import {
  type LeaderboardTrader,
  type UserPosition,
  type UserTrade,
  formatPnl,
  formatVolume,
  normalizeTimestamp,
} from '@/lib/polymarket-api'

function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  badge,
  isLoading,
}: {
  label: string
  value: string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  badge?: React.ReactNode
  isLoading?: boolean
}) {
  return (
    <div className="sharp-panel p-4">
      <div className="flex items-start justify-between">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center',
            trend === 'up' && 'bg-[#22c55e]/20 text-[#22c55e]',
            trend === 'down' && 'bg-red-500/20 text-red-500',
            !trend && 'bg-secondary text-muted-foreground'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        {badge}
      </div>
      {isLoading ? (
        <Skeleton className="mt-3 h-8 w-24" />
      ) : (
        <div
          className={cn(
            'mt-3 text-2xl font-bold',
            trend === 'up' && 'text-[#22c55e]',
            trend === 'down' && 'text-red-500',
            !trend && 'text-foreground'
          )}
        >
          {value}
        </div>
      )}
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

export default function MyDashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<{ id: string } | null>(null)
  const [walletAddress, setWalletAddress] = useState('')
  const [inputAddress, setInputAddress] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [profile, setProfile] = useState<LeaderboardTrader | null>(null)
  const [positions, setPositions] = useState<UserPosition[]>([])
  const [trades, setTrades] = useState<UserTrade[]>([])
  const [followedCount, setFollowedCount] = useState(0)
  const [trackedCount, setTrackedCount] = useState(0)

  // Load user and their saved wallet
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)

      // Load profile from Supabase
      const { data: profileData } = await supabase
        .from('profiles')
        .select('polymarket_wallet')
        .eq('id', user.id)
        .single()

      // Load counts
      const { count: fCount } = await supabase
        .from('followed_traders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      const { count: tCount } = await supabase
        .from('tracked_wallets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      setFollowedCount(fCount || 0)
      setTrackedCount(tCount || 0)

      if (profileData?.polymarket_wallet) {
        setWalletAddress(profileData.polymarket_wallet)
        setInputAddress(profileData.polymarket_wallet)
        fetchUserData(profileData.polymarket_wallet)
      } else {
        setIsLoading(false)
      }
    }
    loadUser()
  }, [])

  const fetchUserData = useCallback(async (address: string) => {
    setIsLoading(true)
    try {
      const [profileRes, positionsRes, tradesRes] = await Promise.all([
        fetch(`/api/polymarket/leaderboard?user=${address}&limit=1`),
        fetch(`/api/polymarket/positions?user=${address}&limit=100&sortBy=CASHPNL&sortDirection=DESC`),
        fetch(`/api/polymarket/trades?user=${address}&limit=100`),
      ])

      if (profileRes.ok) {
        const data = await profileRes.json()
        setProfile(data[0] || null)
      }
      if (positionsRes.ok) {
        const data = await positionsRes.json()
        setPositions(data)
      }
      if (tradesRes.ok) {
        const data = await tradesRes.json()
        setTrades(data)
      }
    } catch (err) {
      console.error('Error fetching user data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleConnect = async () => {
    if (!inputAddress || !user) return
    setIsSaving(true)

    // Save wallet to Supabase profile
    await supabase
      .from('profiles')
      .update({ polymarket_wallet: inputAddress, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    setWalletAddress(inputAddress)
    fetchUserData(inputAddress)
    setIsSaving(false)
  }

  const handleDisconnect = async () => {
    if (!user) return
    await supabase
      .from('profiles')
      .update({ polymarket_wallet: null, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    setWalletAddress('')
    setProfile(null)
    setPositions([])
    setTrades([])
  }

  // Calculate stats
  const totalPnl = profile?.pnl || 0
  const totalVolume = profile?.vol || 0
  const positionCount = positions.length
  const tradeCount = trades.length
  const rank = profile?.rank || 0
  const winningPositions = positions.filter(p => (p.cashPnl || 0) > 0).length
  const winRate = positionCount > 0 ? (winningPositions / positionCount) * 100 : 0

  const monthlyPerformance = React.useMemo(() => {
    const months: Record<string, number> = {}
    trades.forEach(trade => {
      const date = new Date(normalizeTimestamp(trade.timestamp))
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!months[monthKey]) months[monthKey] = 0
      const impact = trade.side === 'BUY' ? -trade.size * trade.price : trade.size * trade.price
      months[monthKey] += impact
    })
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, pnl]) => ({
        month: new Date(key + '-01').toLocaleDateString('en-US', { month: 'short' }),
        pnl: pnl * 100,
      }))
  }, [trades])

  const categoryStrength = React.useMemo(() => {
    const categories: Record<string, { trades: number; pnl: number }> = {}
    positions.forEach(pos => {
      const title = pos.title?.toLowerCase() || ''
      let cat = 'Other'
      if (title.includes('btc') || title.includes('eth') || title.includes('crypto') || title.includes('bitcoin')) cat = 'Crypto'
      else if (title.includes('trump') || title.includes('biden') || title.includes('election') || title.includes('president')) cat = 'Politics'
      else if (title.includes('nfl') || title.includes('nba') || title.includes('sport')) cat = 'Sports'
      else if (title.includes('stock') || title.includes('fed') || title.includes('rate')) cat = 'Finance'
      if (!categories[cat]) categories[cat] = { trades: 0, pnl: 0 }
      categories[cat].trades++
      categories[cat].pnl += pos.cashPnl || 0
    })
    return Object.entries(categories)
      .map(([category, data]) => ({
        category,
        trades: data.trades,
        strength: Math.min(100, Math.max(0, 50 + (data.pnl / 100))),
      }))
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 5)
  }, [positions])

  // Not connected wallet state
  if (!walletAddress) {
    return (
      <AppShell title="My Dashboard">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="sharp-panel p-12 text-center max-w-md">
            <div className="mx-auto flex h-24 w-24 items-center justify-center">
              <Wallet className="h-16 w-16 text-muted-foreground" />
            </div>
            <h2 className="mt-6 text-xl font-bold text-foreground">Link Your Polymarket Wallet</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Enter your Polymarket wallet address to see your personal trading stats, performance, and ranking.
              Your wallet will be saved to your account.
            </p>
            <div className="mt-6 space-y-3">
              <input
                type="text"
                placeholder="0x..."
                value={inputAddress}
                onChange={(e) => setInputAddress(e.target.value)}
                className="w-full border border-border bg-secondary px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
              />
              <Button onClick={handleConnect} className="w-full" size="lg" disabled={!inputAddress || isSaving}>
                {isSaving ? 'Saving...' : 'Link Wallet & View Dashboard'}
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              We only read your public trading data from Polymarket.
            </p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="My Dashboard">
      <div className="space-y-6">
        {/* Connected Status */}
        <div className="sharp-panel p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center bg-[#22c55e]/20 text-[#22c55e]">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium text-foreground">
                  {profile?.userName || 'Wallet Connected'}
                </div>
                <div className="text-sm text-muted-foreground font-mono">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-4 mr-4 text-sm text-muted-foreground">
                <span><Star className="inline h-3.5 w-3.5 mr-1" />{followedCount} followed</span>
                <span><Wallet className="inline h-3.5 w-3.5 mr-1" />{trackedCount} tracked</span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchUserData(walletAddress)}
                disabled={isLoading}
                className="bg-secondary border-border"
              >
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
              <Button
                variant="outline"
                onClick={handleDisconnect}
                className="border-border bg-secondary"
              >
                Disconnect
              </Button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Total PnL" value={formatPnl(totalPnl)} icon={TrendingUp} trend={totalPnl >= 0 ? 'up' : 'down'} isLoading={isLoading} />
          <KpiCard label="Volume" value={formatVolume(totalVolume)} icon={Target} isLoading={isLoading} />
          <KpiCard label="Win Rate" value={`${winRate.toFixed(0)}%`} icon={Trophy} trend={winRate >= 50 ? 'up' : 'down'} isLoading={isLoading} />
          <KpiCard label="Positions" value={positionCount.toString()} icon={Zap} isLoading={isLoading} />
          <KpiCard label="Rank" value={rank > 0 ? `#${rank}` : '-'} icon={Trophy} isLoading={isLoading} />
          <KpiCard label="Trades" value={tradeCount.toString()} icon={Target} isLoading={isLoading} />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Monthly Performance */}
          <div className="sharp-panel p-4">
            <h3 className="mb-4 text-sm font-medium text-foreground">Trading Activity</h3>
            <div className="h-64">
              {isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : monthlyPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0' }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Activity']}
                    />
                    <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                      {monthlyPerformance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">No trading activity found</div>
              )}
            </div>
          </div>

          {/* Category Strength */}
          <div className="sharp-panel p-4">
            <h3 className="mb-4 text-sm font-medium text-foreground">Strength by Category</h3>
            <div className="space-y-4">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
              ) : categoryStrength.length > 0 ? (
                categoryStrength.map((cat) => (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-foreground">{cat.category}</span>
                      <span className="text-sm text-muted-foreground">{cat.trades} positions</span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden bg-secondary">
                      <div
                        className="absolute left-0 top-0 h-full transition-all"
                        style={{ width: `${cat.strength}%`, backgroundColor: cat.strength >= 70 ? '#22c55e' : cat.strength >= 50 ? '#eab308' : '#6b7280' }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-48 items-center justify-center text-muted-foreground">No positions found</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
