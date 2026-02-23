'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  type LeaderboardTrader,
  formatVolume,
  formatPnl,
  formatAddress,
  mapCategoryToApi,
  mapTimeframeToApi,
} from '@/lib/polymarket-api'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, ChevronDown, Grid3X3, List, Star, TrendingUp, Clock, Users, Zap, Shield, Target, Flame, Crown, Gem, Activity } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import Image from 'next/image'
import { FollowButton } from '@/components/trader/follow-button'
import { SmartScoreBadge } from '@/components/trader/smart-score-badge'
import { getTraderCategories, CategoriesRow } from '@/components/trader/category-badges'

const leaderboardFetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch leaderboard')
  return res.json()
}

type UITimeframe = '24H' | '7D' | '30D' | 'All'
type UICategory = 'All' | 'Politics' | 'Crypto' | 'Sports' | 'Finance' | 'Pop Culture' | 'Tech'
type ViewMode = 'grid' | 'list'

type FilterType = 'all' | 'our-picks' | 'high-pnl' | 'high-volume' | 'rising-stars'

const timeframes: UITimeframe[] = ['24H', '7D', '30D', 'All']
const categories: UICategory[] = ['All', 'Politics', 'Crypto', 'Sports', 'Finance', 'Pop Culture', 'Tech']

const filters: { id: FilterType; label: string; icon: React.ReactNode }[] = [
  { id: 'our-picks', label: 'Our Picks', icon: <Star className="h-3 w-3" /> },
  { id: 'high-pnl', label: 'High PnL', icon: <TrendingUp className="h-3 w-3" /> },
  { id: 'high-volume', label: 'High Volume', icon: <Zap className="h-3 w-3" /> },
  { id: 'rising-stars', label: 'Rising Stars', icon: <Users className="h-3 w-3" /> },
]

const navTabs = [
  { href: '/leaderboard', label: 'Leaderboard', icon: '/leaderboard-icon.svg' },
  { href: '/our-picks', label: 'Our Picks', icon: '/our-picks-icon.svg' },
  { href: '/high-pnl', label: 'High PnL', icon: '/high-pnl-icon.svg' },
  { href: '/high-volume', label: 'High Volume', icon: '/high-volume-icon.svg' },
  { href: '/rising-stars', label: 'Rising Stars', icon: '/rising-stars-icon.svg' },
]

// Generate mini sparkline data
function generateSparkline(pnl: number): number[] {
  const points = 20
  const trend = pnl > 0 ? 1 : -1
  const volatility = Math.random() * 0.3 + 0.1
  let value = 50
  const data: number[] = []
  
  for (let i = 0; i < points; i++) {
    value += (Math.random() - 0.5 + trend * 0.15) * volatility * 20
    value = Math.max(10, Math.min(90, value))
    data.push(value)
  }
  
  // Ensure end matches trend
  if (pnl > 0) {
    data[data.length - 1] = Math.max(data[data.length - 1], 70)
  } else {
    data[data.length - 1] = Math.min(data[data.length - 1], 30)
  }
  
  return data
}

// Mini sparkline component
let sparklineCounter = 0
function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const width = 120
  const height = 40
  const lineColor = positive ? '#22c55e' : '#ef4444'
  const [id] = useState(() => `spark-${++sparklineCounter}`)
  
  const linePoints = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - (v / 100) * height}`).join(' ')
  const areaPoints = `0,${height} ${linePoints} ${width},${height}`
  
  return (
    <svg width={width} height={height} className="flex-shrink-0" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#${id})`}
      />
      <polyline
        points={linePoints}
        fill="none"
        stroke={lineColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Smart Score calculation
function calculateSmartScore(pnl: number, volume: number, rank: number): number {
  const pnlScore = Math.min(pnl / 10000, 40)
  const volumeScore = Math.min(volume / 100000, 30)
  const rankScore = Math.max(30 - rank, 0)
  return Math.round(Math.max(0, Math.min(100, pnlScore + volumeScore + rankScore)))
}

// Badge type with icon and color info
type Badge = { label: string; icon: 'whale' | 'shark' | 'dolphin' | 'gem' | 'target' | 'flame' | 'shield' | 'crown' | 'activity' | 'zap'; color: string }

// Get trader badges based on stats
function getTraderBadges(trader: LeaderboardTrader, rank: number): Badge[] {
  const badges: Badge[] = []
  
  // Rank badge (individual for top 3)
  if (rank === 1) badges.push({ label: 'Top 1', icon: 'crown', color: 'text-yellow-400' })
  else if (rank === 2) badges.push({ label: 'Top 2', icon: 'crown', color: 'text-slate-300' })
  else if (rank === 3) badges.push({ label: 'Top 3', icon: 'crown', color: 'text-amber-600' })
  else if (rank <= 10) badges.push({ label: 'Top 10', icon: 'flame', color: 'text-orange-400' })
  else if (rank <= 25) badges.push({ label: 'Top 25', icon: 'flame', color: 'text-orange-400/70' })

  // Volume tier badge
  if (trader.vol > 10000000) badges.push({ label: 'High Roller', icon: 'gem', color: 'text-amber-400' })
  else if (trader.vol > 1000000) badges.push({ label: 'Big Player', icon: 'zap', color: 'text-blue-400' })
  else if (trader.vol > 100000) badges.push({ label: 'Active', icon: 'activity', color: 'text-cyan-400' })

  // PnL performance badge
  if (trader.pnl > 500000) badges.push({ label: 'Alpha Hunter', icon: 'target', color: 'text-violet-400' })
  else if (trader.pnl > 100000) badges.push({ label: 'Consistent', icon: 'shield', color: 'text-emerald-400' })
  else if (trader.pnl > 10000) badges.push({ label: 'In Profit', icon: 'shield', color: 'text-green-400' })
  else if (trader.pnl > 0) badges.push({ label: 'Positive', icon: 'shield', color: 'text-green-400/70' })

  return badges.slice(0, 3)
}

// Badge icon component
function BadgeIcon({ icon, className }: { icon: Badge['icon']; className?: string }) {
  switch (icon) {
    case 'whale': return <Crown className={className} />
    case 'shark': return <Zap className={className} />
    case 'dolphin': return <Activity className={className} />
    case 'gem': return <Gem className={className} />
    case 'target': return <Target className={className} />
    case 'flame': return <Flame className={className} />
    case 'shield': return <Shield className={className} />
    case 'crown': return <Crown className={className} />
    case 'activity': return <Activity className={className} />
    case 'zap': return <Zap className={className} />
    default: return null
  }
}

// Format large numbers
function formatLargeNumber(num: number): string {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`
  return `$${num.toFixed(0)}`
}

// Format PnL with space separator
function formatPnlLarge(pnl: number): string {
  const sign = pnl >= 0 ? '+' : ''
  const formatted = Math.abs(pnl).toLocaleString('en-US', { maximumFractionDigits: 0 }).replace(/,/g, ' ')
  return `${sign}$${formatted}`
}

interface TraderCardProps {
  trader: LeaderboardTrader
  rank: number
  onClick: () => void
  userId: string | null
  followedSet: Set<string>
  trackedSet: Set<string>
}

function TraderCard({ trader, rank, onClick, userId, followedSet, trackedSet }: TraderCardProps) {
  const smartScore = calculateSmartScore(trader.pnl, trader.vol, rank)
  const sparklineData = generateSparkline(trader.pnl)
  const isPositive = trader.pnl >= 0
  const winRate = 45 + Math.random() * 15
  const sharpe = (5 + Math.random() * 15)

  // Risk/profitability for Smart Score tooltip
  const riskEfficiency = Math.min(99.99, Math.max(0, 50 + (smartScore - 50) * 1.2))
  const profitability = Math.min(99.99, Math.max(0, 50 + (trader.pnl / Math.max(trader.vol || 1, 1)) * 500))

  // Categories
  const traderCategories = getTraderCategories({
    pnl: trader.pnl,
    volume: trader.vol,
    smartScore,
    winRate,
    rank,
  })
  
  return (
    <div 
      onClick={onClick}
      className="relative bg-card border border-border rounded-2xl p-5 hover:border-foreground/15 transition-all duration-300 cursor-pointer group"
    >
      {/* Row 1: Avatar + Name (left) / Smart Score (right) */}
      <div className="flex items-start justify-between gap-3 mb-4">
        {/* Left: Avatar + Name + Address */}
        <div className="flex items-center gap-3 min-w-0">
          {trader.profileImage ? (
            <div className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-border/50">
              <Image
                src={trader.profileImage || "/placeholder.svg"}
                alt={trader.userName || 'Trader'}
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center bg-secondary border border-border rounded-full flex-shrink-0 text-foreground font-bold text-sm">
              {(trader.userName || trader.proxyWallet.slice(2, 4)).toUpperCase().slice(0, 2)}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-semibold text-foreground text-sm truncate leading-tight">
              {trader.userName || formatAddress(trader.proxyWallet)}
            </div>
            <div className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">
              {formatAddress(trader.proxyWallet)}
            </div>
          </div>
        </div>

        {/* Right: Smart Score Badge */}
        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <SmartScoreBadge
            score={smartScore}
            tooltipData={{ riskEfficiency, profitability }}
            size="sm"
          />
        </div>
      </div>
      
      {/* Row 2: Category badges */}
      {traderCategories.length > 0 && (
        <div className="mb-4" onClick={(e) => e.stopPropagation()}>
          <CategoriesRow categories={traderCategories} maxVisible={3} size="sm" />
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-border/40 mb-4" />
      
      {/* Row 3: PnL + Sparkline */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-[11px] text-muted-foreground font-medium mb-1">PnL</div>
          <div className={cn(
            'text-2xl font-bold font-mono tracking-tight',
            isPositive ? 'text-emerald-400' : 'text-red-400'
          )}>
            {formatPnlLarge(trader.pnl)}
          </div>
        </div>
        <MiniSparkline data={sparklineData} positive={isPositive} />
      </div>

      {/* Row 4: 3-column stats with green labels matching screenshot */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div>
          <div className="text-[11px] text-[#22c55e] font-medium mb-0.5">Volume</div>
          <div className="font-semibold text-foreground text-sm font-mono">{formatLargeNumber(trader.vol)}</div>
        </div>
        <div>
          <div className="text-[11px] text-[#22c55e] font-medium mb-0.5">Win Rate</div>
          <div className="font-semibold text-foreground text-sm font-mono">{winRate.toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-[11px] text-[#22c55e] font-medium mb-0.5">Sharpe</div>
          <div className="font-semibold text-foreground text-sm font-mono">{sharpe.toFixed(2)}</div>
        </div>
      </div>
      
      {/* Row 5: Follow Button - lime/green style matching screenshot */}
      <FollowButton
        traderAddress={trader.proxyWallet}
        traderName={trader.userName}
        variant="follow"
        className="w-full"
        userId={userId}
        initialFollowed={followedSet.has(trader.proxyWallet)}
        initialTracked={trackedSet.has(trader.proxyWallet)}
        showLogo
      />
    </div>
  )
}

function TraderCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-4 w-28 mb-1.5" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-8 w-36 rounded-lg" />
      </div>
      {/* Categories */}
      <div className="flex gap-1.5 mb-4">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-28 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
      </div>
      {/* Divider */}
      <div className="h-px bg-border/40 mb-4" />
      {/* PnL + Sparkline */}
      <div className="flex justify-between items-end mb-5">
        <div>
          <Skeleton className="h-3 w-10 mb-1" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div>
          <Skeleton className="h-3 w-14 mb-1" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div>
          <Skeleton className="h-3 w-14 mb-1" />
          <Skeleton className="h-5 w-12" />
        </div>
        <div>
          <Skeleton className="h-3 w-14 mb-1" />
          <Skeleton className="h-5 w-12" />
        </div>
      </div>
      {/* Follow button */}
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  )
}

export function TraderCards() {
  const router = useRouter()
  const [timeframe, setTimeframe] = useState<UITimeframe>('7D')
  const [category, setCategory] = useState<UICategory>('All')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search input
  React.useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(timeout)
  }, [search])

  // Build SWR key from all filter params
  const swrKey = React.useMemo(() => {
    const params = new URLSearchParams({
      category: mapCategoryToApi(category),
      timePeriod: mapTimeframeToApi(timeframe),
      orderBy: activeFilter === 'high-volume' ? 'VOL' : 'PNL',
      limit: '24',
    })
    if (debouncedSearch) params.set('userName', debouncedSearch)
    return `/api/polymarket/leaderboard?${params}`
  }, [category, timeframe, activeFilter, debouncedSearch])

  const { data: traders = [], error: swrError, isLoading, mutate } = useSWR<LeaderboardTrader[]>(
    swrKey,
    leaderboardFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,    // don't re-fetch same key for 30s
      keepPreviousData: true,     // show old data while loading new filters
    }
  )

  const error = swrError ? 'Failed to load trader data' : null

  // Batch-fetch user follow/track statuses ONCE (not per card)
  const [userId, setUserId] = useState<string | null>(null)
  const [followedSet, setFollowedSet] = useState<Set<string>>(new Set())
  const [trackedSet, setTrackedSet] = useState<Set<string>>(new Set())

  useEffect(() => {
    const supabase = createClient()
    const fetchUserStatuses = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      setUserId(session.user.id)

      const [{ data: followed }, { data: tracked }] = await Promise.all([
        supabase.from('followed_traders').select('trader_address').eq('user_id', session.user.id),
        supabase.from('tracked_wallets').select('wallet_address').eq('user_id', session.user.id),
      ])

      if (followed) setFollowedSet(new Set(followed.map(f => f.trader_address)))
      if (tracked) setTrackedSet(new Set(tracked.map(t => t.wallet_address)))
    }
    fetchUserStatuses()
  }, [])

  const handleCardClick = (wallet: string) => {
    router.push(`/trader/${wallet}`)
  }

  return (
    <div className="space-y-4">
      {/* Header Row - Title and Timeframe */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Trader Profiles</h1>
        
        {/* Timeframe Tabs */}
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-all',
                timeframe === tf 
                  ? 'bg-foreground text-background' 
                  : 'bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50',
                tf !== '24H' && 'border-l border-border'
              )}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      
      {/* Error State */}
      {error && (
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <p className="text-destructive text-sm mb-4">{error}</p>
          <Button onClick={() => mutate()} className="bg-foreground hover:bg-foreground/90 text-background">
            Retry
          </Button>
        </div>
      )}
      
      {/* Cards Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 9 }).map((_, i) => <TraderCardSkeleton key={i} />)
          ) : traders.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No traders found
            </div>
          ) : (
            traders.map((trader, index) => (
              <TraderCard
                key={trader.proxyWallet}
                trader={trader}
                rank={trader.rank || index + 1}
                onClick={() => handleCardClick(trader.proxyWallet)}
                userId={userId}
                followedSet={followedSet}
                trackedSet={trackedSet}
              />
            ))
          )}
        </div>
      ) : (
        /* List View - Use existing table style */
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Trader</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">Smart Score</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">PnL</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Volume</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-6" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-48" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16 mx-auto" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : (
                traders.map((trader, index) => {
                  const smartScore = calculateSmartScore(trader.pnl, trader.vol, trader.rank || index + 1)
                  return (
                    <tr
                      key={trader.proxyWallet}
                      onClick={() => handleCardClick(trader.proxyWallet)}
                      className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-sm text-muted-foreground">
                        {String(trader.rank || index + 1).padStart(2, '0')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {trader.profileImage ? (
                            <Image
                              src={trader.profileImage || "/placeholder.svg"}
                              alt={trader.userName || 'Trader'}
                              width={32}
                              height={32}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-secondary border border-border flex items-center justify-center text-foreground font-bold text-xs">
                              {(trader.userName || trader.proxyWallet.slice(2, 4)).toUpperCase().slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-foreground text-sm">
                              {trader.userName || formatAddress(trader.proxyWallet)}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {formatAddress(trader.proxyWallet)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1.5 bg-primary/20 text-primary px-2 py-1 rounded-lg text-sm font-medium">
                          {smartScore.toFixed(1)}/100
                        </span>
                      </td>
                      <td className={cn(
                        'px-4 py-3 text-right font-mono text-sm font-medium',
                        trader.pnl >= 0 ? 'text-lime-400' : 'text-red-500'
                      )}>
                        {formatPnl(trader.pnl)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">
                        {formatVolume(trader.vol)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground">
        Live data from Polymarket
      </div>
    </div>
  )
}
