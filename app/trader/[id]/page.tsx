'use client'

import React from "react"

import { useEffect, useState, use } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  type UserPosition,
  type UserTrade,
  type LeaderboardTrader,
  formatPnl,
  formatVolume,
  formatAddress,
  timeAgo,
  normalizeTimestamp,
  formatShortDate,
} from '@/lib/polymarket-api'
import { cn } from '@/lib/utils'
import { Copy, ExternalLink, RefreshCw, ArrowLeft } from 'lucide-react'
import { FollowButton } from '@/components/trader/follow-button'
import Link from 'next/link'
import Image from 'next/image'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface TraderPageProps {
  params: Promise<{ id: string }>
}

function KpiCard({
  label,
  value,
  trend,
  isLoading,
}: {
  label: string
  value: string
  trend?: 'up' | 'down' | 'neutral'
  isLoading?: boolean
}) {
  return (
    <div className="sharp-panel p-4">
      <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      {isLoading ? (
        <Skeleton className="h-8 w-20 mt-2" />
      ) : (
        <div
          className={cn(
            'mt-2 text-2xl font-mono font-medium',
            trend === 'up' && 'text-success',
            trend === 'down' && 'text-destructive',
            !trend && 'text-foreground'
          )}
        >
          {value}
        </div>
      )}
    </div>
  )
}

export default function TraderPage({ params }: TraderPageProps) {
  const { id } = use(params)
  const [profile, setProfile] = useState<LeaderboardTrader | null>(null)
  const [positions, setPositions] = useState<UserPosition[]>([])
  const [trades, setTrades] = useState<UserTrade[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchTraderData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [leaderboardRes, positionsRes, tradesRes] = await Promise.all([
        fetch(`/api/polymarket/leaderboard?user=${id}&limit=1`),
        fetch(`/api/polymarket/positions?user=${id}&limit=100&sortBy=CASHPNL&sortDirection=DESC`),
        fetch(`/api/polymarket/trades?user=${id}&limit=500`),
      ])

      if (leaderboardRes.ok) {
        const leaderboardData = await leaderboardRes.json()
        setProfile(leaderboardData[0] || null)
      }

      if (positionsRes.ok) {
        const positionsData = await positionsRes.json()
        setPositions(positionsData)
      }

      if (tradesRes.ok) {
        const tradesData = await tradesRes.json()
        setTrades(tradesData)
      }
    } catch (err) {
      console.error('Error fetching trader data:', err)
      setError('Failed to load trader data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTraderData()
  }, [id])

  const copyWallet = () => {
    navigator.clipboard.writeText(id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const totalUnrealizedPnl = positions.reduce((sum, p) => sum + (p.cashPnl || 0), 0)
  const totalPositionValue = positions.reduce((sum, p) => sum + (p.currentValue || 0), 0)

  // Calculate cumulative PnL by date
  const pnlByDate = trades
    .slice()
    .reverse()
    .reduce<Map<string, number>>((acc, trade) => {
      const date = formatShortDate(trade.timestamp)
      // Calculate trade PnL: SELL = profit, BUY = cost
      const tradePnl = trade.side === 'SELL' 
        ? trade.size * trade.price 
        : -trade.size * trade.price
      acc.set(date, (acc.get(date) || 0) + tradePnl)
      return acc
    }, new Map())

  // Convert to cumulative chart data
  const equityCurve = Array.from(pnlByDate.entries())
    .map(([date, dailyPnl]) => ({ date, dailyPnl }))
    .reduce<{ date: string; value: number }[]>((acc, { date, dailyPnl }) => {
      const prevValue = acc.length > 0 ? acc[acc.length - 1].value : 0
      acc.push({
        date,
        value: prevValue + dailyPnl,
      })
      return acc
    }, [])

  return (
    <AppShell
      title={profile?.userName || formatAddress(id)}
      subtitle="Trader Profile"
    >
      <div className="space-y-6">
        {/* Back Button */}
        <div>
          <Link href="/">
            <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground text-xs uppercase tracking-wider">
              <ArrowLeft className="h-4 w-4" />
              Leaderboard
            </Button>
          </Link>
        </div>

        {error && (
          <div className="sharp-panel p-6 text-center">
            <p className="text-destructive text-sm mb-4">{error}</p>
            <Button onClick={fetchTraderData} variant="outline" className="border-border bg-transparent uppercase text-xs tracking-wider">
              Retry
            </Button>
          </div>
        )}

        {/* Header */}
        <div className="sharp-panel p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {isLoading ? (
                <Skeleton className="h-14 w-14" />
              ) : profile?.profileImage ? (
                <div className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0 bg-background">
                  <Image
                    src={profile.profileImage || "/placeholder.svg"}
                    alt={profile.userName || 'Trader'}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center bg-secondary text-foreground text-base font-mono rounded-full flex-shrink-0">
                  {(profile?.userName || id.slice(2, 4)).toUpperCase().slice(0, 2)}
                </div>
              )}
              <div>
                {isLoading ? (
                  <Skeleton className="h-7 w-40" />
                ) : (
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-foreground tracking-wide">
                      {profile?.userName || formatAddress(id)}
                    </h2>
                    {profile?.verifiedBadge && (
                      <span className="inline-flex items-center border border-primary/50 px-2 py-0.5 text-[9px] font-medium text-primary uppercase tracking-wider">
                        Verified
                      </span>
                    )}
                  </div>
                )}
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground font-mono">
                  {formatAddress(id)}
                  <button
                    onClick={copyWallet}
                    className="hover:text-foreground transition-colors duration-150"
                  >
                    {copied ? (
                      <span className="text-success text-[10px] uppercase">Copied</span>
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <a
                    href={`https://polymarket.com/profile/${id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors duration-150"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                {profile?.xUsername && (
                  <a
                    href={`https://twitter.com/${profile.xUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150"
                  >
                    @{profile.xUsername}
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FollowButton
                traderAddress={id}
                traderName={profile?.userName}
                variant="both"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={fetchTraderData}
                disabled={isLoading}
                className="border-border bg-transparent h-9 w-9"
              >
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
              <a
                href={`https://polymarket.com/profile/${id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="gap-2 bg-foreground text-background hover:bg-foreground/90 text-xs uppercase tracking-wider">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Polymarket
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* KPI Cards - Horizontal aligned */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            label="Total PnL"
            value={formatPnl(profile?.pnl || 0)}
            trend={(profile?.pnl || 0) >= 0 ? 'up' : 'down'}
            isLoading={isLoading}
          />
          <KpiCard
            label="Volume"
            value={formatVolume(profile?.vol || 0)}
            isLoading={isLoading}
          />
          <KpiCard
            label="Position Value"
            value={formatVolume(totalPositionValue)}
            isLoading={isLoading}
          />
          <KpiCard
            label="Unrealized PnL"
            value={formatPnl(totalUnrealizedPnl)}
            trend={totalUnrealizedPnl >= 0 ? 'up' : 'down'}
            isLoading={isLoading}
          />
        </div>

        {/* PnL Chart */}
        {equityCurve.length > 1 && (() => {
          const lastValue = equityCurve[equityCurve.length - 1]?.value ?? 0
          const chartColor = lastValue >= 0 ? '#22c55e' : '#ef4444'
          return (
            <div className="sharp-panel p-4">
              <h3 className="mb-4 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Cumulative PnL ({equityCurve.length} days)
              </h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equityCurve}>
                    <defs>
                      <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColor} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                      tickFormatter={(val) => val.slice(5)}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                      tickFormatter={(val) => {
                        if (Math.abs(val) >= 1000) return `$${(val / 1000).toFixed(0)}k`
                        return `$${val.toFixed(0)}`
                      }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '0',
                        fontSize: '11px',
                        color: '#fff',
                      }}
                      formatter={(value: number) => [
                        `${value >= 0 ? '+' : ''}$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                        'PnL'
                      ]}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={chartColor}
                      strokeWidth={2}
                      fill="url(#pnlGradient)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )
        })()}

        {/* Tabs - Sharp style */}
        <div className="sharp-panel">
          <Tabs defaultValue="positions">
            <TabsList className="w-full justify-start border-b border-border bg-transparent p-0">
              <TabsTrigger 
                value="positions" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 text-xs uppercase tracking-wider"
              >
                Positions ({positions.length})
              </TabsTrigger>
              <TabsTrigger 
                value="history"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 text-xs uppercase tracking-wider"
              >
                History ({trades.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="positions" className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                        Market
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                        Side
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                        Size
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                        Avg
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                        Current
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                        PnL
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-12 mx-auto" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-12 ml-auto" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-12 ml-auto" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
                        </tr>
                      ))
                    ) : positions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">
                          No open positions
                        </td>
                      </tr>
                    ) : (
                      positions.map((pos) => (
                        <tr key={`${pos.conditionId}-${pos.outcomeIndex}`} className="border-b border-border/50 row-hover">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {pos.icon && (
                                <Image
                                  src={pos.icon || "/placeholder.svg"}
                                  alt=""
                                  width={20}
                                  height={20}
                                  className="h-5 w-5"
                                />
                              )}
                              <div>
                                <p className="text-sm text-foreground max-w-[220px] truncate">
                                  {pos.title}
                                </p>
                                <p className="text-[10px] text-muted-foreground uppercase">{pos.outcome}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={cn(
                                'inline-flex border px-2 py-0.5 text-[10px] font-medium uppercase',
                                pos.outcome?.toLowerCase() === 'yes'
                                  ? 'border-success/50 text-success'
                                  : 'border-destructive/50 text-destructive'
                              )}
                            >
                              {pos.outcome}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono text-foreground">
                            {pos.size?.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono text-muted-foreground">
                            {((pos.avgPrice || 0) * 100).toFixed(1)}c
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono text-muted-foreground">
                            {((pos.curPrice || 0) * 100).toFixed(1)}c
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={cn(
                              'text-sm font-mono',
                              (pos.cashPnl || 0) >= 0 ? 'text-success' : 'text-destructive'
                            )}>
                              {formatPnl(pos.cashPnl || 0)}
                            </span>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {(pos.percentPnl || 0) >= 0 ? '+' : ''}{(pos.percentPnl || 0).toFixed(1)}%
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="history" className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                        Time
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                        Market
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                        Action
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                        Size
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                        Price
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                        Tx
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-16 mx-auto" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-12 ml-auto" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-8 mx-auto" /></td>
                        </tr>
                      ))
                    ) : trades.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">
                          No trade history
                        </td>
                      </tr>
                    ) : (
                      trades.map((trade, i) => (
                        <tr key={`${trade.transactionHash}-${i}`} className="border-b border-border/50 row-hover">
                          <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                            {timeAgo(trade.timestamp)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {trade.icon && (
                                <Image
                                  src={trade.icon || "/placeholder.svg"}
                                  alt=""
                                  width={20}
                                  height={20}
                                  className="h-5 w-5"
                                />
                              )}
                              <div>
                                <p className="text-sm text-foreground max-w-[180px] truncate">
                                  {trade.title}
                                </p>
                                <p className="text-[10px] text-muted-foreground uppercase">{trade.outcome}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={cn(
                                'inline-flex border px-2 py-0.5 text-[10px] font-medium uppercase',
                                trade.side === 'BUY'
                                  ? 'border-success/50 text-success'
                                  : 'border-destructive/50 text-destructive'
                              )}
                            >
                              {trade.side}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono text-foreground">
                            {trade.size?.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono text-muted-foreground">
                            {((trade.price || 0) * 100).toFixed(1)}c
                          </td>
                          <td className="px-4 py-3 text-center">
                            {trade.transactionHash && (
                              <a
                                href={`https://polygonscan.com/tx/${trade.transactionHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center p-1 text-muted-foreground hover:text-foreground transition-colors duration-150"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Data Source */}
        <div className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          Live data from Polymarket
        </div>
      </div>
    </AppShell>
  )
}
