'use client'

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
import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, ChevronDown, RefreshCw, ExternalLink } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import Image from 'next/image'

type UITimeframe = '24H' | '7D' | '30D' | 'All'
type UICategory = 'All' | 'Politics' | 'Crypto' | 'Sports' | 'Finance' | 'Pop Culture' | 'Tech'
type SortBy = 'PnL' | 'Volume'

const timeframes: UITimeframe[] = ['24H', '7D', '30D', 'All']
const categories: UICategory[] = ['All', 'Politics', 'Crypto', 'Sports', 'Finance', 'Pop Culture', 'Tech']
const sortOptions: SortBy[] = ['PnL', 'Volume']

function PnLDisplay({ pnl }: { pnl: number }) {
  const isPositive = pnl >= 0
  return (
    <span className={cn(
      'font-mono text-sm',
      isPositive ? 'text-success' : 'text-destructive'
    )}>
      {formatPnl(pnl)}
    </span>
  )
}

// Smart Score calculation based on PnL and Volume
function calculateSmartScore(pnl: number, volume: number, rank: number): number {
  const pnlScore = Math.min(pnl / 10000, 40) // Max 40 points from PnL
  const volumeScore = Math.min(volume / 100000, 30) // Max 30 points from volume
  const rankScore = Math.max(30 - rank, 0) // Max 30 points from rank
  return Math.round(Math.max(0, Math.min(100, pnlScore + volumeScore + rankScore)))
}

export function LeaderboardTable() {
  const router = useRouter()
  const [timeframe, setTimeframe] = useState<UITimeframe>('7D')
  const [category, setCategory] = useState<UICategory>('All')
  const [sortBy, setSortBy] = useState<SortBy>('PnL')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [traders, setTraders] = useState<LeaderboardTrader[]>([])
  const [error, setError] = useState<string | null>(null)

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        category: mapCategoryToApi(category),
        timePeriod: mapTimeframeToApi(timeframe),
        orderBy: sortBy === 'PnL' ? 'PNL' : 'VOL',
        limit: '50',
      })
      
      if (search) {
        params.set('userName', search)
      }

      const res = await fetch(`/api/polymarket/leaderboard?${params}`)
      
      if (!res.ok) {
        throw new Error('Failed to fetch leaderboard')
      }
      
      const data = await res.json()
      setTraders(data)
    } catch (err) {
      console.error('Error fetching leaderboard:', err)
      setError('Failed to load leaderboard data')
    } finally {
      setIsLoading(false)
    }
  }, [category, timeframe, sortBy, search])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (search) {
        fetchLeaderboard()
      }
    }, 500)
    return () => clearTimeout(timeout)
  }, [search, fetchLeaderboard])

  const handleRowClick = (wallet: string) => {
    router.push(`/trader/${wallet}`)
  }

  return (
    <div className="space-y-4">
      {/* Filters - Sharp panel */}
      <div className="sharp-panel p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Timeframe - Angular buttons */}
          <div className="flex items-center border border-border">
            {timeframes.map((tf, i) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={cn(
                  'px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors duration-150',
                  timeframe === tf
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
                  i !== timeframes.length - 1 && 'border-r border-border'
                )}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 border-border bg-transparent uppercase text-xs tracking-wider">
                {category}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-card border-border">
              {categories.map((cat) => (
                <DropdownMenuItem
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    'text-xs uppercase tracking-wider',
                    category === cat && 'bg-secondary text-foreground'
                  )}
                >
                  {cat}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort By Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 border-border bg-transparent uppercase text-xs tracking-wider">
                Sort: {sortBy}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-card border-border">
              {sortOptions.map((opt) => (
                <DropdownMenuItem
                  key={opt}
                  onClick={() => setSortBy(opt)}
                  className={cn(
                    'text-xs uppercase tracking-wider',
                    sortBy === opt && 'bg-secondary text-foreground'
                  )}
                >
                  {opt}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search - Sharp input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="SEARCH USERNAME..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-transparent border-border text-xs uppercase tracking-wider placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Refresh */}
          <Button
            variant="outline"
            size="icon"
            onClick={fetchLeaderboard}
            disabled={isLoading}
            className="border-border bg-transparent h-9 w-9"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="sharp-panel p-6 text-center">
          <p className="text-destructive text-sm mb-4">{error}</p>
          <Button onClick={fetchLeaderboard} variant="outline" className="border-border bg-transparent uppercase text-xs tracking-wider">
            Retry
          </Button>
        </div>
      )}

      {/* Table - Pro terminal style */}
      <div className="sharp-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  #
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  Trader
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  Smart Score
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  PnL
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  Volume
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  Link
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-6" /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8" />
                        <div>
                          <Skeleton className="h-4 w-24 mb-1" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16 mx-auto" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-6 mx-auto" /></td>
                  </tr>
                ))
              ) : traders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    No traders found
                  </td>
                </tr>
              ) : (
                traders.map((trader) => {
                  const smartScore = calculateSmartScore(trader.pnl, trader.vol, trader.rank)
                  return (
                    <tr
                      key={trader.proxyWallet}
                      onClick={() => handleRowClick(trader.proxyWallet)}
                      className="border-b border-border/50 row-hover cursor-pointer"
                    >
                      {/* Rank */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-muted-foreground">
                          {String(trader.rank).padStart(2, '0')}
                        </span>
                      </td>
                      
                      {/* Trader Info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {trader.profileImage ? (
                            <Image
                              src={trader.profileImage || "/placeholder.svg"}
                              alt={trader.userName || 'Trader'}
                              width={28}
                              height={28}
                              className="h-7 w-7 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="flex h-7 w-7 items-center justify-center bg-secondary text-foreground font-mono text-[10px] rounded-full flex-shrink-0">
                              {(trader.userName || trader.proxyWallet.slice(2, 4)).toUpperCase().slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground text-sm">
                                {trader.userName || formatAddress(trader.proxyWallet)}
                              </span>
                              {trader.verifiedBadge && (
                                <span className="inline-flex items-center border border-primary/50 px-1.5 py-0.5 text-[9px] font-medium text-primary uppercase tracking-wider">
                                  Verified
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {formatAddress(trader.proxyWallet)}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      {/* Smart Score - Numeric + thin bar */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-mono text-sm text-foreground">{smartScore}</span>
                          <div className="w-16 h-[2px] bg-secondary">
                            <div 
                              className="h-full bg-primary"
                              style={{ 
                                width: `${smartScore}%`,
                                clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 100%, 0 100%)'
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      
                      {/* PnL */}
                      <td className="px-4 py-3 text-right">
                        <PnLDisplay pnl={trader.pnl} />
                      </td>
                      
                      {/* Volume */}
                      <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">
                        {formatVolume(trader.vol)}
                      </td>
                      
                      {/* External Link */}
                      <td className="px-4 py-3 text-center">
                        <a
                          href={`https://polymarket.com/profile/${trader.proxyWallet}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-center p-2 text-muted-foreground hover:text-foreground transition-colors duration-150"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data source */}
      <div className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
        Live data from Polymarket
      </div>
    </div>
  )
}
