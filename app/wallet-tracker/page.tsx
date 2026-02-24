'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import { SmartScoreBadge } from '@/components/trader/smart-score-badge'
import { WalletAvatar } from '@/components/trader/wallet-avatar'
import {
  type LeaderboardTrader,
  type UserTrade,
  formatPnl,
  formatVolume,
  formatAddress,
  timeAgo,
} from '@/lib/polymarket-api'
import { cn } from '@/lib/utils'
import {
  Plus,
  Trash2,
  ExternalLink,
  LogIn,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

// ---- Smart score calculation (matches leaderboard) ----
function calculateSmartScore(pnl: number, volume: number, rank: number): number {
  const pnlScore = Math.min(pnl / 10000, 40)
  const volumeScore = Math.min(volume / 100000, 30)
  const rankScore = Math.max(30 - rank, 0)
  return Math.round(Math.max(0, Math.min(100, pnlScore + volumeScore + rankScore)) * 100) / 100
}

function riskEfficiency(pnl: number, vol: number): number {
  if (vol === 0) return 0
  return Math.min(100, Math.max(0, (pnl / vol) * 100 + 50))
}

function profitability(pnl: number): number {
  return Math.min(100, Math.max(0, 50 + (pnl / 20000) * 50))
}

// ---- Types ----
type TrackedWallet = {
  id: string
  address: string
  label: string
  alertsEnabled: boolean
  profile?: LeaderboardTrader
  recentTrades?: UserTrade[]
  isLoading?: boolean
}

type FeedItem = {
  traderName: string
  traderAddress: string
  traderImage?: string
  trade: UserTrade
}

// ---- Trader card (left column) ----
function TraderCard({
  wallet,
  onDelete,
}: {
  wallet: TrackedWallet
  onDelete: () => void
}) {
  const pnl = wallet.profile?.pnl || 0
  const volume = wallet.profile?.vol || 0
  const rank = wallet.profile?.rank || 999
  const smartScore = calculateSmartScore(pnl, volume, rank)
  const riskEff = riskEfficiency(pnl, volume)
  const prof = profitability(pnl)

  return (
    <div className="sharp-panel p-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <Link href={`/trader/${wallet.address}`} className="flex items-center gap-3 group">
          {wallet.profile?.profileImage ? (
            <Image
              src={wallet.profile.profileImage}
              alt={wallet.label}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <WalletAvatar wallet={wallet.address} size={40} />
          )}
          <div>
            <div className="font-medium text-foreground group-hover:underline">{wallet.label}</div>
            <div className="text-xs text-muted-foreground font-mono">{formatAddress(wallet.address)}</div>
          </div>
        </Link>
        <Button variant="ghost" size="icon" onClick={onDelete} className="text-muted-foreground hover:text-red-500 h-7 w-7">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Volume / PnL */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Volume</div>
          {wallet.isLoading ? <Skeleton className="h-7 w-24 mt-1" /> : (
            <div className="text-xl font-bold text-foreground tabular-nums mt-0.5">{formatVolume(volume)}</div>
          )}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">PnL</div>
          {wallet.isLoading ? <Skeleton className="h-7 w-24 mt-1" /> : (
            <div className={cn('text-xl font-bold tabular-nums mt-0.5', pnl >= 0 ? 'text-[#22c55e]' : 'text-red-500')}>
              {pnl >= 0 ? '+' : ''}{formatPnl(pnl)}
            </div>
          )}
        </div>
      </div>

      {/* Smart Score */}
      {!wallet.isLoading && (
        <div className="mt-4">
          <div className="rounded-lg bg-score/10 border border-score/20 px-3 py-2">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Smart Score</div>
            <div className="text-xl font-bold tabular-nums text-score">{smartScore.toFixed(2)}</div>
            <div className="mt-1.5 h-1.5 bg-secondary overflow-hidden rounded-full">
              <div className="h-full bg-[#22c55e] transition-all duration-500 rounded-full" style={{ width: `${smartScore}%` }} />
            </div>
          </div>

          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Risk Efficiency</span>
              <span className="font-semibold tabular-nums text-foreground">{riskEff.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Profitability</span>
              <span className="font-semibold tabular-nums text-foreground">{prof.toFixed(2)}</span>
            </div>
          </div>
          <p className="mt-2 text-[9px] text-muted-foreground/50 leading-relaxed">
            Scores are adjusted for recency, profit, and experience
          </p>
        </div>
      )}
    </div>
  )
}

// ---- Feed item ----
function FeedEntry({ item }: { item: FeedItem }) {
  const { trade, traderName, traderAddress, traderImage } = item
  const isBuy = trade.side === 'BUY'

  return (
    <div className="py-4 border-b border-border last:border-0">
      {/* Trader + time */}
      <div className="flex items-center justify-between mb-2">
        <Link href={`/trader/${traderAddress}`} className="flex items-center gap-2 group">
          {traderImage ? (
            <Image src={traderImage} alt={traderName} width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
          ) : (
            <WalletAvatar wallet={traderAddress} size={28} />
          )}
          <span className="text-sm font-medium text-foreground group-hover:underline">{traderName}</span>
        </Link>
        <span className="text-xs text-muted-foreground">{timeAgo(trade.timestamp)}</span>
      </div>

      {/* Market title + side */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-sm text-foreground leading-snug">{trade.title || 'Unknown Market'}</span>
        <span className={cn(
          'flex-shrink-0 inline-flex px-2 py-0.5 rounded text-xs font-semibold',
          isBuy ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-red-500/20 text-red-500'
        )}>
          {isBuy ? 'Yes' : 'No'}
        </span>
      </div>

      {/* Trade details */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Date & Time</span>
          <span className="text-foreground tabular-nums">
            {new Date(trade.timestamp < 1e12 ? trade.timestamp * 1000 : trade.timestamp)
              .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Amount</span>
          <span className="text-foreground font-semibold tabular-nums">
            ${trade.size >= 1000 ? (trade.size / 1000).toFixed(1) + 'k' : trade.size?.toFixed(2) || '0'}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Entry Price</span>
          <span className="text-foreground font-semibold tabular-nums">
            {((trade.price || 0) * 100).toFixed(1)}c
          </span>
        </div>
      </div>
    </div>
  )
}

// ---- Main page ----
export default function WalletTrackerPage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<{ id: string } | null>(null)
  const [wallets, setWallets] = useState<TrackedWallet[]>([])
  const [newAddress, setNewAddress] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  // Build combined feed from all wallets' trades
  const feedItems: FeedItem[] = wallets
    .flatMap(w =>
      (w.recentTrades || []).map(trade => ({
        traderName: w.label,
        traderAddress: w.address,
        traderImage: w.profile?.profileImage,
        trade,
      }))
    )
    .sort((a, b) => {
      const ta = typeof a.trade.timestamp === 'number' ? a.trade.timestamp : 0
      const tb = typeof b.trade.timestamp === 'number' ? b.trade.timestamp : 0
      return tb - ta
    })
    .slice(0, 50)

  // Load user + wallets
  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsInitialLoading(false)
        return
      }
      setUser(user)

      // Load tracked wallets
      const { data: savedWallets } = await supabase
        .from('tracked_wallets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      // Load followed traders
      const { data: followedTraders } = await supabase
        .from('followed_traders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const trackedAddresses = new Set((savedWallets || []).map(w => w.wallet_address.toLowerCase()))
      const allWallets = [
        ...(savedWallets || []).map(w => ({
          id: w.id,
          address: w.wallet_address,
          label: w.label || formatAddress(w.wallet_address),
          alertsEnabled: w.alerts_enabled,
          isLoading: true,
          source: 'tracked' as const,
        })),
        ...(followedTraders || [])
          .filter(f => !trackedAddresses.has(f.trader_address.toLowerCase()))
          .map(f => ({
            id: f.id,
            address: f.trader_address,
            label: f.trader_name || formatAddress(f.trader_address),
            alertsEnabled: false,
            isLoading: true,
            source: 'followed' as const,
          })),
      ]

      if (allWallets.length > 0) {
        const loaded: TrackedWallet[] = allWallets.map(w => ({
          id: w.id,
          address: w.address,
          label: w.label,
          alertsEnabled: w.alertsEnabled,
          isLoading: true,
        }))
        setWallets(loaded)
        setIsInitialLoading(false)
        loaded.forEach((wallet, i) => fetchWalletData(wallet.address, i, loaded))
      } else {
        setIsInitialLoading(false)
      }
    }
    loadData()
  }, [])

  const fetchWalletData = async (address: string, index: number, currentWallets?: TrackedWallet[]) => {
    try {
      const [profileRes, tradesRes] = await Promise.all([
        fetch(`/api/polymarket/leaderboard?user=${address}&limit=1&timePeriod=ALL`),
        fetch(`/api/polymarket/trades?user=${address}&limit=15`),
      ])

      let profile: LeaderboardTrader | undefined
      let trades: UserTrade[] = []

      if (profileRes.ok) {
        const data = await profileRes.json()
        profile = data[0]
      }
      if (tradesRes.ok) {
        trades = await tradesRes.json()
      }

      setWallets(prev => prev.map((w, i) =>
        i === index ? { ...w, profile, recentTrades: trades, isLoading: false, label: profile?.userName || w.label } : w
      ))
    } catch {
      setWallets(prev => prev.map((w, i) => i === index ? { ...w, isLoading: false } : w))
    }
  }

  const handleAddWallet = async () => {
    if (!newAddress || !user) return
    const label = newLabel || formatAddress(newAddress)

    const { data: inserted, error } = await supabase
      .from('tracked_wallets')
      .insert({
        user_id: user.id,
        wallet_address: newAddress,
        label: newLabel || null,
        alerts_enabled: true,
      })
      .select()
      .single()

    if (error) return

    const newWallet: TrackedWallet = {
      id: inserted.id,
      address: newAddress,
      label,
      alertsEnabled: true,
      isLoading: true,
    }

    const updatedWallets = [newWallet, ...wallets]
    setWallets(updatedWallets)
    setNewAddress('')
    setNewLabel('')
    setDialogOpen(false)
    fetchWalletData(newAddress, 0, updatedWallets)
  }

  const handleDelete = async (index: number) => {
    const wallet = wallets[index]
    await Promise.all([
      supabase.from('tracked_wallets').delete().eq('id', wallet.id),
      supabase.from('followed_traders').delete().eq('id', wallet.id),
      user ? supabase.from('tracked_wallets').delete().eq('user_id', user.id).eq('wallet_address', wallet.address) : Promise.resolve(),
      user ? supabase.from('followed_traders').delete().eq('user_id', user.id).eq('trader_address', wallet.address) : Promise.resolve(),
    ])
    setWallets(wallets.filter((_, i) => i !== index))
  }

  const totalPnl = wallets.reduce((sum, w) => sum + (w.profile?.pnl || 0), 0)
  const totalVolume = wallets.reduce((sum, w) => sum + (w.profile?.vol || 0), 0)

  // Not logged in
  if (!user && !isInitialLoading) {
    return (
      <AppShell title="Wallet Tracker">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="sharp-panel p-12 text-center max-w-md">
            <LogIn className="h-16 w-16 text-muted-foreground mx-auto" />
            <h2 className="mt-6 text-xl font-bold text-foreground">Sign In Required</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Sign in to track Polymarket wallets and see their recent trades.
            </p>
            <Button onClick={() => router.push('/auth/login')} className="mt-6" size="lg">
              Sign In
            </Button>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Wallet Tracker">
      <div className="space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold text-foreground font-mono">Watchlist</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">Traders you follow and their recent trades</p>
        </div>

        {/* Combined stats bar */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="sharp-panel p-4">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Tracked Wallets</div>
            <div className="text-2xl font-bold text-foreground tabular-nums mt-1">{wallets.length}</div>
          </div>
          <div className="sharp-panel p-4">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Combined PnL</div>
            <div className={cn('text-2xl font-bold tabular-nums mt-1', totalPnl >= 0 ? 'text-[#22c55e]' : 'text-red-500')}>
              {formatPnl(totalPnl)}
            </div>
          </div>
          <div className="sharp-panel p-4">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Combined Volume</div>
            <div className="text-2xl font-bold text-foreground tabular-nums mt-1">{formatVolume(totalVolume)}</div>
          </div>
          <div className="sharp-panel p-4">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Recent Trades</div>
            <div className="text-2xl font-bold text-foreground tabular-nums mt-1">{feedItems.length}</div>
          </div>
        </div>

        {/* Loading */}
        {isInitialLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="sharp-panel p-4">
                  <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-32" /></div></div>
                  <div className="mt-4 grid grid-cols-2 gap-4"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
                </div>
              ))}
            </div>
            <div className="sharp-panel p-4">
              <Skeleton className="h-6 w-20 mb-4" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="py-4 border-b border-border"><Skeleton className="h-5 w-full mb-2" /><Skeleton className="h-4 w-3/4" /></div>
              ))}
            </div>
          </div>
        )}

        {/* Empty */}
        {!isInitialLoading && wallets.length === 0 && user && (
          <div className="sharp-panel p-12 text-center">
            <Plus className="h-16 w-16 text-muted-foreground mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-foreground">No wallets tracked yet</h3>
            <p className="mt-2 text-muted-foreground">Follow traders or add wallet addresses to start tracking their activity.</p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="h-4 w-4" />Add Wallet</Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader><DialogTitle className="text-foreground">Add Wallet to Track</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label className="text-foreground">Wallet Address</Label>
                      <Input placeholder="0x..." value={newAddress} onChange={(e) => setNewAddress(e.target.value)} className="bg-secondary border-border font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Label (optional)</Label>
                      <Input placeholder="e.g., Whale Alpha" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="bg-secondary border-border" />
                    </div>
                    <Button onClick={handleAddWallet} className="w-full" disabled={!newAddress}>Add Wallet</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={() => router.push('/')} className="border-border bg-transparent">
                Browse Leaderboard
              </Button>
            </div>
          </div>
        )}

        {/* Main layout: Left = trader cards, Right = feed */}
        {!isInitialLoading && wallets.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
            {/* LEFT: Trader cards */}
            <div>
              <div className="text-sm font-semibold text-muted-foreground mb-3">
                Following ({wallets.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {wallets.map((wallet, index) => (
                  <TraderCard
                    key={wallet.id}
                    wallet={wallet}
                    onDelete={() => handleDelete(index)}
                  />
                ))}
              </div>

              {/* Follow More Traders CTA */}
              <div className="mt-6 flex flex-col items-center gap-2">
                <div className="flex items-center gap-3">
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <button className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group cursor-pointer">
                        <div className="h-10 w-10 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center group-hover:border-foreground/50 transition-colors">
                          <Plus className="h-5 w-5" />
                        </div>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader><DialogTitle className="text-foreground">Add Wallet to Track</DialogTitle></DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label className="text-foreground">Wallet Address</Label>
                          <Input placeholder="0x..." value={newAddress} onChange={(e) => setNewAddress(e.target.value)} className="bg-secondary border-border font-mono" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground">Label (optional)</Label>
                          <Input placeholder="e.g., Whale Alpha" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="bg-secondary border-border" />
                        </div>
                        <Button onClick={handleAddWallet} className="w-full" disabled={!newAddress}>Add Wallet</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-foreground">Follow More Traders</div>
                  <div className="text-xs text-muted-foreground">Discover top performers</div>
                </div>
              </div>
            </div>

            {/* RIGHT: Feed */}
            <div className="sharp-panel p-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto custom-scrollbar">
              <div className="mb-2">
                <h3 className="text-lg font-bold text-foreground font-mono">Feed</h3>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Refreshes every 2 minutes</p>
              </div>

              {feedItems.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  No recent trades from tracked wallets yet.
                </div>
              ) : (
                feedItems.map((item, i) => (
                  <FeedEntry key={`${item.traderAddress}-${item.trade.timestamp}-${i}`} item={item} />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
