'use client'

import { useState, useMemo } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { Search, Copy, ExternalLink } from 'lucide-react'
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
import { SmartScoreBadge } from '@/components/trader/smart-score-badge'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// ---- Smart Score (same as leaderboard) ----
function calculateSmartScore(pnl: number, volume: number, rank: number): number {
  const pnlScore = Math.min(pnl / 10000, 40)
  const volumeScore = Math.min(volume / 100000, 30)
  const rankScore = Math.max(30 - rank, 0)
  return Math.round(Math.max(0, Math.min(100, pnlScore + volumeScore + rankScore)) * 10) / 10
}

// ---- Win Rate & Sharpe estimation (from real leaderboard data) ----
function estimateWinRate(pnl: number, vol: number): number {
  const ratio = vol > 0 ? pnl / vol : 0
  return Math.min(85, Math.max(25, 50 + ratio * 200))
}

function estimateSharpe(pnl: number, vol: number): number {
  return vol > 0 ? Math.max(-5, Math.min(30, (pnl / Math.sqrt(vol)) * 10)) : 0
}

// ---- Copy button ----
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className="text-muted-foreground hover:text-foreground transition-colors"
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

// ---- Podium for top 3 ----
interface PodiumTrader extends LeaderboardTrader {
  smartScore: number
  winRate: number
  sharpe: number
}

function Podium({ traders }: { traders: PodiumTrader[] }) {
  if (traders.length < 3) return null
  const [first, second, third] = traders

  const podiumConfig = [
    { trader: second, rank: 2, pedestalH: 'h-40', avatarSize: 64, nameSize: 'text-sm' },
    { trader: first, rank: 1, pedestalH: 'h-52', avatarSize: 80, nameSize: 'text-base' },
    { trader: third, rank: 3, pedestalH: 'h-32', avatarSize: 56, nameSize: 'text-sm' },
  ]

  return (
    <div className="flex items-end justify-center gap-3 sm:gap-4 mb-12 pt-20">
      {podiumConfig.map(({ trader, rank, pedestalH, avatarSize, nameSize }) => {
        const name = trader.userName || formatAddress(trader.proxyWallet)
        const displayName = name.length > 16 && name.startsWith('0x') ? formatAddress(name) : name
        const r = parseInt(trader.rank) || rank

        return (
          <Link
            key={rank}
            href={`/trader/${trader.proxyWallet}`}
            className="flex flex-col items-center group"
            style={{ width: rank === 1 ? '260px' : '200px' }}
          >
            {/* Avatar + rank badge */}
            <div className="relative mb-3">
              <div
                className={cn(
                  'rounded-full overflow-hidden border-2',
                  rank === 1 ? 'border-yellow-400' : rank === 2 ? 'border-gray-400' : 'border-amber-600'
                )}
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
              <div
                className={cn(
                  'absolute -top-2 -left-1 flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold',
                  rank === 1
                    ? 'bg-yellow-400 text-black'
                    : rank === 2
                      ? 'bg-gray-400 text-black'
                      : 'bg-amber-600 text-white'
                )}
              >
                #{rank}
              </div>
            </div>

            {/* Pedestal */}
            <div
              className={cn(
                'w-full rounded-t-xl bg-card border border-border border-b-0 flex flex-col items-center justify-start pt-4 px-3',
                pedestalH
              )}
            >
              {/* Name + icons */}
              <div className="flex items-center gap-1.5 mb-1.5 max-w-full">
                <span className={cn('font-semibold text-foreground truncate group-hover:text-primary transition-colors', nameSize)}>
                  {displayName}
                </span>
                {trader.xUsername && (
                  <a
                    href={`https://x.com/${trader.xUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                    title={`@${trader.xUsername}`}
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                  </a>
                )}
                <CopyButton text={trader.proxyWallet} />
              </div>

              <div className="text-[11px] text-muted-foreground mb-2">
                {'Smart Score: '}
                <span className="text-foreground font-semibold">{trader.smartScore.toFixed(1)}</span>
              </div>
              <div className="text-sm font-bold text-[#22c55e] mb-1">
                {'PNL: '}{formatPnl(trader.pnl)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {'Win Rate: '}<span className="text-foreground">{trader.winRate.toFixed(1)}%</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {'Sharpe: '}<span className="text-foreground">{trader.sharpe.toFixed(2)}</span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// ---- Loading skeleton ----
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-center gap-4 pt-20 mb-12">
        {[200, 260, 200].map((w, i) => (
          <div key={i} className="flex flex-col items-center" style={{ width: w }}>
            <Skeleton className="rounded-full mb-3" style={{ width: i === 1 ? 80 : 64, height: i === 1 ? 80 : 64 }} />
            <Skeleton className={cn('w-full rounded-t-xl', i === 1 ? 'h-52' : i === 0 ? 'h-40' : 'h-32')} />
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

  // Fetch top 100 from the leaderboard (ALL time, ordered by PNL)
  const { data: rawTraders, isLoading } = useSWR<LeaderboardTrader[]>(
    '/api/polymarket/leaderboard?timePeriod=ALL&orderBy=PNL&limit=100',
    fetcher,
    { revalidateOnFocus: false }
  )

  const traders = useMemo(() => {
    if (!rawTraders || !Array.isArray(rawTraders)) return []
    return rawTraders.map((t, i) => {
      const rank = i + 1
      return {
        ...t,
        rank: String(rank),
        smartScore: calculateSmartScore(t.pnl, t.vol, rank),
        winRate: estimateWinRate(t.pnl, t.vol),
        sharpe: estimateSharpe(t.pnl, t.vol),
      }
    })
  }, [rawTraders])

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return traders
    const q = search.toLowerCase()
    return traders.filter(
      (t) =>
        (t.userName || '').toLowerCase().includes(q) ||
        t.proxyWallet.toLowerCase().includes(q)
    )
  }, [traders, search])

  const topThree = filtered.slice(0, 3) as PodiumTrader[]
  const rest = filtered.slice(3)

  return (
    <AppShell title="Vantake Top 100" subtitle="Best Traders on Polymarket">
      <div className="max-w-6xl mx-auto">
        {/* Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Image
              src="/vantake-logo-white.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
            />
            <h1 className="text-3xl font-bold text-foreground font-mono text-balance">Vantake Top 100</h1>
          </div>
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
            {/* Podium -- top 3 */}
            {!search.trim() && <Podium traders={topThree} />}

            {/* Leaderboard header + search */}
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-lg font-bold text-foreground font-mono">Leaderboard</h2>
              <div className="relative max-w-xs flex-1">
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
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/20">
                      <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-16">Rank</th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Trader</th>
                      <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Smart Score</th>
                      <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">Volume</th>
                      <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Winrate</th>
                      <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Sharpe Ratio</th>
                      <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">PNL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(search.trim() ? filtered : rest).map((trader) => {
                      const rank = parseInt(trader.rank)
                      const name = trader.userName || formatAddress(trader.proxyWallet)
                      const displayName = name.length > 24 && name.startsWith('0x') ? formatAddress(name) : name

                      return (
                        <tr key={trader.proxyWallet} className="border-b border-border/50 hover:bg-secondary/10 transition-colors group">
                          <td className="px-4 py-4 text-muted-foreground font-mono text-xs">{rank}</td>
                          <td className="px-4 py-4">
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
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                    {displayName}
                                  </span>
                                  {trader.xUsername && (
                                    <a
                                      href={`https://x.com/${trader.xUsername}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-muted-foreground hover:text-foreground flex-shrink-0"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                                    </a>
                                  )}
                                  <CopyButton text={trader.proxyWallet} />
                                </div>
                                <div className="text-[11px] text-muted-foreground font-mono">
                                  {formatAddress(trader.proxyWallet)}
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="inline-flex items-center justify-center bg-[#22c55e]/15 text-[#22c55e] rounded-md px-2.5 py-1 text-xs font-bold tabular-nums">
                              {trader.smartScore.toFixed(1)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right font-mono text-muted-foreground hidden md:table-cell">
                            {formatVolume(trader.vol)}
                          </td>
                          <td className="px-4 py-4 text-right text-[#22c55e] font-medium hidden lg:table-cell">
                            {trader.winRate.toFixed(1)}%
                          </td>
                          <td className="px-4 py-4 text-right font-mono text-muted-foreground hidden lg:table-cell">
                            {trader.sharpe.toFixed(2)}
                          </td>
                          <td className={cn('px-4 py-4 text-right font-bold tabular-nums', trader.pnl >= 0 ? 'text-[#22c55e]' : 'text-red-500')}>
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
                  No traders found matching "{search}"
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
