'use client'

import { AppShell } from '@/components/layout/app-shell'
import { Trophy, Crown, Medal, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import Image from 'next/image'

// ============================================
// VANTAKE TOP 100
// This page will display the 100 best human
// traders on Polymarket, curated by the Vantake team.
//
// Currently EMPTY -- waiting for real wallet list.
// Once wallet addresses are provided, they will be
// fetched from the Polymarket API and displayed here.
// ============================================

interface TopTrader {
  rank: number
  name: string
  wallet: string
  avatar?: string
  smartScore: number
  pnl: number
  winRate: number
  sharpe: number
  volume: number
}

// Placeholder: will be replaced with real data once wallet list is provided
const TOP_TRADERS: TopTrader[] = []

function formatPnl(value: number) {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${value >= 0 ? '+' : '-'}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${value >= 0 ? '+' : '-'}$${(abs / 1_000).toFixed(0)}K`
  return `${value >= 0 ? '+' : '-'}$${abs.toFixed(0)}`
}

function formatVol(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

// Podium component for top 3
function Podium({ traders }: { traders: TopTrader[] }) {
  if (traders.length < 3) return null
  const [first, second, third] = [traders[0], traders[1], traders[2]]

  const podiumOrder = [
    { trader: second, rank: 2, height: 'h-36', avatarSize: 'h-16 w-16', badge: <Medal className="h-4 w-4" /> },
    { trader: first, rank: 1, height: 'h-48', avatarSize: 'h-20 w-20', badge: <Crown className="h-5 w-5 text-yellow-400" /> },
    { trader: third, rank: 3, height: 'h-28', avatarSize: 'h-14 w-14', badge: <Medal className="h-4 w-4" /> },
  ]

  return (
    <div className="flex items-end justify-center gap-3 mb-10 pt-16">
      {podiumOrder.map(({ trader, rank, height, avatarSize, badge }) => (
        <div key={rank} className="flex flex-col items-center" style={{ width: rank === 1 ? '240px' : '200px' }}>
          {/* Avatar */}
          <div className="relative mb-3">
            <div className={cn(
              avatarSize,
              'rounded-full overflow-hidden bg-secondary border-2',
              rank === 1 ? 'border-yellow-400' : rank === 2 ? 'border-gray-300' : 'border-amber-600'
            )}>
              {trader.avatar ? (
                <Image src={trader.avatar} alt={trader.name} width={80} height={80} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-foreground font-bold text-lg">
                  {trader.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            {/* Rank badge */}
            <div className={cn(
              'absolute -top-2 -right-2 flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold',
              rank === 1 ? 'bg-yellow-400 text-black' : rank === 2 ? 'bg-gray-300 text-black' : 'bg-amber-600 text-white'
            )}>
              #{rank}
            </div>
          </div>

          {/* Pedestal */}
          <div className={cn(
            'w-full rounded-t-xl bg-card border border-border border-b-0 flex flex-col items-center justify-start pt-4 px-3',
            height
          )}>
            <div className="flex items-center gap-1.5 mb-1">
              {badge}
              <span className="font-semibold text-foreground text-sm truncate max-w-[140px]">{trader.name}</span>
            </div>
            <div className="text-[11px] text-muted-foreground mb-2">Smart Score: <span className="text-foreground font-semibold">{trader.smartScore.toFixed(1)}</span></div>
            <div className="text-sm font-bold text-emerald-400 mb-1">{formatPnl(trader.pnl)}</div>
            <div className="text-[11px] text-muted-foreground">Win Rate: <span className="text-foreground">{trader.winRate.toFixed(1)}%</span></div>
            <div className="text-[11px] text-muted-foreground">Sharpe: <span className="text-foreground">{trader.sharpe.toFixed(2)}</span></div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function VantakeTop100Page() {
  const hasData = TOP_TRADERS.length > 0
  const topThree = TOP_TRADERS.slice(0, 3)
  const rest = TOP_TRADERS.slice(3)

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
            <h1 className="text-3xl font-bold text-foreground">Vantake Top 100</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            The best human traders on Polymarket, curated and ranked by the Vantake team.
          </p>
        </div>

        {!hasData ? (
          /* Empty state */
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center bg-secondary rounded-2xl mb-5">
              <Trophy className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Coming Soon</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
              We are compiling and verifying the top 100 profitable human traders on Polymarket.
              This curated leaderboard will feature traders with the highest win rates, best risk management, and consistent profitability.
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
              <div className="bg-secondary/40 rounded-lg p-4">
                <div className="text-2xl font-bold text-foreground mb-1">100</div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Top Traders</div>
              </div>
              <div className="bg-secondary/40 rounded-lg p-4">
                <div className="text-2xl font-bold text-emerald-400 mb-1">+WR</div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Verified Winrate</div>
              </div>
              <div className="bg-secondary/40 rounded-lg p-4">
                <div className="text-2xl font-bold text-foreground mb-1">0%</div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Bots Included</div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Podium - top 3 */}
            <Podium traders={topThree} />

            {/* Search */}
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-lg font-semibold text-foreground">Leaderboard</h2>
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search by name or wallet..." className="pl-9 h-9 text-sm bg-secondary/30 border-border" />
              </div>
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/20">
                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-16">Rank</th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Trader</th>
                    <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Smart Score</th>
                    <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Volume</th>
                    <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Winrate</th>
                    <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Sharpe Ratio</th>
                    <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">PNL</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((trader) => (
                    <tr key={trader.rank} className="border-b border-border/50 hover:bg-secondary/10 transition-colors cursor-pointer">
                      <td className="px-4 py-4 text-muted-foreground font-mono">{trader.rank}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                            {trader.avatar ? (
                              <Image src={trader.avatar} alt={trader.name} width={32} height={32} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-foreground font-bold text-xs">
                                {trader.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{trader.name}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {trader.wallet.slice(0, 6)}...{trader.wallet.slice(-4)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center justify-center bg-emerald-500/15 text-emerald-400 rounded-md px-2.5 py-1 text-xs font-bold">
                          {trader.smartScore.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-muted-foreground">{formatVol(trader.volume)}</td>
                      <td className="px-4 py-4 text-right text-emerald-400 font-medium">{trader.winRate.toFixed(1)}%</td>
                      <td className="px-4 py-4 text-right font-mono text-muted-foreground">{trader.sharpe.toFixed(2)}</td>
                      <td className="px-4 py-4 text-right font-bold text-emerald-400">{formatPnl(trader.pnl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
