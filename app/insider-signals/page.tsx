'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import Image from 'next/image'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { WalletAvatar } from '@/components/trader/wallet-avatar'
import {
  type UserTrade,
  type LeaderboardTrader,
  formatVolume,
  formatAddress,
  timeAgo,
  normalizeTimestamp,
} from '@/lib/polymarket-api'
import { cn } from '@/lib/utils'
import {
  Zap,
  Filter,
  ChevronDown,
  Sparkles,
  RefreshCw,
  Users,
  ExternalLink,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

// ---- Types ----
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

// ---- Category mapping (same as trader profile) ----
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
  robot: 'Tech', android: 'Tech', iphone: 'Tech', chip: 'Tech', semiconductor: 'Tech',
  fed: 'Economy', inflation: 'Economy', gdp: 'Economy', interest: 'Economy',
  stock: 'Economy', sp500: 'Economy', nasdaq: 'Economy',
  earnings: 'Earnings', revenue: 'Earnings', ipo: 'Earnings',
  dow: 'Economy', treasury: 'Economy', bond: 'Economy', recession: 'Economy',
  jobs: 'Economy', unemployment: 'Economy', cpi: 'Economy', forex: 'Economy',
  war: 'Geopolitics', ukraine: 'Geopolitics', russia: 'Geopolitics', china: 'Geopolitics',
  nato: 'Geopolitics', iran: 'Geopolitics', israel: 'Geopolitics', gaza: 'Geopolitics',
  taiwan: 'Geopolitics', korea: 'Geopolitics', sanctions: 'Geopolitics',
  india: 'Geopolitics', syria: 'Geopolitics', eu: 'Geopolitics', brexit: 'Geopolitics',
  oscar: 'Culture', emmy: 'Culture', grammy: 'Culture',
  movie: 'Culture', film: 'Culture', celebrity: 'Culture',
  music: 'Culture', superbowl: 'Culture', culture: 'Culture',
  kanye: 'Culture', taylor: 'Culture', drake: 'Culture', netflix: 'Culture',
  disney: 'Culture', youtube: 'Culture', twitch: 'Culture',
  weather: 'World', covid: 'World', climate: 'World', earthquake: 'World',
  who: 'World', un: 'World', world: 'World', pandemic: 'World', hurricane: 'World',
}

const CATEGORIES = ['All', 'Sports', 'Crypto', 'Politics', 'Elections', 'Tech', 'Economy', 'Earnings', 'Geopolitics', 'Culture', 'World'] as const
type CategoryFilter = (typeof CATEGORIES)[number]

function getTradeCategory(signal: SignalEntry): string {
  // Check all words in slug AND title for category matches
  const text = `${signal.eventSlug || ''} ${signal.title || ''}`.toLowerCase()
  const words = text.split(/[-_\s,.'":!?()]+/).filter(Boolean)

  // Weighted category matching: count how many keywords match each category
  const categoryWeight: Record<string, number> = {}
  for (const word of words) {
    const cat = SLUG_TO_CATEGORY[word]
    if (cat) {
      categoryWeight[cat] = (categoryWeight[cat] || 0) + 1
    }
  }

  // Remove generic "World" matches from filler words (will, when, how, what, other)
  // if any real category was also found
  const realCategories = Object.keys(categoryWeight).filter(c => c !== 'World')
  if (realCategories.length > 0) {
    delete categoryWeight['World']
  }

  // Pick category with highest weight; on tie, use specificity priority
  const priorityOrder = ['Elections', 'Politics', 'Geopolitics', 'Earnings', 'Sports', 'Crypto', 'Tech', 'Economy', 'Culture', 'World']

  let best = 'World'
  let bestWeight = 0
  let bestPriority = priorityOrder.length

  for (const [cat, weight] of Object.entries(categoryWeight)) {
    const pri = priorityOrder.indexOf(cat)
    if (weight > bestWeight || (weight === bestWeight && pri < bestPriority)) {
      best = cat
      bestWeight = weight
      bestPriority = pri
    }
  }

  return best
}

// ---- Signal card (matches wallet-tracker Feed style) ----
function SignalCard({ signal }: { signal: SignalEntry }) {
  const outcomeText = signal.outcome || (signal.side === 'BUY' ? 'Yes' : 'No')
  const outcomeLower = outcomeText.toLowerCase()

  const badgeColor = outcomeLower === 'yes'
    ? 'bg-[#22c55e]/20 text-[#22c55e]'
    : outcomeLower === 'no'
      ? 'bg-red-500/20 text-red-500'
      : 'bg-yellow-500/20 text-yellow-500'

  const ts = signal.timestamp < 1e12 ? signal.timestamp * 1000 : signal.timestamp

  const rawName = signal.traderName || signal.proxyWallet || ''
  const displayName = rawName.length > 18 && rawName.startsWith('0x')
    ? formatAddress(rawName)
    : rawName

  const category = getTradeCategory(signal)

  return (
    <div className="sharp-panel p-4 hover:border-primary/30 transition-colors">
      {/* Trader + time */}
      <div className="flex items-center justify-between mb-3">
        <Link href={`/trader/${signal.proxyWallet}`} className="flex items-center gap-2 group min-w-0">
          {signal.traderProfileImage ? (
            <Image
              src={signal.traderProfileImage}
              alt={displayName}
              width={28}
              height={28}
              className="h-7 w-7 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <WalletAvatar wallet={signal.proxyWallet || ''} size={28} />
          )}
          <span className="text-sm font-medium text-foreground group-hover:underline truncate">{displayName}</span>
          {signal.isWhale && (
            <Badge variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-500 flex-shrink-0">
              Whale
            </Badge>
          )}
        </Link>
        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">{timeAgo(signal.timestamp)}</span>
      </div>

      {/* Market title + outcome badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <a
          href={signal.eventSlug ? `https://polymarket.com/event/${signal.eventSlug}` : `https://polymarket.com`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-foreground leading-snug hover:underline line-clamp-2"
        >
          {signal.title || 'Unknown Market'}
        </a>
        <span className={cn(
          'flex-shrink-0 inline-flex px-2.5 py-0.5 rounded text-xs font-semibold',
          badgeColor
        )}>
          {outcomeText}
        </span>
      </div>

      {/* Trade details */}
      <div className="space-y-1.5 border-t border-border pt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Date & Time</span>
          <span className="text-foreground tabular-nums">
            {new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Amount</span>
          <span className="text-foreground font-semibold tabular-nums">
            ${signal.size * signal.price >= 1000
              ? ((signal.size * signal.price) / 1000).toFixed(1) + 'k'
              : (signal.size * signal.price).toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Entry Price</span>
          <span className="text-foreground font-semibold tabular-nums">
            {((signal.price || 0) * 100).toFixed(1)}c
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Category</span>
          <span className="text-foreground font-medium">{category}</span>
        </div>
        <div className="pt-2 mt-2 border-t border-border">
          <a
            href={signal.eventSlug ? `https://polymarket.com/event/${signal.eventSlug}` : `https://polymarket.com`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            View on Polymarket
          </a>
        </div>
      </div>
    </div>
  )
}

// ---- Main page ----
// SWR fetcher that loads leaderboard + trades in one shot, returns { traders, signals }
async function signalsFetcher() {
  const leaderboardRes = await fetch('/api/polymarket/leaderboard?window=day&limit=50')
  let traders: LeaderboardTrader[] = []
  if (leaderboardRes.ok) traders = await leaderboardRes.json()

  const allSignals: SignalEntry[] = []
  // Top 30 traders, 10 trades each
  const tradePromises = traders.slice(0, 30).map(async (trader) => {
    try {
      const tradesRes = await fetch(`/api/polymarket/trades?user=${trader.proxyWallet}&limit=10`)
      if (tradesRes.ok) {
        const trades: UserTrade[] = await tradesRes.json()
        return trades
          // Filter out trades < $2000 and trades at 99.9c+ entry (redemptions/certainty plays)
          .filter(trade => {
            const tradeValue = trade.size * trade.price
            const entryPrice = trade.price * 100 // convert to cents
            return tradeValue >= 2000 && entryPrice < 99.9
          })
          .map(trade => {
            const tradeValue = trade.size * trade.price
            const confidence: 'High' | 'Medium' | 'Low' =
              trader.rank && trader.rank <= 10 && tradeValue >= 5000 ? 'High' :
              trader.rank && trader.rank <= 30 && tradeValue >= 3000 ? 'Medium' : 'Low'
            return {
              ...trade,
              traderPnl: trader.pnl || 0,
              traderRank: trader.rank,
              traderProfileImage: trader.profileImage,
              traderName: trader.userName,
              confidence,
              isWhale: tradeValue >= 10000,
            }
          })
      }
      return []
    } catch { return [] }
  })

  const tradeResults = await Promise.all(tradePromises)
  tradeResults.forEach(trades => allSignals.push(...trades))
  allSignals.sort((a, b) => normalizeTimestamp(b.timestamp) - normalizeTimestamp(a.timestamp))

  return { traders: traders.slice(0, 30), signals: allSignals }
}

export default function InsiderSignalsPage() {
  const { data, isLoading, mutate } = useSWR('insider-signals', signalsFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 120000, // Cache for 2 minutes
  })
  const signals = data?.signals || []
  const topTraders = data?.traders || []

  const [sortBy, setSortBy] = useState<SortOption>('Recent')
  const [minSize, setMinSize] = useState('')
  const [whalesOnly, setWhalesOnly] = useState(false)

  const filteredSignals = useMemo(() => {
    let result = [...signals]





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
      result.sort((a, b) => b.size * b.price - a.size * a.price)
    }

    return result
  }, [signals, minSize, whalesOnly, sortBy])


  const whaleCount = signals.filter((s) => s.isWhale).length
  const totalVolume = signals.reduce((acc, s) => acc + s.size * s.price, 0)

  return (
    <AppShell title="Insider Signals" subtitle="Real-time trades from top Polymarket traders">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4">
          <div className="sharp-panel p-3 sm:p-4">
            <div className="flex items-center gap-2 text-primary">
              <img
                src="/icon-lightning.png"
                alt="Total Signals"
                className="h-8 w-8 sm:h-12 sm:w-12 object-contain"
                style={{ filter: 'invert(1)', mixBlendMode: 'screen' }}
              />
              {isLoading ? (
                <Skeleton className="h-6 sm:h-8 w-10 sm:w-12" />
              ) : (
                <span className="text-xl sm:text-2xl font-bold">{signals.length}</span>
              )}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">Total Signals</div>
          </div>
          <div className="sharp-panel p-3 sm:p-4">
            <div className="flex items-center gap-2 text-primary">
              <img
                src="/icons/top-traders.png"
                alt="Top Traders"
                className="h-8 w-8 sm:h-12 sm:w-12 object-contain"
                style={{ filter: 'invert(1)', mixBlendMode: 'screen' }}
              />
              {isLoading ? (
                <Skeleton className="h-6 sm:h-8 w-10 sm:w-12" />
              ) : (
                <span className="text-xl sm:text-2xl font-bold">{topTraders.length}</span>
              )}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">Top Traders</div>
          </div>
          <div className="sharp-panel p-3 sm:p-4">
            <div className="flex items-center gap-2 text-yellow-500">
              <img
                src="/icon-whale.png"
                alt="Whale Trades"
                className="h-8 w-8 sm:h-12 sm:w-12 object-contain"
                style={{ filter: 'invert(1)', mixBlendMode: 'screen' }}
              />
              {isLoading ? (
                <Skeleton className="h-6 sm:h-8 w-10 sm:w-12" />
              ) : (
                <span className="text-xl sm:text-2xl font-bold">{whaleCount}</span>
              )}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">Whale Trades</div>
          </div>
          <div className="sharp-panel p-3 sm:p-4">
            <div className="flex items-center gap-2 text-foreground">
              <img
                src="/icon-volume.png"
                alt="Total Volume"
                className="h-8 w-8 sm:h-12 sm:w-12 object-contain"
                style={{ filter: 'invert(1)', mixBlendMode: 'screen' }}
              />
              {isLoading ? (
                <Skeleton className="h-6 sm:h-8 w-14 sm:w-20" />
              ) : (
                <span className="text-xl sm:text-2xl font-bold">{formatVolume(totalVolume)}</span>
              )}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">Total Volume</div>
          </div>
        </div>

        {/* Filters */}
        <div className="sharp-panel p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Filters</span>
              </div>
              {/* Refresh - mobile position */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => mutate()}
                disabled={isLoading}
                className="gap-2 bg-transparent border-border sm:hidden"
              >
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Sort */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent border-border text-xs sm:text-sm">
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

              {/* Min Size */}
              <Input
                type="number"
                placeholder="Min $"
                value={minSize}
                onChange={(e) => setMinSize(e.target.value)}
                className="w-20 sm:w-32 bg-secondary border-border text-sm"
              />

              {/* Whales Only */}
              <div className="flex items-center gap-2">
                <Switch
                  id="whales-only"
                  checked={whalesOnly}
                  onCheckedChange={setWhalesOnly}
                />
                <Label htmlFor="whales-only" className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                  Whales
                </Label>
              </div>
            </div>

            {/* Refresh - desktop position */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => mutate()}
              disabled={isLoading}
              className="gap-2 bg-transparent border-border hidden sm:flex sm:ml-auto"
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
              <div key={i} className="sharp-panel p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="mt-4 h-10 w-full" />
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredSignals.length === 0 ? (
          <div className="sharp-panel p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
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
