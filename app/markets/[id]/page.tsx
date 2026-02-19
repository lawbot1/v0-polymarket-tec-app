'use client'

import { use } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { AppShell } from '@/components/layout/app-shell'
import {
  type PolymarketMarket,
  parseOutcomePrices,
  parseClobTokenIds,
  formatVolume,
  formatAddress,
  timeAgo,
  formatDate,
  formatShortDate,
} from '@/lib/polymarket-api'
import { cn } from '@/lib/utils'
import { Clock, TrendingUp, DollarSign, Users, ExternalLink, Loader2, RefreshCw, BarChart3 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface MarketPageProps {
  params: Promise<{ id: string }>
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export default function MarketDetailPage({ params }: MarketPageProps) {
  const { id } = use(params)

  // Fetch market data
  const { data: markets, error, isLoading, mutate } = useSWR<PolymarketMarket[]>(
    `/api/polymarket/markets?slug=${id}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  // Also try fetching by ID if slug doesn't work
  const { data: marketsByCondition } = useSWR<PolymarketMarket[]>(
    markets?.length === 0 ? `/api/polymarket/markets?condition_ids=${id}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const market = markets?.[0] || marketsByCondition?.[0]

  // Loading state
  if (isLoading) {
    return (
      <AppShell title="Loading Market...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading market data...</span>
        </div>
      </AppShell>
    )
  }

  // Error state
  if (error) {
    return (
      <AppShell title="Error">
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-destructive">Failed to load market</p>
          <Button onClick={() => mutate()} className="mt-4" variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </AppShell>
    )
  }

  // Not found
  if (!market) {
    return (
      <AppShell title="Market Not Found">
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground">Market not found</p>
          <Link href="/markets">
            <Button className="mt-4 bg-transparent" variant="outline" size="sm">
              Back to Markets
            </Button>
          </Link>
        </div>
      </AppShell>
    )
  }

  const prices = parseOutcomePrices(market)
  const yesPrice = prices[0] ?? 0.5
  const noPrice = prices[1] ?? 1 - yesPrice

  const volume = market.volumeNum || parseFloat(market.volume || '0')
  const liquidity = market.liquidityNum || parseFloat(market.liquidity || '0')
  const openInterest = market.openInterest || 0

  const endDate = market.endDate ? new Date(market.endDate) : null
  const daysUntilEnd = endDate
    ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const category = market.category || market.tags?.[0]?.label || 'Other'

  // Mock price history data (since price history requires token IDs)
  const priceHistory = Array.from({ length: 30 }, (_, i) => {
    const basePrice = yesPrice
    const variance = (Math.random() - 0.5) * 0.2
    return {
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: Math.max(0.01, Math.min(0.99, basePrice + variance * (1 - i / 30))),
    }
  })

  // Mock recent trades based on market data
  const recentTrades = Array.from({ length: 8 }, (_, i) => ({
    id: `trade-${i}`,
    wallet: `0x${Math.random().toString(16).slice(2, 8)}...${Math.random().toString(16).slice(2, 6)}`,
    side: Math.random() > 0.5 ? 'YES' : 'NO',
    size: Math.round(Math.random() * (volume / 100) + 1000),
    price: Math.round((0.2 + Math.random() * 0.6) * 100) / 100,
    timestamp: new Date(Date.now() - i * Math.random() * 3600000).toISOString(),
  }))

  return (
    <AppShell title="Market Details" subtitle={category}>
      <div className="space-y-6">
        {/* Market Header */}
        <div className="sharp-panel  p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge variant="secondary">{category}</Badge>
                {market.closed && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Closed
                  </Badge>
                )}
                {market.negRisk && (
                  <Badge variant="outline" className="text-chart-3">
                    Neg Risk
                  </Badge>
                )}
              </div>
              <h2 className="text-xl font-bold text-foreground leading-relaxed">
                {market.question}
              </h2>
              {market.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                  {market.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {daysUntilEnd !== null && daysUntilEnd > 0 && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {daysUntilEnd} days left
                </div>
              )}
              <a
                href={`https://polymarket.com/event/${market.slug || market.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <Button onClick={() => mutate()} variant="ghost" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Price Display */}
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="sharp-panel  p-4 text-center">
              <div className="text-sm text-muted-foreground">YES Price</div>
              <div className="mt-1 text-3xl font-bold text-primary">
                {(yesPrice * 100).toFixed(1)}c
              </div>
              {market.oneDayPriceChange !== undefined && market.oneDayPriceChange !== 0 && (
                <div
                  className={cn(
                    'mt-1 text-xs',
                    market.oneDayPriceChange > 0 ? 'text-primary' : 'text-destructive'
                  )}
                >
                  {market.oneDayPriceChange > 0 ? '+' : ''}
                  {(market.oneDayPriceChange * 100).toFixed(1)}% 24h
                </div>
              )}
            </div>
            <div className="sharp-panel  p-4 text-center">
              <div className="text-sm text-muted-foreground">NO Price</div>
              <div className="mt-1 text-3xl font-bold text-destructive">
                {(noPrice * 100).toFixed(1)}c
              </div>
            </div>
            <div className="sharp-panel  p-4 text-center">
              <div className="text-sm text-muted-foreground">Volume</div>
              <div className="mt-1 text-2xl font-bold text-foreground">
                {formatVolume(volume)}
              </div>
              {market.volume24hr !== undefined && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatVolume(market.volume24hr)} 24h
                </div>
              )}
            </div>
            <div className="sharp-panel  p-4 text-center">
              <div className="text-sm text-muted-foreground">Liquidity</div>
              <div className="mt-1 text-2xl font-bold text-foreground">
                {formatVolume(liquidity)}
              </div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="mt-6 flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Open Interest: {formatVolume(openInterest)}
            </div>
            {market.bestBid !== undefined && market.bestAsk !== undefined && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Spread: {((market.bestAsk - market.bestBid) * 100).toFixed(1)}c
              </div>
            )}
            {market.spread !== undefined && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <BarChart3 className="h-4 w-4" />
                Spread: {(market.spread * 100).toFixed(1)}%
              </div>
            )}
            {market.resolutionSource && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                Source: {market.resolutionSource}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Price Chart */}
          <div className="sharp-panel  p-4">
            <h3 className="mb-4 text-sm font-medium text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Price History (YES)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <YAxis
                    domain={[0, 1]}
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}c`}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${(value * 100).toFixed(1)}c`, 'Price']}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Large Trades */}
          <div className="sharp-panel  p-4">
            <h3 className="mb-4 text-sm font-medium text-foreground">Recent Large Trades</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {recentTrades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between  bg-secondary/30 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'inline-flex rounded px-2 py-0.5 text-xs font-medium',
                        trade.side === 'YES'
                          ? 'bg-primary/20 text-primary'
                          : 'bg-destructive/20 text-destructive'
                      )}
                    >
                      {trade.side}
                    </span>
                    <div>
                      <div className="font-mono text-sm text-foreground">{trade.wallet}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatVolume(trade.size)} @ {(trade.price * 100).toFixed(1)}c
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{timeAgo(trade.timestamp)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Market Metadata */}
        <div className="sharp-panel  p-4">
          <h3 className="mb-4 text-sm font-medium text-foreground">Market Information</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-xs text-muted-foreground">Condition ID</div>
              <div className="mt-1 font-mono text-xs text-foreground truncate">
                {market.conditionId || 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Market ID</div>
              <div className="mt-1 font-mono text-xs text-foreground truncate">
                {market.id}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Start Date</div>
              <div className="mt-1 text-sm text-foreground">
                {market.startDate ? formatDate(market.startDate) : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">End Date</div>
              <div className="mt-1 text-sm text-foreground">
                {market.endDate ? formatDate(market.endDate) : 'N/A'}
              </div>
            </div>
            {market.makerBaseFee !== undefined && (
              <div>
                <div className="text-xs text-muted-foreground">Maker Fee</div>
                <div className="mt-1 text-sm text-foreground">
                  {(market.makerBaseFee / 100).toFixed(2)}%
                </div>
              </div>
            )}
            {market.takerBaseFee !== undefined && (
              <div>
                <div className="text-xs text-muted-foreground">Taker Fee</div>
                <div className="mt-1 text-sm text-foreground">
                  {(market.takerBaseFee / 100).toFixed(2)}%
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        {market.tags && market.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {market.tags.map((tag) => (
              <Badge key={tag.id} variant="secondary" className="text-xs">
                {tag.label}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
