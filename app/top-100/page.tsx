'use client'

import { useState, useMemo } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { Search, Copy, Trophy } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import useSWR from 'swr'
import {
  type LeaderboardTrader,
  formatPnl,
  formatVolume,
  formatAddress,
} from '@/lib/polymarket-api'
import { WalletAvatar } from '@/components/trader/wallet-avatar'
import {
  getTraderCategories,
  CategoriesRow,
  type TraderStats,
} from '@/components/trader/category-badges'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// ---- Smart Score (same as leaderboard) ----
function calculateSmartScore(pnl: number, volume: number, rank: number): number {
  const pnlScore = Math.min(pnl / 10000, 40)
  const volumeScore = Math.min(volume / 100000, 30)
  const rankScore = Math.max(30 - rank, 0)
  return Math.round(Math.max(0, Math.min(100, pnlScore + volumeScore + rankScore)) * 10) / 10
}

function estimateWinRate(pnl: number, vol: number): number {
  const ratio = vol > 0 ? pnl / vol : 0
  return Math.min(85, Math.max(25, 50 + ratio * 200))
}

function estimateSharpe(pnl: number, vol: number): number {
  if (vol <= 0) return 0
  const ratio = pnl / vol
  return Math.max(-3, Math.min(10, ratio * 50))
}

// ---- Copy button ----
function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className={cn('text-muted-foreground hover:text-foreground transition-colors flex-shrink-0', className)}
      title={`Copy: ${text}`}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? (
        <span className="text-[10px] text-[#22c55e]">Copied</span>
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  )
}

// ---- X (Twitter) icon ----
function XIcon({ username, className }: { username: string; className?: string }) {
  return (
    <button
      className={cn('text-muted-foreground hover:text-foreground flex-shrink-0 transition-colors', className)}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        window.open(`https://x.com/${username}`, '_blank')
      }}
      title={`@${username}`}
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    </button>
  )
}

// ---- Extended trader type ----
interface Top100Trader extends LeaderboardTrader {
  smartScore: number
  winRate: number
  sharpe: number
  categories: ReturnType<typeof getTraderCategories>
}

// ---- Single podium card ----
function PodiumCard({
  trader,
  rank,
  avatarSize,
  pedestalHeight,
  cardWidth,
}: {
  trader: Top100Trader
  rank: number
  avatarSize: number
  pedestalHeight: number
  cardWidth: number
}) {
  const name = trader.userName || formatAddress(trader.proxyWallet)
  const displayName = name.length > 16 && name.startsWith('0x') ? formatAddress(name) : name

  const rankColors = {
    1: { bg: 'bg-yellow-400', text: 'text-black', border: 'border-yellow-400/60', glow: 'shadow-yellow-400/20' },
    2: { bg: 'bg-gray-400', text: 'text-black', border: 'border-gray-400/60', glow: 'shadow-gray-400/10' },
    3: { bg: 'bg-amber-600', text: 'text-white', border: 'border-amber-600/60', glow: 'shadow-amber-600/10' },
  }
  const colors = rankColors[rank as 1 | 2 | 3]

  return (
    <Link
      href={`/trader/${trader.proxyWallet}`}
      className="flex flex-col items-center group relative"
      style={{ width: cardWidth }}
    >
      {/* Avatar floating above pedestal */}
      <div className="relative z-10 mb-[-24px]">
        {/* Rank badge */}
        <div
          className={cn(
            'absolute -top-1 -left-1 z-20 flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold shadow-lg',
            colors.bg, colors.text
          )}
        >
          #{rank}
        </div>
        <div
          className={cn('rounded-full overflow-hidden border-2 shadow-lg', colors.border, colors.glow)}
          style={{ width: avatarSize, height: avatarSize }}
        >
          {trader.profileImage ? (
            <Image
              src={trader.profileImage}
              alt={displayName}
              width={avatarSize}
              height={avatarSize}
              className="h-full w-full object-cover"
            />
          ) : (
            <WalletAvatar wallet={trader.proxyWallet} size={avatarSize} />
          )}
        </div>
      </div>

      {/* 3D Pedestal box */}
      <div
        className="w-full relative"
        style={{ height: pedestalHeight }}
      >
        {/* Top face (perspective illusion) */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-[#2a3a2e] rounded-t-lg border-t border-x border-[#3a5040]/80" />

        {/* Front face */}
        <div className="absolute top-3 left-0 right-0 bottom-0 bg-gradient-to-b from-[#1f2d23] to-[#171f1a] border-x border-b border-[#2a3a2e]/80 flex flex-col items-center justify-start pt-8 px-3">
          {/* Trophy + Name + X + Copy */}
          <div className="flex items-center gap-1.5 mb-3 max-w-full">
            <Trophy className="h-4 w-4 text-yellow-500 flex-shrink-0" />
            <span className={cn(
              'font-bold text-foreground group-hover:text-primary transition-colors truncate',
              rank === 1 ? 'text-lg' : 'text-sm'
            )}>
              {displayName}
            </span>
            {trader.xUsername && <XIcon username={trader.xUsername} />}
            <CopyButton text={trader.proxyWallet} />
          </div>

          {/* Stats */}
          <div className="flex flex-col items-center gap-1 text-center w-full">
            <div className="text-xs text-muted-foreground">
              {'Smart Score: '}
              <span className="text-foreground font-bold">{trader.smartScore.toFixed(1)}</span>
            </div>
            <div className="text-sm font-bold text-[#22c55e]">
              {'PNL: '}{formatPnl(trader.pnl)}
            </div>
            <div className="text-xs text-muted-foreground">
              {'Win Rate: '}
              <span className="text-[#22c55e] font-semibold">{trader.winRate.toFixed(1)}%</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {'Sharpe: '}
              <span className="text-foreground font-semibold">{trader.sharpe.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Left edge shadow (3D effect) */}
        <div className="absolute top-3 left-0 w-1 bottom-0 bg-[#141c16]" />
        {/* Right edge highlight */}
        <div className="absolute top-3 right-0 w-[1px] bottom-0 bg-[#3a5040]/40" />
      </div>
    </Link>
  )
}

// ---- Podium for top 3 ----
function Podium({ traders }: { traders: Top100Trader[] }) {
  if (traders.length < 3) return null
  const [first, second, third] = traders

  return (
    <div className="flex items-end justify-center gap-3 sm:gap-5 mb-14 pt-24 px-4">
      {/* #2 - Left */}
      <PodiumCard trader={second} rank={2} avatarSize={72} pedestalHeight={200} cardWidth={220} />
      {/* #1 - Center (tallest) */}
      <PodiumCard trader={first} rank={1} avatarSize={96} pedestalHeight={260} cardWidth={270} />
      {/* #3 - Right */}
      <PodiumCard trader={third} rank={3} avatarSize={64} pedestalHeight={180} cardWidth={200} />
    </div>
  )
}

// ---- Loading skeleton ----
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-center gap-5 pt-24 mb-14">
        {[220, 270, 200].map((w, i) => (
          <div key={i} className="flex flex-col items-center" style={{ width: w }}>
            <Skeleton className="rounded-full mb-3" style={{ width: i === 1 ? 96 : 72, height: i === 1 ? 96 : 72 }} />
            <Skeleton className="w-full rounded-t-lg" style={{ height: i === 1 ? 260 : i === 0 ? 200 : 180 }} />
          </div>
        ))}
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  )
}

// ---- Main page ----
export default function VantakeTop100Page() {
  const [search, setSearch] = useState('')

  const { data: rawTraders, isLoading } = useSWR<LeaderboardTrader[]>(
    '/api/polymarket/top100',
    fetcher,
    { revalidateOnFocus: false }
  )

  const traders: Top100Trader[] = useMemo(() => {
    if (!rawTraders || !Array.isArray(rawTraders)) return []
    return rawTraders.map((t, i) => {
      const rank = i + 1
      const smartScore = calculateSmartScore(t.pnl, t.vol, rank)
      const winRate = estimateWinRate(t.pnl, t.vol)
      const sharpe = estimateSharpe(t.pnl, t.vol)

      const stats: TraderStats = {
        pnl: t.pnl,
        volume: t.vol,
        smartScore,
        winRate,
        rank,
      }
      const categories = getTraderCategories(stats)

      return { ...t, rank: String(rank), smartScore, winRate, sharpe, categories }
    })
  }, [rawTraders])

  const filtered = useMemo(() => {
    if (!search.trim()) return traders
    const q = search.toLowerCase()
    return traders.filter(
      (t) =>
        (t.userName || '').toLowerCase().includes(q) ||
        t.proxyWallet.toLowerCase().includes(q)
    )
  }, [traders, search])

  const topThree = filtered.slice(0, 3)
  const rest = filtered.slice(3)

  return (
    <AppShell title="Vantake Top 100" subtitle="Best Traders on Polymarket">
      <div className="max-w-7xl mx-auto">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground font-mono text-balance mb-2">Vantake Top 100</h1>
          <p className="text-muted-foreground text-sm">
            The best human traders on Polymarket, ranked by the Vantake team.
          </p>
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : traders.length === 0 ? (
          <div className="sharp-panel p-12 text-center">
            <p className="text-muted-foreground">Failed to load leaderboard data. Try refreshing.</p>
          </div>
        ) : (
          <>
            {/* Podium */}
            {!search.trim() && <Podium traders={topThree} />}

            {/* Leaderboard header + search */}
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-lg font-bold text-foreground font-mono">Leaderboard</h2>
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by name or wallet..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm bg-secondary/30 border-border"
                />
              </div>
            </div>

            {/* Table */}
            <div className="sharp-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: 900 }}>
                  <thead>
                    <tr className="border-b border-border bg-secondary/20">
                      <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-16">Rank</th>
                      <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground" style={{ minWidth: 300 }}>Trader</th>
                      <th className="px-5 py-3 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-28">Smart Score</th>
                      <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-28">Volume</th>
                      <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-24">Winrate</th>
                      <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-28">Sharpe Ratio</th>
                      <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-28">PNL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(search.trim() ? filtered : rest).map((trader) => {
                      const rank = parseInt(trader.rank)
                      const name = trader.userName || formatAddress(trader.proxyWallet)
                      const displayName = name.length > 24 && name.startsWith('0x') ? formatAddress(name) : name

                      return (
                        <tr key={trader.proxyWallet} className="border-b border-border/50 hover:bg-secondary/10 transition-colors group">
                          <td className="px-5 py-4 text-muted-foreground font-mono text-xs">{rank}</td>
                          <td className="px-5 py-4">
                            <Link href={`/trader/${trader.proxyWallet}`} className="flex items-center gap-3 min-w-0">
                              <div className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0">
                                {trader.profileImage ? (
                                  <Image
                                    src={trader.profileImage}
                                    alt={displayName}
                                    width={40}
                                    height={40}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <WalletAvatar wallet={trader.proxyWallet} size={40} />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                {/* Line 1: Name + X + badges */}
                                <div className="flex items-center gap-2 flex-nowrap">
                                  <span className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                    {displayName}
                                  </span>
                                  {trader.xUsername && <XIcon username={trader.xUsername} />}
                                  <div className="flex-shrink-0">
                                    <CategoriesRow categories={trader.categories} maxVisible={3} size="xs" />
                                  </div>
                                </div>
                                {/* Line 2: Wallet + copy */}
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[11px] text-muted-foreground font-mono">
                                    {formatAddress(trader.proxyWallet)}
                                  </span>
                                  <CopyButton text={trader.proxyWallet} />
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="inline-flex items-center justify-center bg-[#22c55e]/15 text-[#22c55e] rounded-md px-2.5 py-1 text-xs font-bold tabular-nums">
                              {trader.smartScore.toFixed(1)}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right font-mono text-muted-foreground tabular-nums">
                            {formatVolume(trader.vol)}
                          </td>
                          <td className="px-5 py-4 text-right text-[#22c55e] font-medium tabular-nums">
                            {trader.winRate.toFixed(1)}%
                          </td>
                          <td className="px-5 py-4 text-right font-mono text-muted-foreground tabular-nums">
                            {trader.sharpe.toFixed(2)}
                          </td>
                          <td className={cn('px-5 py-4 text-right font-bold tabular-nums', trader.pnl >= 0 ? 'text-[#22c55e]' : 'text-red-500')}>
                            {formatPnl(trader.pnl)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {filtered.length === 0 && search.trim() && (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  {'No traders found matching "'}{search}{'"'}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
