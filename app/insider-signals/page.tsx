'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  type UserTrade,
  type LeaderboardTrader,
  formatVolume,
  timeAgo,
  normalizeTimestamp,
} from '@/lib/polymarket-api'
import { cn } from '@/lib/utils'
import {
  Zap,
  AlertTriangle,
  TrendingUp,
  Filter,
  ChevronDown,
  ExternalLink,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

type SignalEntry = UserTrade & {
  traderPnl: number
  traderRank?: number
  traderProfileImage?: string
  traderName?: string
  confidence: 'High' | 'Medium' | 'Low'
  isWhale: boolean
}

const sortOptions = ['Recent', 'Size', 'Confidence'] as const
type SortOption = (typeof sortOptions)[number]

function ConfidenceBadge({ confidence }: { confidence: 'High' | 'Medium' | 'Low' }) {
  const styles = {
    High: 'bg-primary/20 text-primary border-primary/30',
    Medium: 'bg-chart-3/20 text-chart-3 border-chart-3/30',
    Low: 'bg-muted text-muted-foreground border-border',
  }

  return (
    <span className={cn('inline-flex items-center gap-1  border px-2 py-0.5 text-xs font-medium', styles[confidence])}>
      {confidence === 'High' && <Sparkles className="h-3 w-3" />}
      {confidence}
    </span>
  )
}

function SignalCard({ signal }: { signal: SignalEntry }) {
  return (
    <div className="sharp-panel  p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {signal.traderProfileImage ? (
            <Image
              src={signal.traderProfileImage || "/placeholder.svg"}
              alt={signal.traderName || 'Trader'}
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full',
                signal.isWhale
                  ? 'bg-chart-3/20 text-chart-3'
                  : 'bg-primary/20 text-primary'
              )}
            >
              {signal.isWhale ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <Zap className="h-5 w-5" />
              )}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <Link
                href={`/trader/${signal.proxyWallet}`}
                className="font-medium text-sm text-foreground hover:text-primary transition-colors"
              >
                {signal.traderName || `${signal.proxyWallet?.slice(0, 6)}...${signal.proxyWallet?.slice(-4)}`}
              </Link>
              {signal.isWhale && (
                <Badge variant="outline" className="text-xs border-chart-3/30 text-chart-3">
                  Whale
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">{timeAgo(signal.timestamp)}</div>
          </div>
        </div>
        <ConfidenceBadge confidence={signal.confidence} />
      </div>

      <div className="mt-4">
        <Link
          href={`/markets/${signal.conditionId}`}
          className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
        >
          {signal.icon && (
            <Image
              src={signal.icon || "/placeholder.svg"}
              alt=""
              width={20}
              height={20}
              className="h-5 w-5 rounded"
            />
          )}
          <span className="line-clamp-2">{signal.title}</span>
        </Link>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Side</div>
            <span
              className={cn(
                'inline-flex rounded px-2 py-0.5 text-xs font-medium',
                signal.side === 'BUY'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-destructive/20 text-destructive'
              )}
            >
              {signal.side} {signal.outcome}
            </span>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Price</div>
            <div className="text-sm font-medium text-foreground">
              {((signal.price || 0) * 100).toFixed(1)}c
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Size</div>
            <div className="text-sm font-medium text-foreground">
              {formatVolume(signal.size * signal.price)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {signal.traderRank && signal.traderRank <= 100 && (
            <Badge variant="secondary" className="text-xs">
              #{signal.traderRank}
            </Badge>
          )}
          <a
            href={`https://polymarket.com/event/${signal.conditionId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  )
}

export default function InsiderSignalsPage() {
  const [signals, setSignals] = useState<SignalEntry[]>([])
  const [topTraders, setTopTraders] = useState<LeaderboardTrader[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortOption>('Recent')
  const [minSize, setMinSize] = useState('')
  const [whalesOnly, setWhalesOnly] = useState(false)
  const [confidenceFilter, setConfidenceFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All')

  const fetchSignals = async () => {
    setIsLoading(true)
    try {
      // Fetch top traders first
      const leaderboardRes = await fetch('/api/polymarket/leaderboard?window=day&limit=50')
      let traders: LeaderboardTrader[] = []
      if (leaderboardRes.ok) {
        traders = await leaderboardRes.json()
        setTopTraders(traders)
      }

      // Fetch recent trades from top traders
      const allSignals: SignalEntry[] = []

      // Fetch trades from top 10 traders in parallel
      const tradePromises = traders.slice(0, 10).map(async (trader) => {
        try {
          const tradesRes = await fetch(`/api/polymarket/trades?user=${trader.proxyWallet}&limit=5`)
          if (tradesRes.ok) {
            const trades: UserTrade[] = await tradesRes.json()
            return trades.map(trade => {
              const tradeValue = trade.size * trade.price
              const confidence: 'High' | 'Medium' | 'Low' = 
                trader.rank && trader.rank <= 10 && tradeValue >= 1000 ? 'High' :
                trader.rank && trader.rank <= 50 && tradeValue >= 500 ? 'Medium' : 'Low'
              
              return {
                ...trade,
                traderPnl: trader.pnl || 0,
                traderRank: trader.rank,
                traderProfileImage: trader.profileImage,
                traderName: trader.userName,
                confidence,
                isWhale: tradeValue >= 5000,
              }
            })
          }
          return []
        } catch {
          return []
        }
      })

      const tradeResults = await Promise.all(tradePromises)
      tradeResults.forEach(trades => {
        allSignals.push(...trades)
      })

// Sort by timestamp (newest first)
    allSignals.sort((a, b) => normalizeTimestamp(b.timestamp) - normalizeTimestamp(a.timestamp))
      
      setSignals(allSignals)
    } catch (err) {
      console.error('Error fetching signals:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSignals()
  }, [])

  const filteredSignals = useMemo(() => {
    let result = [...signals]

    // Filter by confidence
    if (confidenceFilter !== 'All') {
      result = result.filter((s) => s.confidence === confidenceFilter)
    }

    // Filter by min size
    if (minSize) {
      const min = Number.parseFloat(minSize)
      if (!Number.isNaN(min)) {
        result = result.filter((s) => s.size * s.price >= min)
      }
    }

    // Filter whales only
    if (whalesOnly) {
      result = result.filter((s) => s.isWhale)
    }

    // Sort
    if (sortBy === 'Size') {
      result.sort((a, b) => (b.size * b.price) - (a.size * a.price))
    } else if (sortBy === 'Confidence') {
      const confidenceOrder = { High: 0, Medium: 1, Low: 2 }
      result.sort((a, b) => confidenceOrder[a.confidence] - confidenceOrder[b.confidence])
    }

    return result
  }, [signals, confidenceFilter, minSize, whalesOnly, sortBy])

  const highConfidenceCount = signals.filter((s) => s.confidence === 'High').length
  const whaleCount = signals.filter((s) => s.isWhale).length
  const totalVolume = signals.reduce((acc, s) => acc + s.size * s.price, 0)

  return (
    <AppShell title="Insider Signals" subtitle="Real-time trades from top Polymarket traders">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="sharp-panel  p-4">
            <div className="flex items-center gap-2 text-primary">
              <img
                src="/icon-lightning.png"
                alt="Total Signals"
                className="h-12 w-12 object-contain"
                style={{ filter: 'invert(1)', mixBlendMode: 'screen' }}
              />
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <span className="text-2xl font-bold">{signals.length}</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Total Signals</div>
          </div>
          <div className="sharp-panel  p-4">
            <div className="flex items-center gap-2 text-primary">
              <img
                src="/icon-checkmark.png"
                alt="High Confidence"
                className="h-12 w-12 object-contain"
                style={{ filter: 'invert(1)', mixBlendMode: 'screen' }}
              />
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <span className="text-2xl font-bold">{highConfidenceCount}</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">High Confidence</div>
          </div>
          <div className="sharp-panel  p-4">
            <div className="flex items-center gap-2 text-chart-3">
              <img
                src="/icon-whale.png"
                alt="Whale Trades"
                className="h-12 w-12 object-contain"
                style={{ filter: 'invert(1)', mixBlendMode: 'screen' }}
              />
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <span className="text-2xl font-bold">{whaleCount}</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Whale Trades</div>
          </div>
          <div className="sharp-panel  p-4">
            <div className="flex items-center gap-2 text-foreground">
              <img
                src="/icon-volume.png"
                alt="Total Volume"
                className="h-12 w-12 object-contain"
                style={{ filter: 'invert(1)', mixBlendMode: 'screen' }}
              />
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <span className="text-2xl font-bold">{formatVolume(totalVolume)}</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Total Volume</div>
          </div>
        </div>

        {/* Filters */}
        <div className="sharp-panel  p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span className="text-sm">Filters:</span>
            </div>

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 bg-transparent border-border">
                  Sort: {sortBy}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-card border-border">
                {sortOptions.map((option) => (
                  <DropdownMenuItem
                    key={option}
                    onClick={() => setSortBy(option)}
                    className={cn(sortBy === option && 'bg-primary/10 text-primary')}
                  >
                    {option}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Confidence */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 bg-transparent border-border">
                  Confidence: {confidenceFilter}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-card border-border">
                {(['All', 'High', 'Medium', 'Low'] as const).map((level) => (
                  <DropdownMenuItem
                    key={level}
                    onClick={() => setConfidenceFilter(level)}
                    className={cn(confidenceFilter === level && 'bg-primary/10 text-primary')}
                  >
                    {level}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Min Size */}
            <Input
              type="number"
              placeholder="Min size ($)"
              value={minSize}
              onChange={(e) => setMinSize(e.target.value)}
              className="w-32 bg-secondary border-border text-sm"
            />

            {/* Whales Only */}
            <div className="flex items-center gap-2">
              <Switch
                id="whales-only"
                checked={whalesOnly}
                onCheckedChange={setWhalesOnly}
              />
              <Label htmlFor="whales-only" className="text-sm text-muted-foreground">
                Whales only
              </Label>
            </div>

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSignals}
              disabled={isLoading}
              className="gap-2 bg-transparent border-border ml-auto"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Signals Feed */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="sharp-panel  p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 " />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="mt-4 h-10 w-full" />
                <div className="mt-4 flex gap-4">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredSignals.length === 0 ? (
          <div className="sharp-panel  p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center  bg-muted">
              <Zap className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-foreground">No signals found</h3>
            <p className="mt-2 text-muted-foreground">
              Try adjusting your filters or refresh to see more signals.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSignals.map((signal, i) => (
              <SignalCard key={`${signal.transactionHash}-${i}`} signal={signal} />
            ))}
          </div>
        )}

        {/* Data Source */}
        <div className="text-center text-xs text-muted-foreground">
          Real-time data from top {topTraders.length} Polymarket traders
        </div>
      </div>
    </AppShell>
  )
}
