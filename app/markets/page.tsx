'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import useSWR from 'swr'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Search, Clock, DollarSign, Loader2, RefreshCw, TrendingUp, Flame, Zap } from 'lucide-react'
import { formatVolume } from '@/lib/polymarket-api'

// Sort options (only params that work with Gamma API events endpoint)
type SortOption = 'volume' | 'liquidity' | 'startDate'
const sortOptions: { value: SortOption; label: string; icon: React.ReactNode }[] = [
  { value: 'volume', label: 'Popular', icon: <Flame className="h-3.5 w-3.5" /> },
  { value: 'liquidity', label: 'Most Liquid', icon: <DollarSign className="h-3.5 w-3.5" /> },
  { value: 'startDate', label: 'Newest', icon: <Zap className="h-3.5 w-3.5" /> },
]

// Category tabs - Polymarket main categories
const categories = [
  { key: 'all', label: 'All' },
  { key: 'politics', label: 'Politics' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'sports', label: 'Sports' },
  { key: 'pop-culture', label: 'Pop Culture' },
  { key: 'business', label: 'Business' },
  { key: 'science', label: 'Science' },
] as const

type CategoryKey = typeof categories[number]['key']

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

// Event type from Gamma API events endpoint
interface PolymarketEvent {
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
  createdAt?: string
  markets: {
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
    image?: string
    icon?: string
  }[]
  tags?: { id: string; label: string; slug: string }[]
  competitive?: number
}

function EventCard({ event }: { event: PolymarketEvent }) {
  const mainMarket = event.markets?.[0]
  const marketCount = event.markets?.length ?? 0

  // Parse prices from the first market
  let yesPrice = 0.5
  let noPrice = 0.5
  if (mainMarket?.outcomePrices) {
    try {
      const parsed = JSON.parse(mainMarket.outcomePrices)
      yesPrice = parseFloat(parsed[0]) || 0.5
      noPrice = parseFloat(parsed[1]) || 1 - yesPrice
    } catch {
      // keep defaults
    }
  }

  const endDate = event.endDate ? new Date(event.endDate) : null
  const daysUntilEnd = endDate
    ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const volume = event.volume || 0
  const volume24hr = event.volume24hr || 0
  const eventImage = event.image || event.icon || mainMarket?.image || mainMarket?.icon
  const category = event.category || event.tags?.[0]?.label || 'Other'

  const linkSlug = event.slug || event.id

  return (
    <Link href={`/markets/${linkSlug}`}>
      <div className="sharp-panel p-4 hover:bg-secondary/30 transition-colors duration-150 cursor-pointer h-full relative group">
        <div className="absolute top-0 right-0 w-0 h-0 group-hover:border-l-[20px] group-hover:border-l-transparent group-hover:border-t-[20px] group-hover:border-t-primary transition-all duration-150" />

        <div className="flex items-start gap-3">
          {/* Event Image */}
          {eventImage && (
            <div className="h-12 w-12 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
              <Image
                src={eventImage}
                alt={event.title}
                width={48}
                height={48}
                className="h-full w-full object-cover"
                unoptimized
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <span className="inline-flex items-center border border-border rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {category}
              </span>
              <div className="flex items-center gap-2">
                {marketCount > 1 && (
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {marketCount} markets
                  </span>
                )}
                {daysUntilEnd !== null && daysUntilEnd > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                    <Clock className="h-3 w-3" />
                    {daysUntilEnd}d
                  </div>
                )}
              </div>
            </div>

            <h3 className="mt-3 text-sm font-medium text-foreground line-clamp-2 leading-relaxed">
              {event.title}
            </h3>

            {/* Prices from main market */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Yes</div>
                  <div className="text-xl font-mono font-medium text-success">
                    {(yesPrice * 100).toFixed(0)}<span className="text-xs">c</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">No</div>
                  <div className="text-xl font-mono font-medium text-destructive">
                    {(noPrice * 100).toFixed(0)}<span className="text-xs">c</span>
                  </div>
                </div>
              </div>
              {mainMarket?.oneDayPriceChange !== undefined && mainMarket.oneDayPriceChange !== 0 && (
                <div
                  className={cn(
                    'text-xs font-mono',
                    mainMarket.oneDayPriceChange > 0 ? 'text-success' : 'text-destructive'
                  )}
                >
                  {mainMarket.oneDayPriceChange > 0 ? '+' : ''}
                  {(mainMarket.oneDayPriceChange * 100).toFixed(1)}%
                </div>
              )}
            </div>

            {/* Stats row */}
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                <DollarSign className="h-3 w-3" />
                {formatVolume(volume)}
              </div>
              {volume24hr > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-success font-mono">
                  <TrendingUp className="h-3 w-3" />
                  {formatVolume(volume24hr)} 24h
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function MarketsPage() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryKey>('all')
  const [sortBy, setSortBy] = useState<SortOption>('volume')

  // Build API URL with category as tag filter
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      endpoint: 'events',
      limit: '50',
      active: 'true',
      closed: 'false',
      order: sortBy,
      ascending: 'false',
    })

    // Map category to tag filtering via the _tag query approach
    if (categoryFilter !== 'all') {
      params.set('tag', categoryFilter)
    }

    return `/api/polymarket/markets?${params}`
  }, [categoryFilter, sortBy])

  const { data: events, error, isLoading, mutate } = useSWR<PolymarketEvent[]>(
    apiUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
      keepPreviousData: true,
    }
  )

  // Client-side search filter
  const filteredEvents = useMemo(() => {
    if (!events) return []
    if (!search) return events
    const searchLower = search.toLowerCase()
    return events.filter(
      (e) =>
        e.title?.toLowerCase().includes(searchLower) ||
        e.description?.toLowerCase().includes(searchLower) ||
        e.markets?.some(m => m.question?.toLowerCase().includes(searchLower))
    )
  }, [events, search])

  return (
    <AppShell title="Markets" subtitle="Prediction markets">
      <div className="space-y-4">
        {/* Category Tabs - inline row */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategoryFilter(cat.key)}
              className={cn(
                'px-4 py-2 text-xs font-medium uppercase tracking-wider whitespace-nowrap transition-colors border rounded-lg',
                categoryFilter === cat.key
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground/50'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sort + Search row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Sort buttons */}
          <div className="flex items-center gap-1">
            {sortOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider transition-colors border rounded-lg',
                  sortBy === opt.value
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-transparent text-muted-foreground border-border hover:text-foreground'
                )}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="SEARCH MARKETS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-transparent border-border text-xs uppercase tracking-wider placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Refresh */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => mutate()}
            className="text-muted-foreground hover:text-foreground h-9 w-9"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
            {filteredEvents.length} events
          </div>
        </div>

        {/* Loading State */}
        {isLoading && !events && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-foreground" />
            <span className="ml-3 text-sm text-muted-foreground uppercase tracking-wider">Loading markets...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="sharp-panel p-6 text-center">
            <div className="text-destructive text-sm">Failed to load markets</div>
            <Button onClick={() => mutate()} className="mt-4 border-border bg-transparent uppercase text-xs tracking-wider" variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        )}

        {/* Markets Grid */}
        {!error && filteredEvents.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredEvents.length === 0 && events && (
          <div className="sharp-panel p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center bg-secondary rounded-xl">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-sm font-medium text-foreground uppercase tracking-wider">No markets found</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Try a different category or search term
            </p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
