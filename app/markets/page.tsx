'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import useSWR from 'swr'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Search, ChevronDown, TrendingUp, Clock, DollarSign, Loader2, RefreshCw } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  type PolymarketMarket,
  parseOutcomePrices,
  formatVolume,
} from '@/lib/polymarket-api'

type Category = 'Politics' | 'Crypto' | 'Sports' | 'Finance' | 'Pop Culture' | 'Science' | 'Business' | 'Other'
const categories: (Category | 'All')[] = ['All', 'Politics', 'Crypto', 'Sports', 'Finance', 'Science', 'Business']

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

function MarketCard({ market }: { market: PolymarketMarket }) {
  const prices = parseOutcomePrices(market)
  const yesPrice = prices[0] ?? 0.5
  const noPrice = prices[1] ?? 1 - yesPrice

  const endDate = market.endDate ? new Date(market.endDate) : null
  const daysUntilEnd = endDate
    ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const volume = market.volumeNum || parseFloat(market.volume || '0')
  const liquidity = market.liquidityNum || parseFloat(market.liquidity || '0')

  const category = market.category || market.tags?.[0]?.label || 'Other'

  const marketImage = market.image || market.icon

  return (
    <Link href={`/markets/${market.slug || market.id}`}>
      <div className="sharp-panel p-4 hover:bg-secondary/30 transition-colors duration-150 cursor-pointer h-full relative group">
        {/* Diagonal accent on hover */}
        <div className="absolute top-0 right-0 w-0 h-0 group-hover:border-l-[20px] group-hover:border-l-transparent group-hover:border-t-[20px] group-hover:border-t-primary transition-all duration-150" />
        
        <div className="flex items-start gap-3">
          {/* Market Image */}
          {marketImage && (
            <div className="h-12 w-12 rounded overflow-hidden flex-shrink-0 bg-secondary">
              <Image
                src={marketImage || "/placeholder.svg"}
                alt={market.question}
                width={48}
                height={48}
                className="h-full w-full object-cover"
                unoptimized
              />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              {/* Category badge - sharp */}
              <span className="inline-flex items-center border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {category}
              </span>
              {daysUntilEnd !== null && daysUntilEnd > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                  <Clock className="h-3 w-3" />
                  {daysUntilEnd}d
                </div>
              )}
              {market.closed && (
                <span className="inline-flex items-center border border-muted-foreground/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Closed
                </span>
              )}
            </div>
            <h3 className="mt-3 text-sm font-medium text-foreground line-clamp-2 leading-relaxed">
              {market.question}
            </h3>
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
              {market.oneDayPriceChange !== undefined && market.oneDayPriceChange !== 0 && (
                <div
                  className={cn(
                    'text-xs font-mono',
                    market.oneDayPriceChange > 0 ? 'text-success' : 'text-destructive'
                  )}
                >
                  {market.oneDayPriceChange > 0 ? '+' : ''}
                  {(market.oneDayPriceChange * 100).toFixed(1)}%
                </div>
              )}
            </div>
            {/* Stats row */}
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                <DollarSign className="h-3 w-3" />
                {formatVolume(volume)}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                <TrendingUp className="h-3 w-3" />
                {formatVolume(liquidity)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function MarketsPage() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'All' | Category>('All')

  const { data: markets, error, isLoading, mutate } = useSWR<PolymarketMarket[]>(
    '/api/polymarket/markets?limit=100&closed=false&active=true',
    fetcher,
    {
      refreshInterval: 60000,
      revalidateOnFocus: false,
    }
  )

  const filteredMarkets = useMemo(() => {
    if (!markets) return []

    let result = [...markets]

    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(
        (m) =>
          m.question?.toLowerCase().includes(searchLower) ||
          m.description?.toLowerCase().includes(searchLower)
      )
    }

    if (categoryFilter !== 'All') {
      result = result.filter((m) => {
        const marketCategory = m.category || m.tags?.[0]?.label || 'Other'
        return marketCategory.toLowerCase().includes(categoryFilter.toLowerCase())
      })
    }

    result.sort((a, b) => {
      const volA = a.volumeNum || parseFloat(a.volume || '0')
      const volB = b.volumeNum || parseFloat(b.volume || '0')
      return volB - volA
    })

    return result
  }, [markets, search, categoryFilter])

  const categoryStats = useMemo(() => {
    if (!markets) return {}

    const stats: Record<string, { count: number; volume: number }> = {}
    for (const cat of categories.filter((c) => c !== 'All')) {
      const catMarkets = markets.filter((m) => {
        const marketCategory = m.category || m.tags?.[0]?.label || 'Other'
        return marketCategory.toLowerCase().includes(cat.toLowerCase())
      })
      stats[cat] = {
        count: catMarkets.length,
        volume: catMarkets.reduce((acc, m) => acc + (m.volumeNum || parseFloat(m.volume || '0')), 0),
      }
    }
    return stats
  }, [markets])

  return (
    <AppShell title="Markets" subtitle="Prediction markets">
      <div className="space-y-6">
        {/* Loading State */}
        {isLoading && (
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

        {/* Content */}
        {!isLoading && !error && markets && (
          <>
            {/* Category Stats - Angular cards */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              {categories.filter((c) => c !== 'All').map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat === categoryFilter ? 'All' : cat)}
                  className={cn(
                    'sharp-panel p-3 text-left transition-colors duration-150',
                    categoryFilter === cat ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary/50'
                  )}
                >
                  <div className={cn(
                    'text-[10px] uppercase tracking-wider',
                    categoryFilter === cat ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  )}>
                    {cat}
                  </div>
                  <div className={cn(
                    'mt-1 text-2xl font-mono font-medium',
                    categoryFilter === cat ? 'text-primary-foreground' : 'text-foreground'
                  )}>
                    {categoryStats[cat]?.count || 0}
                  </div>
                  <div className={cn(
                    'text-[10px] font-mono',
                    categoryFilter === cat ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  )}>
                    {formatVolume(categoryStats[cat]?.volume || 0)}
                  </div>
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="sharp-panel p-4">
              <div className="flex flex-wrap items-center gap-3">
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

                {/* Category */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 border-border bg-transparent uppercase text-xs tracking-wider">
                      {categoryFilter}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card border-border">
                    {categories.map((cat) => (
                      <DropdownMenuItem
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={cn(
                          'text-xs uppercase tracking-wider',
                          categoryFilter === cat && 'bg-secondary text-foreground'
                        )}
                      >
                        {cat}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Refresh */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => mutate()}
                  className="text-muted-foreground hover:text-foreground h-9 w-9"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>

                {categoryFilter !== 'All' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCategoryFilter('All')}
                    className="text-muted-foreground hover:text-foreground text-xs uppercase tracking-wider"
                  >
                    Clear
                  </Button>
                )}

                <div className="text-[10px] uppercase tracking-widest text-muted-foreground ml-auto font-mono">
                  {filteredMarkets.length} markets
                </div>
              </div>
            </div>

            {/* Markets Grid */}
            {filteredMarkets.length === 0 ? (
              <div className="sharp-panel p-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center bg-secondary">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-sm font-medium text-foreground uppercase tracking-wider">No markets found</h3>
                <p className="mt-2 text-xs text-muted-foreground">
                  Adjust your search or filters
                </p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filteredMarkets.map((market) => (
                  <MarketCard key={market.id} market={market} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
