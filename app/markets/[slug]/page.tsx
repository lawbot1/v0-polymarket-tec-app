'use client'

import { use, useMemo, useState } from 'react'
import useSWR from 'swr'
import Image from 'next/image'
import Link from 'next/link'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatVolume } from '@/lib/polymarket-api'
import {
  ArrowLeft,
  Clock,
  DollarSign,
  ExternalLink,
  Loader2,
  RefreshCw,
  TrendingUp,
  BarChart3,
  Users,
  Activity,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

interface Market {
  id: string
  question: string
  slug?: string
  outcomePrices: string
  volume: string
  volumeNum?: number
  liquidity: string
  liquidityNum?: number
  active: boolean
  closed: boolean
  oneDayPriceChange?: number
  bestBid?: number
  bestAsk?: number
  clobTokenIds?: string
  image?: string
  icon?: string
  description?: string
}

interface EventData {
  id: string
  slug: string
  title: string
  description?: string
  category?: string
  image?: string
  icon?: string
  active: boolean
  closed: boolean
  volume: number
  volume24hr?: number
  liquidity: number
  startDate?: string
  endDate?: string
  markets: Market[]
  tags?: { id: string; label: string; slug: string }[]
}

type ChartTimeframe = '1D' | '1W' | '1M' | '3M' | 'ALL'

const timeframes: ChartTimeframe[] = ['1D', '1W', '1M', '3M', 'ALL']

function getIntervalAndFidelity(tf: ChartTimeframe): { interval: string; fidelity: string } {
  switch (tf) {
    case '1D': return { interval: '1d', fidelity: '5' }
    case '1W': return { interval: '1w', fidelity: '60' }
    case '1M': return { interval: '1m', fidelity: '360' }
    case '3M': return { interval: '3m', fidelity: '720' }
    case 'ALL': return { interval: 'all', fidelity: '1440' }
  }
}

function parsePrice(market: Market, index: number): number {
  try {
    const parsed = JSON.parse(market.outcomePrices)
    return parseFloat(parsed[index]) || 0.5
  } catch {
    return 0.5
  }
}

function MarketCard({ market, index }: { market: Market; index: number }) {
  const yesPrice = parsePrice(market, 0)
  const noPrice = parsePrice(market, 1)
  const volume = market.volumeNum || parseFloat(market.volume) || 0
  const liquidity = market.liquidityNum || parseFloat(market.liquidity) || 0

  return (
    <div className="sharp-panel p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-medium text-foreground leading-relaxed flex-1">
          {market.question}
        </h3>
        {market.closed && (
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 border border-destructive/30 text-destructive rounded-md">
            Closed
          </span>
        )}
      </div>

      {/* Price bars */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Yes</span>
          <span className="text-sm font-mono font-medium text-success">
            {(yesPrice * 100).toFixed(1)}c
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-success rounded-full transition-all duration-500"
            style={{ width: `${yesPrice * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">No</span>
          <span className="text-sm font-mono font-medium text-destructive">
            {(noPrice * 100).toFixed(1)}c
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-destructive rounded-full transition-all duration-500"
            style={{ width: `${noPrice * 100}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
          <DollarSign className="h-3 w-3" />
          {formatVolume(volume)} vol
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
          <Activity className="h-3 w-3" />
          {formatVolume(liquidity)} liq
        </div>
        {market.oneDayPriceChange !== undefined && market.oneDayPriceChange !== 0 && (
          <div className={cn(
            'text-[10px] font-mono',
            market.oneDayPriceChange > 0 ? 'text-success' : 'text-destructive'
          )}>
            {market.oneDayPriceChange > 0 ? '+' : ''}
            {(market.oneDayPriceChange * 100).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  )
}

function PriceChart({ tokenId }: { tokenId: string }) {
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('1W')
  const { interval, fidelity } = getIntervalAndFidelity(timeframe)

  const { data: priceHistory, isLoading } = useSWR(
    tokenId ? `/api/polymarket/prices-history?token_id=${tokenId}&interval=${interval}&fidelity=${fidelity}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  const chartData = useMemo(() => {
    if (!priceHistory?.history) return []
    return priceHistory.history.map((p: { t: number; p: number }) => ({
      time: new Date(p.t * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: +(p.p * 100).toFixed(1),
    }))
  }, [priceHistory])

  const priceChange = chartData.length >= 2
    ? chartData[chartData.length - 1].price - chartData[0].price
    : 0

  return (
    <div className="sharp-panel p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Price History</span>
        </div>
        <div className="flex items-center gap-1">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                'px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors rounded-md',
                timeframe === tf
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-[200px] flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : chartData.length > 0 ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-medium text-foreground">
              {chartData[chartData.length - 1].price.toFixed(1)}c
            </span>
            {priceChange !== 0 && (
              <span className={cn(
                'text-xs font-mono',
                priceChange > 0 ? 'text-success' : 'text-destructive'
              )}>
                {priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}c
              </span>
            )}
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={priceChange >= 0 ? '#22c55e' : '#ef4444'} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={priceChange >= 0 ? '#22c55e' : '#ef4444'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#666' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#666' }}
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => `${v}c`}
                  width={40}
                />
                <RechartsTooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                  formatter={(value: number) => [`${value}c`, 'Price']}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={priceChange >= 0 ? '#22c55e' : '#ef4444'}
                  strokeWidth={2}
                  fill="url(#priceGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">
          No price data available
        </div>
      )}
    </div>
  )
}

export default function MarketDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)

  const { data: event, error, isLoading, mutate } = useSWR<EventData>(
    `/api/polymarket/events/${slug}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  const eventImage = event?.image || event?.icon
  const mainMarket = event?.markets?.[0]
  const totalVolume = event?.volume || 0
  const totalLiquidity = event?.liquidity || 0
  const category = event?.category || event?.tags?.[0]?.label || 'Other'

  // Get token ID for chart from first market
  const tokenId = useMemo(() => {
    if (!mainMarket?.clobTokenIds) return null
    try {
      const ids = JSON.parse(mainMarket.clobTokenIds)
      return ids[0] || null
    } catch {
      return null
    }
  }, [mainMarket])

  const endDate = event?.endDate ? new Date(event.endDate) : null
  const daysUntilEnd = endDate
    ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  // Loading State
  if (isLoading) {
    return (
      <AppShell title="Market" subtitle="Loading...">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </AppShell>
    )
  }

  // Error State
  if (error || !event) {
    return (
      <AppShell title="Market" subtitle="Error">
        <div className="max-w-4xl mx-auto">
          <div className="sharp-panel p-8 text-center space-y-4">
            <div className="text-destructive text-sm">Failed to load market data</div>
            <div className="flex items-center justify-center gap-3">
              <Link href="/markets">
                <Button variant="outline" size="sm" className="text-xs uppercase tracking-wider">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Markets
                </Button>
              </Link>
              <Button onClick={() => mutate()} variant="outline" size="sm" className="text-xs uppercase tracking-wider">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Market" subtitle={category}>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Back button */}
        <Link href="/markets" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Markets
        </Link>

        {/* Header */}
        <div className="sharp-panel p-5">
          <div className="flex items-start gap-4">
            {eventImage && (
              <div className="h-16 w-16 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
                <Image
                  src={eventImage}
                  alt={event.title}
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center border border-border rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {category}
                </span>
                {event.active && !event.closed && (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                    Active
                  </span>
                )}
                {event.closed && (
                  <span className="text-[10px] uppercase tracking-wider text-destructive">Closed</span>
                )}
              </div>
              <h1 className="mt-2 text-lg font-medium text-foreground text-balance leading-relaxed">
                {event.title}
              </h1>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-4">
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Volume</span>
              <span className="text-sm font-mono text-foreground">{formatVolume(totalVolume)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Liquidity</span>
              <span className="text-sm font-mono text-foreground">{formatVolume(totalLiquidity)}</span>
            </div>
            {event.volume24hr && event.volume24hr > 0 && (
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-success" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">24h Vol</span>
                <span className="text-sm font-mono text-success">{formatVolume(event.volume24hr)}</span>
              </div>
            )}
            {daysUntilEnd !== null && daysUntilEnd > 0 && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Ends in</span>
                <span className="text-sm font-mono text-foreground">{daysUntilEnd}d</span>
              </div>
            )}
            {event.markets?.length > 1 && (
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Markets</span>
                <span className="text-sm font-mono text-foreground">{event.markets.length}</span>
              </div>
            )}
            {/* Polymarket link */}
            <a
              href={`https://polymarket.com/event/${event.slug || event.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              Polymarket <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Price Chart */}
        {tokenId && <PriceChart tokenId={tokenId} />}

        {/* Description */}
        {event.description && (
          <div className="sharp-panel p-5">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">Description</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {event.description}
            </p>
          </div>
        )}

        {/* Markets */}
        <div>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3 flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5" />
            {event.markets?.length === 1 ? 'Market' : `Markets (${event.markets?.length || 0})`}
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {event.markets?.map((market, i) => (
              <MarketCard key={market.id} market={market} index={i} />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
