'use client'

import React from 'react'
import { useEffect, useState, useMemo, use } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
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
import { Copy, ExternalLink, RefreshCw, ArrowLeft, ChevronRight } from 'lucide-react'
import { FollowButton } from '@/components/trader/follow-button'
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

  const vol = profile.vol || 0
  if (vol >= 1_000_000) badges.push({ label: 'Whale', color: 'text-[#60a5fa] border-[#60a5fa]/40' })
  else if (vol >= 100_000) badges.push({ label: 'Shark', color: 'text-[#a78bfa] border-[#a78bfa]/40' })
  else if (vol >= 10_000) badges.push({ label: 'Dolphin', color: 'text-[#34d399] border-[#34d399]/40' })
  else badges.push({ label: 'Shrimp', color: 'text-[#f97316] border-[#f97316]/40' })

  if (trades.length >= 200) badges.push({ label: 'Experienced', color: 'text-[#fbbf24] border-[#fbbf24]/40' })
  else if (trades.length >= 50) badges.push({ label: 'Active', color: 'text-[#818cf8] border-[#818cf8]/40' })

  const pnl = profile.pnl || 0
  if (pnl > 100000) badges.push({ label: 'Elite Profit', color: 'text-[#fbbf24] border-[#fbbf24]/40' })
  else if (pnl > 0) badges.push({ label: 'Positive', color: 'text-[#22c55e] border-[#22c55e]/40' })
  else if (pnl < 0) badges.push({ label: 'Negative', color: 'text-destructive border-destructive/40' })

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
  if (pnl > 0) {
    const ratio = vol > 0 ? pnl / vol : 0
    score += Math.min(30, ratio * 300)
  } else {
    score -= Math.min(20, Math.abs(pnl / Math.max(vol, 1)) * 200)
  }
  score += (winRate / 100) * 20
  score += Math.min(10, positions.length * 0.5)
  return Math.max(0, Math.min(100, score))
}

// ---- Category icons ----
const CATEGORY_ICONS: Record<string, string> = {
  crypto: '₿', culture: '★', earnings: '♦', economy: '$', elections: '☑',
  geopolitics: '◈', mentions: '□', politics: '●', sports: '⚡', tech: '⬡',
  trump: '♜', world: '⊕', bitcoin: '₿', will: '?', other: '◎',
}

export default function TraderPage({ params }: TraderPageProps) {
  const { id } = use(params)
  const [profile, setProfile] = useState<LeaderboardTrader | null>(null)
  const [positions, setPositions] = useState<UserPosition[]>([])
  const [trades, setTrades] = useState<UserTrade[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [chartTf, setChartTf] = useState<ChartTimeframe>('ALL')
  const [metricsTab, setMetricsTab] = useState<'overall' | 'categories'>('overall')
  const [positionsTab, setPositionsTab] = useState<'active' | 'closed' | 'activity'>('active')
  const [expandedPos, setExpandedPos] = useState<Set<string>>(new Set())

  const fetchTraderData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [leaderboardRes, positionsRes, tradesRes] = await Promise.all([
        fetch(`/api/polymarket/leaderboard?user=${id}&limit=1`),
        fetch(`/api/polymarket/positions?user=${id}&limit=100&sortBy=CASHPNL&sortDirection=DESC`),
        fetch(`/api/polymarket/trades?user=${id}&limit=500`),
      ])
      if (leaderboardRes.ok) {
        const d = await leaderboardRes.json()
        setProfile(d[0] || null)
      }
      if (positionsRes.ok) setPositions(await positionsRes.json())
      if (tradesRes.ok) setTrades(await tradesRes.json())
    } catch (err) {
      console.error('Error fetching trader data:', err)
      setError('Failed to load trader data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchTraderData() }, [id])

  const copyWallet = () => {
    navigator.clipboard.writeText(id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ---- Derived metrics ----
  const totalPositionValue = positions.reduce((s, p) => s + (p.currentValue || 0), 0)
  const totalAccountBalance = (profile?.vol || 0) > 0
    ? (profile?.pnl || 0) + totalPositionValue
    : totalPositionValue
  const cashOnHand = Math.max(0, totalAccountBalance - totalPositionValue)
  const portfolioValue = totalPositionValue + cashOnHand

  // Win rate
  const winCount = positions.filter(p => (p.cashPnl || 0) > 0).length
  const totalResolved = positions.filter(p => p.cashPnl !== undefined && p.cashPnl !== 0).length
  const winRate = totalResolved > 0 ? (winCount / totalResolved) * 100 : 0

  // Sharpe & Sortino
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

  const riskEfficiency = Math.min(99.99, Math.max(0, 50 + sharpeRatio * 15))
  const profitability = Math.min(99.99, Math.max(0, 50 + (profile?.pnl || 0) / Math.max(profile?.vol || 1, 1) * 500))

  // Best category
  const bestCategory = useMemo(() => {
    const catPnl = new Map<string, number>()
    positions.forEach(p => {
      const cat = p.eventSlug?.split('-')[0] || 'other'
      catPnl.set(cat, (catPnl.get(cat) || 0) + (p.cashPnl || 0))
    })
    let best = 'N/A'
    let bestVal = -Infinity
    catPnl.forEach((val, cat) => { if (val > bestVal) { bestVal = val; best = cat } })
    return best.charAt(0).toUpperCase() + best.slice(1)
  }, [positions])

  // Category breakdown for Categories tab
  const categoryBreakdown = useMemo(() => {
    const catCount = new Map<string, number>()
    positions.forEach(p => {
      const cat = p.eventSlug?.split('-')[0] || 'other'
      catCount.set(cat, (catCount.get(cat) || 0) + 1)
    })
    const entries = Array.from(catCount.entries())
      .sort((a, b) => b[1] - a[1])
    const maxCount = entries.length > 0 ? entries[0][1] : 1
    return entries.map(([cat, count]) => ({
      name: cat.charAt(0).toUpperCase() + cat.slice(1),
      key: cat,
      count,
      pct: (count / maxCount) * 100,
    }))
  }, [positions])

  const smartScore = calcSmartScore(profile, winRate, positions)
  const badges = getTraderBadges(profile, positions, trades)

  // ---- PnL chart data ----
  const equityCurve = useMemo(() => {
    if (trades.length === 0) return []
    const sorted = trades.slice().reverse()
    const pnlByDate = sorted.reduce<Map<string, number>>((acc, trade) => {
      const date = formatShortDate(trade.timestamp)
      const raw = trade.side === 'SELL' ? trade.size * trade.price : -trade.size * trade.price
      acc.set(date, (acc.get(date) || 0) + raw)
      return acc
    }, new Map())

    const rawCurve = Array.from(pnlByDate.entries()).reduce<{ date: string; value: number }[]>((acc, [date, dailyPnl]) => {
      const prev = acc.length > 0 ? acc[acc.length - 1].value : 0
      acc.push({ date, value: prev + dailyPnl })
      return acc
    }, [])

    if (rawCurve.length === 0) return []
    const realPnl = profile?.pnl ?? 0
    const rawFinal = rawCurve[rawCurve.length - 1].value
    if (rawFinal === 0 || realPnl === 0) {
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

  // ---- Grouped positions by event for Positions section ----
  const activePositions = positions.filter(p => (p.currentValue || 0) > 0 || (p.curPrice || 0) > 0)
  const closedPositions = positions.filter(p => (p.currentValue || 0) === 0 && (p.curPrice || 0) === 0)

  const groupByEvent = (posArr: UserPosition[]) => {
    const groups = new Map<string, { title: string; positions: UserPosition[]; totalValue: number; totalPnl: number; pctPnl: number }>()
    posArr.forEach(p => {
      const key = p.eventSlug || p.title || 'Unknown'
      const title = p.title || key
      if (!groups.has(key)) groups.set(key, { title, positions: [], totalValue: 0, totalPnl: 0, pctPnl: 0 })
      const g = groups.get(key)!
      g.positions.push(p)
      g.totalValue += p.currentValue || 0
      g.totalPnl += p.cashPnl || 0
    })
    groups.forEach(g => {
      g.pctPnl = g.totalValue > 0 ? (g.totalPnl / g.totalValue) * 100 : (g.totalPnl !== 0 ? (g.totalPnl > 0 ? 100 : -100) : 0)
    })
    return Array.from(groups.values())
  }

  const groupedActive = groupByEvent(activePositions)
  const groupedClosed = groupByEvent(closedPositions)

  const toggleExpand = (key: string) => {
    setExpandedPos(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <AppShell
      title={profile?.userName || formatAddress(id)}
      subtitle="Trader Profile"
    >
      <div className="space-y-6">
        {/* Back Button */}
        <div>
          <Link href="/">
            <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground text-xs uppercase tracking-wider rounded-lg">
              <ArrowLeft className="h-4 w-4" />
              Leaderboard
            </Button>
          </Link>
        </div>

        {error && (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <p className="text-destructive text-sm mb-4">{error}</p>
            <Button onClick={fetchTraderData} variant="outline" className="border-border bg-transparent uppercase text-xs tracking-wider rounded-lg">
              Retry
            </Button>
          </div>
        )}

        {/* ===== HEADER ===== */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {isLoading ? (
                <Skeleton className="h-16 w-16 rounded-full" />
              ) : profile?.profileImage ? (
                <div className="h-16 w-16 rounded-full overflow-hidden flex-shrink-0 bg-secondary border-2 border-border">
                  <Image src={profile.profileImage || '/placeholder.svg'} alt={profile.userName || 'Trader'} width={64} height={64} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center bg-secondary text-foreground text-xl font-mono rounded-full flex-shrink-0 border-2 border-border">
                  {(profile?.userName || id.slice(2, 4)).toUpperCase().slice(0, 2)}
                </div>
              )}
              <div>
                {isLoading ? (
                  <Skeleton className="h-7 w-48" />
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                      {profile?.userName || formatAddress(id)}
                    </h2>
                    <a href={`https://polymarket.com/profile/${id}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                )}
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  {formatAddress(id)}
                  <button onClick={copyWallet} className="hover:text-foreground transition-colors">
                    {copied ? <span className="text-[#22c55e] text-[10px] uppercase">Copied</span> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {!isLoading && badges.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {badges.map((b) => (
                      <span key={b.label} className={cn('inline-flex items-center border rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider', b.color)}>
                        {b.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FollowButton traderAddress={id} traderName={profile?.userName} variant="follow" showLogo />
              <Button variant="outline" size="icon" onClick={fetchTraderData} disabled={isLoading} className="border-border bg-transparent h-9 w-9 rounded-lg">
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </div>

        {/* ===== 4 STAT CARDS ===== */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-2">Total Volume</div>
            {isLoading ? <Skeleton className="h-9 w-32" /> : (
              <>
                <div className="text-2xl font-semibold font-mono text-foreground tracking-tight">{formatVolume(profile?.vol || 0)}</div>
                {profile?.rank && <div className="text-[10px] text-muted-foreground mt-1">#{profile.rank} on Polymarket</div>}
              </>
            )}
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-2">{"Total P&L"}</div>
            {isLoading ? <Skeleton className="h-9 w-32" /> : (
              <>
                <div className={cn('text-2xl font-semibold font-mono tracking-tight', (profile?.pnl || 0) >= 0 ? 'text-[#22c55e]' : 'text-destructive')}>
                  {formatPnl(profile?.pnl || 0)}
                </div>
                {profile?.rank && <div className={cn('text-[10px] mt-1', (profile?.pnl || 0) >= 0 ? 'text-[#22c55e]/70' : 'text-destructive/70')}>#{profile.rank} on Polymarket</div>}
              </>
            )}
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-2">Cash on Hand</div>
            {isLoading ? <Skeleton className="h-9 w-32" /> : (
              <div className="text-2xl font-semibold font-mono text-foreground tracking-tight">{formatVolume(cashOnHand)}</div>
            )}
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-2">Portfolio Value</div>
            {isLoading ? <Skeleton className="h-9 w-32" /> : (
              <div className="text-2xl font-semibold font-mono text-foreground tracking-tight">{formatVolume(portfolioValue)}</div>
            )}
          </div>
        </div>

        {/* ===== PNL CHART + PORTFOLIO METRICS ===== */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          {/* PNL Chart */}
          <div className="bg-card border border-border rounded-xl p-5 lg:col-span-3">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-foreground">PNL Chart</h3>
              <span className="inline-flex items-center justify-center h-4 w-4 rounded-full border border-border text-[9px] text-muted-foreground">i</span>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-4">
              Showing PnL on {chartTf === 'ALL' ? 'All Time' : chartTf === '6M' ? '6 Month' : chartTf === '1M' ? '1 Month' : chartTf === '1W' ? '1 Week' : '1 Day'} Timeframe
            </div>
            {isLoading ? (
              <Skeleton className="h-64 w-full rounded-lg" />
            ) : filteredCurve.length > 1 ? (
              <div className="h-64">
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
                      tickFormatter={(v) => Math.abs(v) >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v.toFixed(0)}`}
                      axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                      tickLine={false}
                      orientation="right"
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
                      formatter={(value: number) => [`${value >= 0 ? '+' : ''}$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 'PnL']}
                      labelFormatter={(l) => `Date: ${l}`}
                    />
                    <Area type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2} fill="url(#pnlGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No chart data available</div>
            )}
            {/* Timeframe buttons */}
            <div className="flex gap-2 mt-4">
              {(['1D', '1W', '1M', '6M', 'ALL'] as ChartTimeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setChartTf(tf)}
                  className={cn(
                    'flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider border rounded-lg transition-all',
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

          {/* Portfolio Metrics */}
          <div className="bg-card border border-border rounded-xl p-5 lg:col-span-2 flex flex-col">
            <h3 className="text-base font-semibold text-foreground mb-4">Portfolio Metrics</h3>

            {/* Overall / Categories tabs */}
            <div className="flex border border-border rounded-lg overflow-hidden mb-4">
              <button
                onClick={() => setMetricsTab('overall')}
                className={cn('flex-1 py-2 text-xs font-medium uppercase tracking-wider transition-all', metricsTab === 'overall' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}
              >
                Overall
              </button>
              <button
                onClick={() => setMetricsTab('categories')}
                className={cn('flex-1 py-2 text-xs font-medium uppercase tracking-wider transition-all border-l border-border', metricsTab === 'categories' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}
              >
                Categories
              </button>
            </div>

            {metricsTab === 'overall' ? (
              <>
                {/* Smart Score */}
                <div className="bg-secondary/40 border border-border rounded-lg p-4 mb-4">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Smart Score</div>
                  {isLoading ? <Skeleton className="h-10 w-32" /> : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-semibold font-mono text-[#22c55e]">{smartScore.toFixed(2)}</span>
                        <Image src="/vantake-logo-white.png" alt="Vantake" width={28} height={28} className="h-7 w-7 object-contain opacity-80 ml-auto" />
                      </div>
                      <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-[#22c55e] rounded-full transition-all duration-500" style={{ width: `${smartScore}%` }} />
                      </div>
                    </>
                  )}
                </div>

                {/* Risk Efficiency & Profitability */}
                <div className="space-y-3 mb-3">
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

                <p className="text-[9px] text-muted-foreground/60 mb-4">Scores are adjusted for recency, profit, and experience</p>

                {/* 2x2 metric grid */}
                <div className="grid grid-cols-2 gap-3 mt-auto">
                  <div className="bg-secondary/40 border border-border rounded-lg p-3">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Win Rate</div>
                    {isLoading ? <Skeleton className="h-7 w-16" /> : (
                      <div className="text-xl font-semibold font-mono text-foreground">{winRate.toFixed(1)}%</div>
                    )}
                  </div>
                  <div className="bg-secondary/40 border border-border rounded-lg p-3">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Sharpe Ratio</div>
                    {isLoading ? <Skeleton className="h-7 w-16" /> : (
                      <div className="text-xl font-semibold font-mono text-foreground">{sharpeRatio.toFixed(2)}</div>
                    )}
                  </div>
                  <div className="bg-secondary/40 border border-border rounded-lg p-3">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Sortino Ratio</div>
                    {isLoading ? <Skeleton className="h-7 w-16" /> : (
                      <div className="text-xl font-semibold font-mono text-foreground">{sortinoRatio.toFixed(2)}</div>
                    )}
                  </div>
                  <div className="bg-secondary/40 border border-border rounded-lg p-3">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Best Category</div>
                    {isLoading ? <Skeleton className="h-7 w-16" /> : (
                      <div className="text-xl font-semibold text-[#22c55e] truncate">{bestCategory}</div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* Categories tab */
              <div className="space-y-1 flex-1 overflow-y-auto">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-2 flex-1" />
                      <Skeleton className="h-4 w-6" />
                    </div>
                  ))
                ) : categoryBreakdown.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">No category data</div>
                ) : (
                  categoryBreakdown.map((cat) => (
                    <div key={cat.key} className="flex items-center gap-3 py-2.5 group">
                      <span className="text-sm w-5 text-center text-muted-foreground">{CATEGORY_ICONS[cat.key] || '◎'}</span>
                      <span className="text-xs font-medium text-foreground w-24 truncate">{cat.name}</span>
                      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-[#22c55e] rounded-full transition-all duration-300" style={{ width: `${cat.pct}%` }} />
                      </div>
                      <span className="text-xs font-mono font-semibold text-foreground w-6 text-right">{cat.count}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* ===== POSITIONS SECTION ===== */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-5 pb-0">
            <h3 className="text-base font-semibold text-foreground">Positions</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Trading History</p>
          </div>

          {/* Active Positions / Closed Positions / Activity tabs */}
          <div className="flex items-center gap-1 px-5 pt-4 pb-0">
            {(['active', 'closed', 'activity'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setPositionsTab(tab)}
                className={cn(
                  'px-4 py-2 text-xs font-medium uppercase tracking-wider rounded-lg transition-all',
                  positionsTab === tab
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                )}
              >
                {tab === 'active' ? 'Active Positions' : tab === 'closed' ? 'Closed Positions' : 'Activity'}
              </button>
            ))}
          </div>

          {/* Positions content */}
          <div className="p-5 pt-4">
            {positionsTab === 'active' && (
              <PositionsList
                groups={groupedActive}
                isLoading={isLoading}
                expanded={expandedPos}
                onToggle={toggleExpand}
                emptyText="No active positions"
              />
            )}
            {positionsTab === 'closed' && (
              <PositionsList
                groups={groupedClosed}
                isLoading={isLoading}
                expanded={expandedPos}
                onToggle={toggleExpand}
                emptyText="No closed positions"
              />
            )}
            {positionsTab === 'activity' && (
              <ActivityList trades={trades} isLoading={isLoading} />
            )}
          </div>
        </div>

        <div className="text-center text-[10px] uppercase tracking-widest text-muted-foreground pb-4">
          Live data from Polymarket
        </div>
      </div>
    </AppShell>
  )
}

// ---- Positions List Component ----
function PositionsList({
  groups,
  isLoading,
  expanded,
  onToggle,
  emptyText,
}: {
  groups: { title: string; positions: UserPosition[]; totalValue: number; totalPnl: number; pctPnl: number }[]
  isLoading: boolean
  expanded: Set<string>
  onToggle: (key: string) => void
  emptyText: string
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-border/30">
            <Skeleton className="h-5 w-64" />
            <div className="flex gap-8">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (groups.length === 0) {
    return <div className="py-12 text-center text-muted-foreground text-sm">{emptyText}</div>
  }

  return (
    <div className="divide-y divide-border/30">
      {groups.map((g) => {
        const isOpen = expanded.has(g.title)
        return (
          <div key={g.title}>
            <button
              onClick={() => onToggle(g.title)}
              className="w-full flex items-center justify-between py-3.5 group text-left hover:bg-secondary/20 transition-colors px-2 rounded-lg -mx-2"
            >
              <div className="flex items-center gap-3 min-w-0">
                <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform flex-shrink-0', isOpen && 'rotate-90')} />
                <span className="text-sm text-foreground truncate">{g.title}</span>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">{g.positions.length} {'market'}{g.positions.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-6 flex-shrink-0">
                <div className="text-right">
                  <div className="text-[9px] text-muted-foreground uppercase">Value</div>
                  <div className="text-sm font-mono font-semibold text-foreground">${g.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                </div>
                <div className="text-right min-w-[100px]">
                  <div className="text-[9px] text-muted-foreground uppercase">PnL</div>
                  <div className={cn('text-sm font-mono font-semibold', g.totalPnl >= 0 ? 'text-[#22c55e]' : 'text-destructive')}>
                    {g.totalPnl >= 0 ? '+' : ''}{formatPnl(g.totalPnl)}
                    <span className="text-[10px] text-muted-foreground ml-1">
                      ({g.pctPnl >= 0 ? '+' : ''}{g.pctPnl.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            </button>
            {isOpen && (
              <div className="ml-7 mb-3 bg-secondary/20 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="px-3 py-2 text-left text-[9px] uppercase tracking-widest text-muted-foreground">Outcome</th>
                      <th className="px-3 py-2 text-right text-[9px] uppercase tracking-widest text-muted-foreground">Size</th>
                      <th className="px-3 py-2 text-right text-[9px] uppercase tracking-widest text-muted-foreground">Avg</th>
                      <th className="px-3 py-2 text-right text-[9px] uppercase tracking-widest text-muted-foreground">Current</th>
                      <th className="px-3 py-2 text-right text-[9px] uppercase tracking-widest text-muted-foreground">PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.positions.map((pos, i) => (
                      <tr key={i} className="border-b border-border/20 last:border-0">
                        <td className="px-3 py-2">
                          <span className={cn('text-xs font-medium', pos.outcome?.toLowerCase() === 'yes' ? 'text-[#22c55e]' : 'text-destructive')}>
                            {pos.outcome}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-mono text-foreground">{pos.size?.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-xs font-mono text-muted-foreground">{((pos.avgPrice || 0) * 100).toFixed(1)}c</td>
                        <td className="px-3 py-2 text-right text-xs font-mono text-muted-foreground">{((pos.curPrice || 0) * 100).toFixed(1)}c</td>
                        <td className="px-3 py-2 text-right">
                          <span className={cn('text-xs font-mono', (pos.cashPnl || 0) >= 0 ? 'text-[#22c55e]' : 'text-destructive')}>
                            {formatPnl(pos.cashPnl || 0)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---- Activity List Component ----
function ActivityList({ trades, isLoading }: { trades: UserTrade[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-border/30">
            <Skeleton className="h-5 w-48" />
            <div className="flex gap-4">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (trades.length === 0) {
    return <div className="py-12 text-center text-muted-foreground text-sm">No trade activity</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/30">
            <th className="px-3 py-2 text-left text-[9px] uppercase tracking-widest text-muted-foreground">Time</th>
            <th className="px-3 py-2 text-left text-[9px] uppercase tracking-widest text-muted-foreground">Market</th>
            <th className="px-3 py-2 text-center text-[9px] uppercase tracking-widest text-muted-foreground">Action</th>
            <th className="px-3 py-2 text-right text-[9px] uppercase tracking-widest text-muted-foreground">Size</th>
            <th className="px-3 py-2 text-right text-[9px] uppercase tracking-widest text-muted-foreground">Price</th>
            <th className="px-3 py-2 text-center text-[9px] uppercase tracking-widest text-muted-foreground">Tx</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade, i) => (
            <tr key={`${trade.transactionHash}-${i}`} className="border-b border-border/20 last:border-0 hover:bg-secondary/20 transition-colors">
              <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground">{timeAgo(trade.timestamp)}</td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  {trade.icon && <Image src={trade.icon || '/placeholder.svg'} alt="" width={20} height={20} className="h-5 w-5 rounded" />}
                  <div>
                    <p className="text-sm text-foreground max-w-[220px] truncate">{trade.title}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{trade.outcome}</p>
                  </div>
                </div>
              </td>
              <td className="px-3 py-2.5 text-center">
                <span className={cn('inline-flex border rounded-md px-2 py-0.5 text-[10px] font-medium uppercase', trade.side === 'BUY' ? 'border-[#22c55e]/50 text-[#22c55e]' : 'border-destructive/50 text-destructive')}>
                  {trade.side}
                </span>
              </td>
              <td className="px-3 py-2.5 text-right text-sm font-mono text-foreground">{trade.size?.toFixed(2)}</td>
              <td className="px-3 py-2.5 text-right text-sm font-mono text-muted-foreground">{((trade.price || 0) * 100).toFixed(1)}c</td>
              <td className="px-3 py-2.5 text-center">
                {trade.transactionHash && (
                  <a href={`https://polygonscan.com/tx/${trade.transactionHash}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center p-1 text-muted-foreground hover:text-foreground transition-colors">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
