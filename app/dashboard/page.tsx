'use client'

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Wallet, Copy, ExternalLink, Star, Users } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { SmartScoreBadge } from '@/components/trader/smart-score-badge'
import { getTraderCategories, CategoriesRow } from '@/components/trader/category-badges'
import { CategoryProficiency } from '@/components/trader/category-proficiency'
import { WalletAvatar } from '@/components/trader/wallet-avatar'
import Image from 'next/image'
import {
  type LeaderboardTrader,
  type UserPosition,
  type UserTrade,
  formatPnl,
  formatVolume,
  formatAddress,
  normalizeTimestamp,
  formatShortDate,
  timeAgo,
} from '@/lib/polymarket-api'

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

// Smart Score calculation (same as trader profile)
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

const SLUG_TO_CATEGORY: Record<string, string> = {
  epl: 'Sports', nba: 'Sports', nfl: 'Sports', mlb: 'Sports', nhl: 'Sports',
  ufc: 'Sports', soccer: 'Sports', tennis: 'Sports', f1: 'Sports', mls: 'Sports',
  golf: 'Sports', boxing: 'Sports', cricket: 'Sports', sport: 'Sports', liga: 'Sports',
  ncaa: 'Sports', wnba: 'Sports', rugby: 'Sports', ligue: 'Sports', serie: 'Sports',
  bundesliga: 'Sports', laliga: 'Sports', champions: 'Sports', atp: 'Sports',
  wta: 'Sports', fifa: 'Sports', olympics: 'Sports', nascar: 'Sports',
  lol: 'Sports', csgo: 'Sports', dota: 'Sports', valorant: 'Sports', esports: 'Sports',
  league: 'Sports', overwatch: 'Sports', ipl: 'Sports', pga: 'Sports',
  bitcoin: 'Crypto', btc: 'Crypto', ethereum: 'Crypto', eth: 'Crypto',
  solana: 'Crypto', sol: 'Crypto', crypto: 'Crypto', defi: 'Crypto',
  token: 'Crypto', xrp: 'Crypto', doge: 'Crypto', memecoin: 'Crypto',
  nft: 'Crypto', web3: 'Crypto', stablecoin: 'Crypto', altcoin: 'Crypto',
  trump: 'Politics', biden: 'Politics', election: 'Elections', vote: 'Elections',
  president: 'Politics', congress: 'Politics', senate: 'Politics', governor: 'Politics',
  democrat: 'Politics', republican: 'Politics', gop: 'Politics', primary: 'Elections',
  political: 'Politics', politics: 'Politics', harris: 'Politics', desantis: 'Politics',
  vance: 'Politics', newsom: 'Politics', midterm: 'Elections', ballot: 'Elections',
  ai: 'Tech', apple: 'Tech', google: 'Tech', openai: 'Tech', spacex: 'Tech',
  tesla: 'Tech', meta: 'Tech', microsoft: 'Tech', nvidia: 'Tech', tech: 'Tech',
  twitter: 'Tech', tiktok: 'Tech', amazon: 'Tech', chatgpt: 'Tech', gpt: 'Tech',
  fed: 'Economy', inflation: 'Economy', gdp: 'Economy', rate: 'Economy',
  stock: 'Economy', market: 'Economy', sp500: 'Economy', nasdaq: 'Economy',
  earnings: 'Earnings', revenue: 'Earnings', ipo: 'Earnings',
  dow: 'Economy', treasury: 'Economy', bond: 'Economy', recession: 'Economy',
  war: 'Geopolitics', ukraine: 'Geopolitics', russia: 'Geopolitics', china: 'Geopolitics',
  nato: 'Geopolitics', iran: 'Geopolitics', israel: 'Geopolitics', gaza: 'Geopolitics',
  taiwan: 'Geopolitics', korea: 'Geopolitics', sanctions: 'Geopolitics',
  oscar: 'Pop Culture', emmy: 'Pop Culture', grammy: 'Pop Culture',
  movie: 'Pop Culture', film: 'Pop Culture', celebrity: 'Pop Culture',
  music: 'Pop Culture', superbowl: 'Pop Culture', culture: 'Pop Culture',
  weather: 'World', covid: 'World', climate: 'World', earthquake: 'World',
  who: 'World', un: 'World', world: 'World', pandemic: 'World',
  will: 'World', when: 'World', how: 'World', what: 'World', other: 'World',
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
  const [copied, setCopied] = useState(false)
  const [chartTf, setChartTf] = useState<ChartTimeframe>('ALL')

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user)
      const { data: profileData } = await supabase
        .from('profiles').select('polymarket_wallet').eq('id', user.id).single()
      const { count: fCount } = await supabase
        .from('followed_traders').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
      const { count: tCount } = await supabase
        .from('tracked_wallets').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
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
        fetch(`/api/polymarket/leaderboard?user=${address}&limit=1&timePeriod=ALL`),
        fetch(`/api/polymarket/positions?user=${address}&limit=100&sortBy=CASHPNL&sortDirection=DESC`),
        fetch(`/api/polymarket/trades?user=${address}&limit=500`),
      ])
      if (profileRes.ok) { const d = await profileRes.json(); setProfile(d[0] || null) }
      if (positionsRes.ok) setPositions(await positionsRes.json())
      if (tradesRes.ok) setTrades(await tradesRes.json())
    } catch (err) {
      console.error('Error fetching user data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleConnect = async () => {
    if (!inputAddress || !user) return
    setIsSaving(true)
    await supabase.from('profiles')
      .update({ polymarket_wallet: inputAddress, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    setWalletAddress(inputAddress)
    fetchUserData(inputAddress)
    setIsSaving(false)
  }

  const handleDisconnect = async () => {
    if (!user) return
    await supabase.from('profiles')
      .update({ polymarket_wallet: null, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    setWalletAddress('')
    setProfile(null)
    setPositions([])
    setTrades([])
  }

  const copyWallet = () => {
    navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ---- Derived metrics ----
  const totalPnl = profile?.pnl || 0
  const totalVolume = profile?.vol || 0
  const totalPositionValue = positions.reduce((s, p) => s + (p.currentValue || 0), 0)
  const totalAccountBalance = totalVolume > 0 ? totalPnl + totalPositionValue : totalPositionValue
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
    ? Math.sqrt(dailyReturns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / (dailyReturns.length - 1)) : 1
  const downside = dailyReturns.length > 1
    ? Math.sqrt(dailyReturns.filter(r => r < 0).reduce((s, r) => s + r * r, 0) / Math.max(dailyReturns.filter(r => r < 0).length, 1)) : 1
  const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0
  const sortinoRatio = downside > 0 ? avgReturn / downside : 0
  const riskEfficiency = Math.min(99.99, Math.max(0, 50 + sharpeRatio * 15))
  const profitability = Math.min(99.99, Math.max(0, 50 + totalPnl / Math.max(totalVolume, 1) * 500))
  const smartScore = calcSmartScore(profile, winRate, positions)

  const bestCategory = useMemo(() => {
    const catPnl = new Map<string, number>()
    positions.forEach(p => {
      const rawSlug = p.eventSlug?.split('-')[0]?.toLowerCase() || 'other'
      const categoryName = SLUG_TO_CATEGORY[rawSlug] || rawSlug.charAt(0).toUpperCase() + rawSlug.slice(1)
      catPnl.set(categoryName, (catPnl.get(categoryName) || 0) + (p.cashPnl || 0))
    })
    let best = 'N/A'
    let bestVal = -Infinity
    catPnl.forEach((val, cat) => { if (val > bestVal) { bestVal = val; best = cat } })
    return best
  }, [positions])

  const traderCategories = getTraderCategories({
    pnl: totalPnl, volume: totalVolume, smartScore, winRate,
    rank: Number(profile?.rank) || 999, tradesCount: trades.length,
    positionsCount: positions.length, bestCategory,
  })

  // PnL Equity Curve
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
      return rawCurve.map((p, i) => ({ date: p.date, value: realPnl * ((i + 1) / rawCurve.length) }))
    }
    const scale = realPnl / rawFinal
    return rawCurve.map(p => ({ date: p.date, value: p.value * scale }))
  }, [trades, profile])

  const filteredCurve = filterByTimeframe(equityCurve, chartTf)
  const lastValue = filteredCurve.length > 0 ? filteredCurve[filteredCurve.length - 1].value : 0
  const chartColor = lastValue >= 0 ? '#22c55e' : '#ef4444'

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

        {/* ===== HEADER ===== */}
        <div className="sharp-panel p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {isLoading ? (
                <Skeleton className="h-16 w-16 rounded-full" />
              ) : profile?.profileImage ? (
                <div className="h-16 w-16 rounded-full overflow-hidden flex-shrink-0 border-2 border-border">
                  <Image
                    src={profile.profileImage}
                    alt={profile.userName || 'Trader'}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <WalletAvatar wallet={walletAddress} size={64} className="border-2 border-border" />
              )}
              <div>
                {isLoading ? (
                  <Skeleton className="h-7 w-48" />
                ) : (
                  <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                    {profile?.userName || formatAddress(walletAddress)}
                  </h2>
                )}
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  {formatAddress(walletAddress)}
                  <button onClick={copyWallet} className="hover:text-foreground transition-colors">
                    {copied ? <span className="text-[#22c55e] text-[10px] uppercase">Copied</span> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <a href={`https://polymarket.com/profile/${walletAddress}`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5" />Following {followedCount}</span>
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />Tracking {trackedCount}</span>
                </div>
                {!isLoading && traderCategories.length > 0 && (
                  <div className="mt-3">
                    <CategoriesRow categories={traderCategories} maxVisible={5} size="md" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleDisconnect}
                className="border-border bg-transparent text-xs uppercase tracking-wider"
              >
                Disconnect
              </Button>
            </div>
          </div>
        </div>

        {/* ===== 3 BIG STAT CARDS ===== */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="sharp-panel p-5">
            <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-2">Total Volume</div>
            {isLoading ? <Skeleton className="h-9 w-32" /> : (
              <div className="text-3xl font-semibold font-mono text-foreground tracking-tight">
                {formatVolume(totalVolume)}
              </div>
            )}
          </div>
          <div className="sharp-panel p-5">
            <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-2">Total P&L</div>
            {isLoading ? <Skeleton className="h-9 w-32" /> : (
              <div className={cn('text-3xl font-semibold font-mono tracking-tight', totalPnl >= 0 ? 'text-[#22c55e]' : 'text-destructive')}>
                {formatPnl(totalPnl)}
              </div>
            )}
          </div>
          <div className="sharp-panel p-5">
            <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-2">Account Balance</div>
            {isLoading ? <Skeleton className="h-9 w-32" /> : (
              <div className="text-3xl font-semibold font-mono text-foreground tracking-tight">
                {formatVolume(Math.abs(totalAccountBalance))}
              </div>
            )}
          </div>
        </div>

        {/* ===== PNL CHART + PORTFOLIO METRICS ===== */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          {/* PNL Chart - 3/5 */}
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
                      <linearGradient id="dashPnlGrad" x1="0" y1="0" x2="0" y2="1">
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
                    <Area type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2} fill="url(#dashPnlGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No chart data available</div>
            )}
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

          {/* Portfolio Metrics - 2/5 */}
          <div className="sharp-panel p-5 lg:col-span-2 flex flex-col">
            <h3 className="text-sm font-semibold text-foreground mb-4">Portfolio Metrics</h3>

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
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-6 py-3 text-xs uppercase tracking-wider"
              >
                Positions ({positions.length})
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-6 py-3 text-xs uppercase tracking-wider"
              >
                History ({trades.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="positions" className="p-0">
              <div className="overflow-x-auto">
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
                              {pos.icon && <Image src={pos.icon} alt="" width={20} height={20} className="h-5 w-5" />}
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
              <div className="overflow-x-auto">
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
                              {trade.icon && <Image src={trade.icon} alt="" width={20} height={20} className="h-5 w-5" />}
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
