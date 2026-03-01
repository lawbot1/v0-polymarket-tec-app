'use client'

import React from 'react'
import { useState, useMemo, use } from 'react'
import useSWR from 'swr'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  type UserPosition,
  type UserTrade,
  type LeaderboardTrader,
  formatPnl,
  formatVolume,
  formatAddress,
  timeAgo,
  normalizeTimestamp,
  formatShortDate,
} from '@/lib/polymarket-api'
import { cn } from '@/lib/utils'
import { Copy, ExternalLink, RefreshCw, ArrowLeft, Trophy, Target, TrendingUp, Shield, Zap, BarChart3 } from 'lucide-react'
import { FollowButton } from '@/components/trader/follow-button'
import { SmartScoreBadge } from '@/components/trader/smart-score-badge'
import { getTraderCategories, CategoriesRow } from '@/components/trader/category-badges'
import { CategoryProficiency } from '@/components/trader/category-proficiency'
import Link from 'next/link'
import Image from 'next/image'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// SWR fetcher
const fetcher = (url: string) => fetch(url).then(res => res.ok ? res.json() : Promise.reject('Failed to fetch'))

interface TraderPageProps {
  params: Promise<{ id: string }>
}

// ---- Chart timeframe filtering ----
type ChartTimeframe = '1D' | '1W' | '1M' | '6M' | 'ALL'

function filterByTimeframe(data: { date: string; value: number }[], tf: ChartTimeframe) {
  if (tf === 'ALL' || data.length === 0) return data
  const now = new Date()
  const cutoff = new Date()
  if (tf === '1D') cutoff.setDate(now.getDate() - 1)
  else if (tf === '1W') cutoff.setDate(now.getDate() - 7)
  else if (tf === '1M') cutoff.setMonth(now.getMonth() - 1)
  else if (tf === '6M') cutoff.setMonth(now.getMonth() - 6)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  return data.filter(d => d.date >= cutoffStr)
}

// ---- Badges generator ----
function getTraderBadges(profile: LeaderboardTrader | null, positions: UserPosition[], trades: UserTrade[]) {
  if (!profile) return []
  const badges: { label: string; color: string }[] = []

  // Volume-based tier
  const vol = profile.vol || 0
  if (vol >= 1_000_000) badges.push({ label: 'Whale', color: 'text-[#60a5fa] border-[#60a5fa]/40' })
  else if (vol >= 100_000) badges.push({ label: 'Shark', color: 'text-[#a78bfa] border-[#a78bfa]/40' })
  else if (vol >= 10_000) badges.push({ label: 'Dolphin', color: 'text-[#34d399] border-[#34d399]/40' })
  else badges.push({ label: 'Shrimp', color: 'text-[#f97316] border-[#f97316]/40' })

  // Experience
  if (trades.length >= 200) badges.push({ label: 'Experienced', color: 'text-[#fbbf24] border-[#fbbf24]/40' })
  else if (trades.length >= 50) badges.push({ label: 'Active', color: 'text-[#818cf8] border-[#818cf8]/40' })

  // Profitability
  const pnl = profile.pnl || 0
  if (pnl > 0) badges.push({ label: 'Positive', color: 'text-[#22c55e] border-[#22c55e]/40' })
  else if (pnl < 0) badges.push({ label: 'Negative', color: 'text-destructive border-destructive/40' })

  // Focus
  const categories = new Set(positions.map(p => p.eventSlug?.split('-')[0]).filter(Boolean))
  if (categories.size <= 2 && positions.length > 3) badges.push({ label: 'Single-Focus', color: 'text-muted-foreground border-border' })
  else if (categories.size >= 5) badges.push({ label: 'Diversified', color: 'text-[#06b6d4] border-[#06b6d4]/40' })

  return badges
}

// ---- Smart Score calculation ----
function calcSmartScore(profile: LeaderboardTrader | null, winRate: number, positions: UserPosition[]) {
  if (!profile) return 0
  const pnl = profile.pnl || 0
  const vol = profile.vol || 0
  let score = 50

  // Profitability factor (0-30)
  if (pnl > 0) {
    const ratio = vol > 0 ? pnl / vol : 0
    score += Math.min(30, ratio * 300)
  } else {
    score -= Math.min(20, Math.abs(pnl / Math.max(vol, 1)) * 200)
  }

  // Win rate factor (0-20)
  score += (winRate / 100) * 20

  // Activity factor (0-10)
  score += Math.min(10, positions.length * 0.5)

  return Math.max(0, Math.min(100, score))
}

export default function TraderPage({ params }: TraderPageProps) {
  const { id } = use(params)
  const [copied, setCopied] = useState(false)
  const [chartTf, setChartTf] = useState<ChartTimeframe>('ALL')

  // Parallel SWR requests with caching
  const { data: profileData, error: profileError, mutate: mutateProfile } = useSWR<LeaderboardTrader[]>(
    `/api/polymarket/leaderboard?user=${id}&limit=1&timePeriod=ALL`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )
  
  const { data: positions = [], error: positionsError, mutate: mutatePositions } = useSWR<UserPosition[]>(
    `/api/polymarket/positions?user=${id}&limit=100&sortBy=CASHPNL&sortDirection=DESC`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )
  
  const { data: trades = [], error: tradesError, mutate: mutateTrades } = useSWR<UserTrade[]>(
    `/api/polymarket/trades?user=${id}&limit=500`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  const profile = profileData?.[0] || null
  const isLoading = !profileData && !profileError
  const error = profileError || positionsError || tradesError ? 'Failed to load trader data' : null

  const fetchTraderData = () => {
    mutateProfile()
    mutatePositions()
    mutateTrades()
  }

  const copyWallet = () => {
    navigator.clipboard.writeText(id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ---- Derived metrics ----
  const totalUnrealizedPnl = positions.reduce((s, p) => s + (p.cashPnl || 0), 0)
  const totalPositionValue = positions.reduce((s, p) => s + (p.currentValue || 0), 0)
  const totalAccountBalance = (profile?.vol || 0) > 0
    ? (profile?.pnl || 0) + totalPositionValue
    : totalPositionValue

  // Win rate
  const winCount = positions.filter(p => (p.cashPnl || 0) > 0).length
  const totalResolved = positions.filter(p => p.cashPnl !== undefined && p.cashPnl !== 0).length
  const winRate = totalResolved > 0 ? (winCount / totalResolved) * 100 : 0

  // Sharpe & Sortino (simplified from daily returns)
  const dailyReturns = useMemo(() => {
    const tradesByDate = new Map<string, number>()
    trades.slice().reverse().forEach(t => {
      const date = formatShortDate(t.timestamp)
      const ret = t.side === 'SELL' ? t.size * t.price : -t.size * t.price
      tradesByDate.set(date, (tradesByDate.get(date) || 0) + ret)
    })
    return Array.from(tradesByDate.values())
  }, [trades])

  const avgReturn = dailyReturns.length > 0 ? dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length : 0
  const stdDev = dailyReturns.length > 1
    ? Math.sqrt(dailyReturns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / (dailyReturns.length - 1))
    : 1
  const downside = dailyReturns.length > 1
    ? Math.sqrt(dailyReturns.filter(r => r < 0).reduce((s, r) => s + r * r, 0) / Math.max(dailyReturns.filter(r => r < 0).length, 1))
    : 1
  const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0
  const sortinoRatio = downside > 0 ? avgReturn / downside : 0

  // Risk efficiency & profitability scores
  const riskEfficiency = Math.min(99.99, Math.max(0, 50 + sharpeRatio * 15))
  const profitability = Math.min(99.99, Math.max(0, 50 + (profile?.pnl || 0) / Math.max(profile?.vol || 1, 1) * 500))

  // Best category -- map raw event slugs to Polymarket category names
  const SLUG_TO_CATEGORY: Record<string, string> = {
    // Sports & Esports
    epl: 'Sports', nba: 'Sports', nfl: 'Sports', mlb: 'Sports', nhl: 'Sports',
    ufc: 'Sports', soccer: 'Sports', tennis: 'Sports', f1: 'Sports', mls: 'Sports',
    golf: 'Sports', boxing: 'Sports', cricket: 'Sports', sport: 'Sports', liga: 'Sports',
    ncaa: 'Sports', wnba: 'Sports', rugby: 'Sports', ligue: 'Sports', serie: 'Sports',
    bundesliga: 'Sports', laliga: 'Sports', champions: 'Sports', atp: 'Sports',
    wta: 'Sports', fifa: 'Sports', olympics: 'Sports', nascar: 'Sports',
    lol: 'Sports', csgo: 'Sports', dota: 'Sports', valorant: 'Sports', esports: 'Sports',
    league: 'Sports', overwatch: 'Sports', ipl: 'Sports', pga: 'Sports',
    // Crypto
    bitcoin: 'Crypto', btc: 'Crypto', ethereum: 'Crypto', eth: 'Crypto',
    solana: 'Crypto', sol: 'Crypto', crypto: 'Crypto', defi: 'Crypto',
    token: 'Crypto', xrp: 'Crypto', doge: 'Crypto', memecoin: 'Crypto',
    nft: 'Crypto', web3: 'Crypto', stablecoin: 'Crypto', altcoin: 'Crypto',
    // Politics & Political figures
    trump: 'Politics', biden: 'Politics', election: 'Elections', vote: 'Elections',
    president: 'Politics', congress: 'Politics', senate: 'Politics', governor: 'Politics',
    democrat: 'Politics', republican: 'Politics', gop: 'Politics', primary: 'Elections',
    political: 'Politics', politics: 'Politics', harris: 'Politics', desantis: 'Politics',
    vance: 'Politics', newsom: 'Politics', midterm: 'Elections', ballot: 'Elections',
    // World leaders & political figures -> Geopolitics
    khamenei: 'Geopolitics', putin: 'Geopolitics', xi: 'Geopolitics', zelensky: 'Geopolitics',
    netanyahu: 'Geopolitics', macron: 'Geopolitics', scholz: 'Geopolitics', modi: 'Geopolitics',
    erdogan: 'Geopolitics', kim: 'Geopolitics', lula: 'Geopolitics', milei: 'Geopolitics',
    sunak: 'Geopolitics', starmer: 'Geopolitics', trudeau: 'Geopolitics',
    // Tech
    ai: 'Tech', apple: 'Tech', google: 'Tech', openai: 'Tech', spacex: 'Tech',
    tesla: 'Tech', meta: 'Tech', microsoft: 'Tech', nvidia: 'Tech', tech: 'Tech',
    twitter: 'Tech', tiktok: 'Tech', amazon: 'Tech', chatgpt: 'Tech', gpt: 'Tech',
    robot: 'Tech', android: 'Tech', iphone: 'Tech', chip: 'Tech', semiconductor: 'Tech',
    // Economy / Finance
    fed: 'Economy', inflation: 'Economy', gdp: 'Economy', rate: 'Economy',
    stock: 'Economy', market: 'Economy', sp500: 'Economy', nasdaq: 'Economy',
    earnings: 'Earnings', revenue: 'Earnings', ipo: 'Earnings',
    dow: 'Economy', treasury: 'Economy', bond: 'Economy', recession: 'Economy',
    jobs: 'Economy', unemployment: 'Economy', cpi: 'Economy', forex: 'Economy',
    // Geopolitics
    war: 'Geopolitics', ukraine: 'Geopolitics', russia: 'Geopolitics', china: 'Geopolitics',
    nato: 'Geopolitics', iran: 'Geopolitics', israel: 'Geopolitics', gaza: 'Geopolitics',
    taiwan: 'Geopolitics', korea: 'Geopolitics', sanctions: 'Geopolitics',
    india: 'Geopolitics', syria: 'Geopolitics', eu: 'Geopolitics', brexit: 'Geopolitics',
    successor: 'Geopolitics', leader: 'Geopolitics', regime: 'Geopolitics',
    // Pop Culture
    oscar: 'Pop Culture', emmy: 'Pop Culture', grammy: 'Pop Culture',
    movie: 'Pop Culture', film: 'Pop Culture', celebrity: 'Pop Culture',
    music: 'Pop Culture', superbowl: 'Pop Culture', culture: 'Pop Culture',
    kanye: 'Pop Culture', taylor: 'Pop Culture', drake: 'Pop Culture', netflix: 'Pop Culture',
    disney: 'Pop Culture', youtube: 'Pop Culture', twitch: 'Pop Culture',
    // World
    weather: 'World', covid: 'World', climate: 'World', earthquake: 'World',
    who: 'World', un: 'World', world: 'World', pandemic: 'World', hurricane: 'World',
    // General prediction
    will: 'World', when: 'World', how: 'World', what: 'World',
    other: 'World',
  }

  const bestCategory = useMemo(() => {
    const catPnl = new Map<string, number>()
    positions.forEach(p => {
      const rawSlug = p.eventSlug?.split('-')[0]?.toLowerCase() || 'other'
      // Only use mapped categories, fallback to 'World' if not found
      const categoryName = SLUG_TO_CATEGORY[rawSlug] || 'World'
      catPnl.set(categoryName, (catPnl.get(categoryName) || 0) + (p.cashPnl || 0))
    })
    let best = 'N/A'
    let bestVal = -Infinity
    catPnl.forEach((val, cat) => { if (val > bestVal) { bestVal = val; best = cat } })
    return best
  }, [positions])

  const smartScore = calcSmartScore(profile, winRate, positions)
  const badges = getTraderBadges(profile, positions, trades)
  
  // Categories for the new category badges
  const traderCategories = getTraderCategories({
    pnl: profile?.pnl || 0,
    volume: profile?.vol || 0,
    smartScore,
    winRate,
    rank: Number(profile?.rank) || 999,
    tradesCount: trades.length,
    positionsCount: positions.length,
    bestCategory,
  })

  // ---- PnL chart data ----
  // Build equity curve from trades. SELL = profit realized, BUY = cost paid.
  // We scale the curve so the final value matches the real total PnL from the API.
  const equityCurve = useMemo(() => {
    if (trades.length === 0) return []

    // Group raw PnL by date
    const sorted = trades.slice().reverse()
    const pnlByDate = sorted.reduce<Map<string, number>>((acc, trade) => {
      const date = formatShortDate(trade.timestamp)
      // SELL generates positive cash, BUY negative
      const raw = trade.side === 'SELL' ? trade.size * trade.price : -trade.size * trade.price
      acc.set(date, (acc.get(date) || 0) + raw)
      return acc
    }, new Map())

    // Build cumulative curve
    const rawCurve = Array.from(pnlByDate.entries()).reduce<{ date: string; value: number }[]>((acc, [date, dailyPnl]) => {
      const prev = acc.length > 0 ? acc[acc.length - 1].value : 0
      acc.push({ date, value: prev + dailyPnl })
      return acc
    }, [])

    if (rawCurve.length === 0) return []

    // Scale so the final point matches the real total PnL from API
    const realPnl = profile?.pnl ?? 0
    const rawFinal = rawCurve[rawCurve.length - 1].value
    if (rawFinal === 0 || realPnl === 0) {
      // Can't scale, just show curve starting from 0 ending at realPnl
      return rawCurve.map((p, i) => ({
        date: p.date,
        value: realPnl * ((i + 1) / rawCurve.length),
      }))
    }
    const scale = realPnl / rawFinal
    return rawCurve.map(p => ({ date: p.date, value: p.value * scale }))
  }, [trades, profile])

  const filteredCurve = filterByTimeframe(equityCurve, chartTf)
  const lastValue = filteredCurve.length > 0 ? filteredCurve[filteredCurve.length - 1].value : 0
  const chartColor = lastValue >= 0 ? '#22c55e' : '#ef4444'

  return (
    <AppShell
      title={profile?.userName || formatAddress(id)}
      subtitle="Trader Profile"
    >
      <div className="space-y-6">
        {/* Back Button */}
        <div>
          <Link href="/">
            <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground text-xs uppercase tracking-wider">
              <ArrowLeft className="h-4 w-4" />
              Leaderboard
            </Button>
          </Link>
        </div>

        {error && (
          <div className="sharp-panel p-6 text-center">
            <p className="text-destructive text-sm mb-4">{error}</p>
            <Button onClick={fetchTraderData} variant="outline" className="border-border bg-transparent uppercase text-xs tracking-wider">
              Retry
            </Button>
          </div>
        )}

        {/* ===== HEADER with avatar, name, wallet, badges, follow ===== */}
        <div className="sharp-panel p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              {isLoading ? (
                <Skeleton className="h-12 w-12 sm:h-16 sm:w-16 rounded-full" />
              ) : profile?.profileImage ? (
                <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full overflow-hidden flex-shrink-0 bg-secondary border-2 border-border">
                  <Image
                    src={profile.profileImage || '/placeholder.svg'}
                    alt={profile.userName || 'Trader'}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center bg-secondary text-foreground text-lg sm:text-xl font-mono rounded-full flex-shrink-0 border-2 border-border">
                  {(profile?.userName || id.slice(2, 4)).toUpperCase().slice(0, 2)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                {isLoading ? (
                  <Skeleton className="h-6 sm:h-7 w-32 sm:w-48" />
                ) : (
                  <h2 className="text-lg sm:text-2xl font-semibold text-foreground tracking-tight truncate">
                    {profile?.userName || formatAddress(id)}
                  </h2>
                )}
                <div className="mt-1 flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground font-mono">
                  <span className="truncate">{formatAddress(id)}</span>
                  <button onClick={copyWallet} className="hover:text-foreground transition-colors flex-shrink-0">
                    {copied ? <span className="text-[#22c55e] text-[10px] uppercase">Copied</span> : <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                  </button>
                  <a href={`https://polymarket.com/profile/${id}`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors flex-shrink-0">
                    <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </a>
                </div>
              </div>
              {/* Follow button - mobile position */}
              <div className="sm:hidden flex-shrink-0">
                <FollowButton traderAddress={id} traderName={profile?.userName} variant="follow" />
              </div>
            </div>
            {/* Category Badges with tooltips */}
            {!isLoading && traderCategories.length > 0 && (
              <div className="w-full sm:w-auto order-last sm:order-none">
                <CategoriesRow categories={traderCategories} maxVisible={3} size="sm" className="sm:hidden" />
                <CategoriesRow categories={traderCategories} maxVisible={5} size="md" className="hidden sm:flex" />
              </div>
            )}
            {/* Follow button - desktop position */}
            <div className="hidden sm:flex items-center gap-2">
              <FollowButton traderAddress={id} traderName={profile?.userName} variant="follow" />
            </div>
          </div>
        </div>

        {/* ===== 3 BIG STAT CARDS ===== */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* Total Volume */}
          <div className="sharp-panel p-3 sm:p-5">
            <div className="text-[9px] sm:text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1 sm:mb-2 truncate">
              Volume
            </div>
            {isLoading ? <Skeleton className="h-6 sm:h-9 w-16 sm:w-32" /> : (
              <div className="text-lg sm:text-3xl font-semibold font-mono text-foreground tracking-tight">
                {formatVolume(profile?.vol || 0)}
              </div>
            )}
          </div>
          {/* Total P&L */}
          <div className="sharp-panel p-3 sm:p-5">
            <div className="text-[9px] sm:text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1 sm:mb-2 truncate">
              P&L
            </div>
            {isLoading ? <Skeleton className="h-6 sm:h-9 w-16 sm:w-32" /> : (
              <div className={cn(
                'text-lg sm:text-3xl font-semibold font-mono tracking-tight',
                (profile?.pnl || 0) >= 0 ? 'text-[#22c55e]' : 'text-destructive'
              )}>
                {formatPnl(profile?.pnl || 0)}
              </div>
            )}
          </div>
          {/* Total Account Balance */}
          <div className="sharp-panel p-3 sm:p-5">
            <div className="text-[9px] sm:text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1 sm:mb-2 truncate">
              Balance
            </div>
            {isLoading ? <Skeleton className="h-6 sm:h-9 w-16 sm:w-32" /> : (
              <div className="text-lg sm:text-3xl font-semibold font-mono text-foreground tracking-tight">
                {formatVolume(Math.abs(totalAccountBalance))}
              </div>
            )}
          </div>
        </div>

        {/* ===== PNL CHART + PORTFOLIO METRICS (side by side on desktop) ===== */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          {/* PNL Chart - takes 3/5 width */}
          <div className="sharp-panel p-5 lg:col-span-3">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-foreground">PNL Chart</h3>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-4">
              Showing PNL on {chartTf === 'ALL' ? 'all time' : chartTf === '6M' ? '6 month' : chartTf === '1M' ? '1 month' : chartTf === '1W' ? '1 week' : '1 day'} timeframe
            </div>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : filteredCurve.length > 1 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={filteredCurve}>
                    <defs>
                      <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColor} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9 }}
                      tickFormatter={(v) => v.slice(5)}
                      axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9 }}
                      tickFormatter={(v) => Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v.toFixed(0)}`}
                      axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0', fontSize: '11px', color: '#fff' }}
                      formatter={(value: number) => [`${value >= 0 ? '+' : ''}$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 'PnL']}
                      labelFormatter={(l) => `Date: ${l}`}
                    />
                    <Area type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2} fill="url(#pnlGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No chart data available</div>
            )}
            {/* Timeframe buttons */}
            <div className="flex gap-2 mt-4">
              {(['1D', '1W', '1M', '6M', 'ALL'] as ChartTimeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setChartTf(tf)}
                  className={cn(
                    'flex-1 py-2 text-xs font-semibold uppercase tracking-wider border transition-all',
                    chartTf === tf
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground/30'
                  )}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Portfolio Metrics - takes 2/5 width */}
          <div className="sharp-panel p-5 lg:col-span-2 flex flex-col">
            <h3 className="text-sm font-semibold text-foreground mb-4">Portfolio Metrics</h3>

            {/* Smart Score - with hoverable tooltip */}
            <div className="mb-4">
              {isLoading ? <Skeleton className="h-10 w-32" /> : (
                <>
                  <SmartScoreBadge
                    score={smartScore}
                    tooltipData={{ riskEfficiency, profitability }}
                    size="lg"
                  />
                  <div className="mt-3 h-1.5 bg-secondary overflow-hidden rounded-full">
                    <div className="h-full bg-[#22c55e] transition-all duration-500 rounded-full" style={{ width: `${smartScore}%` }} />
                  </div>
                </>
              )}
            </div>

            {/* Risk Efficiency & Profitability */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Risk Efficiency</span>
                {isLoading ? <Skeleton className="h-4 w-12" /> : (
                  <span className="text-sm font-mono font-semibold text-foreground">{riskEfficiency.toFixed(2)}</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Profitability</span>
                {isLoading ? <Skeleton className="h-4 w-12" /> : (
                  <span className="text-sm font-mono font-semibold text-foreground">{profitability.toFixed(2)}</span>
                )}
              </div>
            </div>

            {/* 2x2 metric grid */}
            <div className="grid grid-cols-2 gap-3 mt-auto">
              <div className="sharp-panel p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Win Rate</div>
                {isLoading ? <Skeleton className="h-7 w-16" /> : (
                  <div className="text-xl font-semibold font-mono text-foreground">{winRate.toFixed(1)}%</div>
                )}
              </div>
              <div className="sharp-panel p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Sharpe Ratio</div>
                {isLoading ? <Skeleton className="h-7 w-16" /> : (
                  <div className="text-xl font-semibold font-mono text-foreground">{sharpeRatio.toFixed(2)}</div>
                )}
              </div>
              <div className="sharp-panel p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Sortino Ratio</div>
                {isLoading ? <Skeleton className="h-7 w-16" /> : (
                  <div className="text-xl font-semibold font-mono text-foreground">{sortinoRatio.toFixed(2)}</div>
                )}
              </div>
              <div className="sharp-panel p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Best Category</div>
                {isLoading ? <Skeleton className="h-7 w-16" /> : (
                  <div className="text-xl font-semibold text-[#22c55e] truncate">{bestCategory}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ===== CATEGORY PROFICIENCY ===== */}
        {!isLoading && (
          <CategoryProficiency
            positions={positions}
            trades={trades}
            profile={profile ? { pnl: profile.pnl || 0, vol: profile.vol || 0 } : null}
            slugToCategory={SLUG_TO_CATEGORY}
          />
        )}

        {/* ===== POSITIONS & HISTORY TABS ===== */}
        <div className="sharp-panel">
          <Tabs defaultValue="positions">
            <TabsList className="w-full justify-start border-b border-border bg-transparent p-0">
              <TabsTrigger
                value="positions"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-3 sm:px-6 py-3 text-[10px] sm:text-xs uppercase tracking-wider"
              >
                Positions ({positions.length})
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-3 sm:px-6 py-3 text-[10px] sm:text-xs uppercase tracking-wider"
              >
                History ({trades.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="positions" className="p-0">
              {/* Mobile: Card layout */}
              <div className="sm:hidden divide-y divide-border">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-3 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))
                ) : positions.length === 0 ? (
                  <div className="px-4 py-12 text-center text-muted-foreground text-sm">No open positions</div>
                ) : (
                  positions.map((pos) => (
                    <div key={`${pos.conditionId}-${pos.outcomeIndex}`} className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {pos.icon && <Image src={pos.icon || '/placeholder.svg'} alt="" width={20} height={20} className="h-5 w-5 flex-shrink-0" />}
                          <p className="text-sm text-foreground line-clamp-2">{pos.title}</p>
                        </div>
                        <span className={cn('flex-shrink-0 inline-flex border px-2 py-0.5 text-[10px] font-medium uppercase', pos.outcome?.toLowerCase() === 'yes' ? 'border-[#22c55e]/50 text-[#22c55e]' : pos.outcome?.toLowerCase() === 'no' ? 'border-destructive/50 text-destructive' : 'border-yellow-500/50 text-yellow-500')}>
                          {pos.outcome}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex gap-3 text-muted-foreground">
                          <span>Size: <span className="text-foreground font-mono">{pos.size?.toFixed(2)}</span></span>
                          <span>Avg: <span className="text-foreground font-mono">{((pos.avgPrice || 0) * 100).toFixed(0)}c</span></span>
                          <span>Now: <span className="text-foreground font-mono">{((pos.curPrice || 0) * 100).toFixed(0)}c</span></span>
                        </div>
                        <div className="text-right">
                          <span className={cn('font-mono font-medium', (pos.cashPnl || 0) >= 0 ? 'text-[#22c55e]' : 'text-destructive')}>
                            {formatPnl(pos.cashPnl || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {/* Desktop: Table layout */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Market</th>
                      <th className="px-4 py-3 text-center text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Side</th>
                      <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Size</th>
                      <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Avg</th>
                      <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Current</th>
                      <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-muted-foreground">PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-12 mx-auto" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-12 ml-auto" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-12 ml-auto" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
                        </tr>
                      ))
                    ) : positions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">No open positions</td>
                      </tr>
                    ) : (
                      positions.map((pos) => (
                        <tr key={`${pos.conditionId}-${pos.outcomeIndex}`} className="border-b border-border/50 row-hover">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {pos.icon && <Image src={pos.icon || '/placeholder.svg'} alt="" width={20} height={20} className="h-5 w-5" />}
                              <div>
                                <p className="text-sm text-foreground max-w-[220px] truncate">{pos.title}</p>
                                <p className="text-[10px] text-muted-foreground uppercase">{pos.outcome}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn('inline-flex border px-2 py-0.5 text-[10px] font-medium uppercase', pos.outcome?.toLowerCase() === 'yes' ? 'border-[#22c55e]/50 text-[#22c55e]' : pos.outcome?.toLowerCase() === 'no' ? 'border-destructive/50 text-destructive' : 'border-yellow-500/50 text-yellow-500')}>
                              {pos.outcome}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono text-foreground">{pos.size?.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-sm font-mono text-muted-foreground">{((pos.avgPrice || 0) * 100).toFixed(1)}c</td>
                          <td className="px-4 py-3 text-right text-sm font-mono text-muted-foreground">{((pos.curPrice || 0) * 100).toFixed(1)}c</td>
                          <td className="px-4 py-3 text-right">
                            <span className={cn('text-sm font-mono', (pos.cashPnl || 0) >= 0 ? 'text-[#22c55e]' : 'text-destructive')}>
                              {formatPnl(pos.cashPnl || 0)}
                            </span>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {(pos.percentPnl || 0) >= 0 ? '+' : ''}{(pos.percentPnl || 0).toFixed(1)}%
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="history" className="p-0">
              {/* Mobile: Card layout */}
              <div className="sm:hidden divide-y divide-border">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-3 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))
                ) : trades.length === 0 ? (
                  <div className="px-4 py-12 text-center text-muted-foreground text-sm">No trade history</div>
                ) : (
                  trades.slice(0, 50).map((trade, i) => (
                    <div key={`${trade.transactionHash}-${i}`} className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {trade.icon && <Image src={trade.icon || '/placeholder.svg'} alt="" width={20} height={20} className="h-5 w-5 flex-shrink-0" />}
                          <p className="text-sm text-foreground line-clamp-2">{trade.title}</p>
                        </div>
                        <span className={cn('flex-shrink-0 inline-flex border px-2 py-0.5 text-[10px] font-medium uppercase', trade.outcome?.toLowerCase() === 'yes' ? 'border-[#22c55e]/50 text-[#22c55e]' : trade.outcome?.toLowerCase() === 'no' ? 'border-destructive/50 text-destructive' : 'border-yellow-500/50 text-yellow-500')}>
                          {trade.outcome || trade.side}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{timeAgo(trade.timestamp)}</span>
                        <div className="flex gap-3">
                          <span>Size: <span className="text-foreground font-mono">{trade.size?.toFixed(2)}</span></span>
                          <span>@ <span className="text-foreground font-mono">{((trade.price || 0) * 100).toFixed(0)}c</span></span>
                          {trade.transactionHash && (
                            <a href={`https://polygonscan.com/tx/${trade.transactionHash}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {/* Desktop: Table layout */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Time</th>
                      <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Market</th>
                      <th className="px-4 py-3 text-center text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Action</th>
                      <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Size</th>
                      <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Price</th>
                      <th className="px-4 py-3 text-center text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-16 mx-auto" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-12 ml-auto" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-8 mx-auto" /></td>
                        </tr>
                      ))
                    ) : trades.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">No trade history</td>
                      </tr>
                    ) : (
                      trades.map((trade, i) => (
                        <tr key={`${trade.transactionHash}-${i}`} className="border-b border-border/50 row-hover">
                          <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{timeAgo(trade.timestamp)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {trade.icon && <Image src={trade.icon || '/placeholder.svg'} alt="" width={20} height={20} className="h-5 w-5" />}
                              <div>
                                <p className="text-sm text-foreground max-w-[180px] truncate">{trade.title}</p>
                                <p className="text-[10px] text-muted-foreground uppercase">{trade.outcome}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn('inline-flex border px-2 py-0.5 text-[10px] font-medium uppercase', trade.outcome?.toLowerCase() === 'yes' ? 'border-[#22c55e]/50 text-[#22c55e]' : trade.outcome?.toLowerCase() === 'no' ? 'border-destructive/50 text-destructive' : 'border-yellow-500/50 text-yellow-500')}>
                              {trade.outcome || trade.side}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono text-foreground">{trade.size?.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-sm font-mono text-muted-foreground">{((trade.price || 0) * 100).toFixed(1)}c</td>
                          <td className="px-4 py-3 text-center">
                            {trade.transactionHash && (
                              <a href={`https://polygonscan.com/tx/${trade.transactionHash}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center p-1 text-muted-foreground hover:text-foreground transition-colors">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          Live data from Polymarket
        </div>
      </div>
    </AppShell>
  )
}
