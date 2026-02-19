'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
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
  Bell,
  BellOff,
  Trash2,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  LogIn,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

type TrackedWallet = {
  id: string
  address: string
  label: string
  alertsEnabled: boolean
  profile?: LeaderboardTrader
  recentTrades?: UserTrade[]
  isLoading?: boolean
}

function WalletCard({
  wallet,
  onToggleAlerts,
  onDelete,
  onRefresh,
}: {
  wallet: TrackedWallet
  onToggleAlerts: () => void
  onDelete: () => void
  onRefresh: () => void
}) {
  const pnl = wallet.profile?.pnl || 0
  const volume = wallet.profile?.vol || 0
  const recentTradesCount = wallet.recentTrades?.length || 0
  const lastTrade = wallet.recentTrades?.[0]

  return (
    <div className="sharp-panel p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {wallet.profile?.profileImage ? (
            <Image
              src={wallet.profile.profileImage}
              alt={wallet.label}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center bg-foreground/20 text-foreground font-semibold">
              {wallet.label.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{wallet.label}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
              {formatAddress(wallet.address)}
              <Link href={`/trader/${wallet.address}`} className="hover:text-foreground transition-colors">
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onRefresh} disabled={wallet.isLoading} className="text-muted-foreground hover:text-foreground h-8 w-8">
            <RefreshCw className={cn('h-4 w-4', wallet.isLoading && 'animate-spin')} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onToggleAlerts} className={cn('h-8 w-8', wallet.alertsEnabled ? 'text-[#22c55e]' : 'text-muted-foreground')}>
            {wallet.alertsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-muted-foreground hover:text-red-500 h-8 w-8">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div>
          <div className="text-xs text-muted-foreground">Total PnL</div>
          {wallet.isLoading ? <Skeleton className="h-6 w-20 mt-1" /> : (
            <div className={cn('text-lg font-semibold flex items-center gap-1', pnl >= 0 ? 'text-[#22c55e]' : 'text-red-500')}>
              {pnl >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {formatPnl(pnl)}
            </div>
          )}
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Volume</div>
          {wallet.isLoading ? <Skeleton className="h-6 w-20 mt-1" /> : (
            <div className="text-lg font-semibold text-foreground">{formatVolume(volume)}</div>
          )}
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Recent Trades</div>
          {wallet.isLoading ? <Skeleton className="h-6 w-12 mt-1" /> : (
            <div className="text-lg font-semibold text-foreground flex items-center gap-1">
              <Activity className="h-4 w-4" />{recentTradesCount}
            </div>
          )}
        </div>
      </div>

      {lastTrade && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground mb-2">Last Trade</div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn('inline-flex px-2 py-0.5 text-xs font-medium', lastTrade.side === 'BUY' ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-red-500/20 text-red-500')}>
                {lastTrade.side}
              </span>
              <span className="text-sm text-foreground truncate max-w-[150px]">{lastTrade.title}</span>
            </div>
            <span className="text-xs text-muted-foreground">{timeAgo(lastTrade.timestamp)}</span>
          </div>
        </div>
      )}

      {wallet.profile?.rank && (
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <Badge variant="secondary" className="text-xs">Rank #{wallet.profile.rank}</Badge>
          <div className="flex items-center gap-2">
            <Switch id={`alerts-${wallet.id}`} checked={wallet.alertsEnabled} onCheckedChange={onToggleAlerts} />
            <Label htmlFor={`alerts-${wallet.id}`} className="text-xs text-muted-foreground">Alerts</Label>
          </div>
        </div>
      )}
    </div>
  )
}

export default function WalletTrackerPage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<{ id: string } | null>(null)
  const [wallets, setWallets] = useState<TrackedWallet[]>([])
  const [newAddress, setNewAddress] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  // Load user and their tracked wallets from Supabase
  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        // Show sign-in prompt for non-logged-in users
        setIsInitialLoading(false)
        return
      }
      setUser(user)

      // Load tracked wallets from DB
      const { data: savedWallets } = await supabase
        .from('tracked_wallets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (savedWallets && savedWallets.length > 0) {
        const loadedWallets: TrackedWallet[] = savedWallets.map((w) => ({
          id: w.id,
          address: w.wallet_address,
          label: w.label || formatAddress(w.wallet_address),
          alertsEnabled: w.alerts_enabled,
          isLoading: true,
        }))
        setWallets(loadedWallets)
        setIsInitialLoading(false)

        // Fetch live data for each wallet
        loadedWallets.forEach((wallet, i) => fetchWalletData(wallet.address, i, loadedWallets))
      } else {
        setIsInitialLoading(false)
      }
    }
    loadData()
  }, [])

  const fetchWalletData = async (address: string, index: number, currentWallets?: TrackedWallet[]) => {
    try {
      const [profileRes, tradesRes] = await Promise.all([
        fetch(`/api/polymarket/leaderboard?user=${address}&limit=1`),
        fetch(`/api/polymarket/trades?user=${address}&limit=10`),
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

    // Save to Supabase
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

    if (error) {
      console.error('Error adding wallet:', error)
      return
    }

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

    // Fetch live data
    fetchWalletData(newAddress, 0, updatedWallets)
  }

  const handleToggleAlerts = async (index: number) => {
    const wallet = wallets[index]
    const newValue = !wallet.alertsEnabled

    setWallets(wallets.map((w, i) => i === index ? { ...w, alertsEnabled: newValue } : w))

    await supabase
      .from('tracked_wallets')
      .update({ alerts_enabled: newValue })
      .eq('id', wallet.id)
  }

  const handleDelete = async (index: number) => {
    const wallet = wallets[index]

    await supabase
      .from('tracked_wallets')
      .delete()
      .eq('id', wallet.id)

    setWallets(wallets.filter((_, i) => i !== index))
  }

  const refreshWallet = (index: number) => {
    setWallets(prev => prev.map((w, i) => i === index ? { ...w, isLoading: true } : w))
    fetchWalletData(wallets[index].address, index)
  }

  const totalPnl = wallets.reduce((sum, w) => sum + (w.profile?.pnl || 0), 0)
  const totalVolume = wallets.reduce((sum, w) => sum + (w.profile?.vol || 0), 0)
  const alertsEnabled = wallets.filter(w => w.alertsEnabled).length

  // Not logged in state
  if (!user && !isInitialLoading) {
    return (
      <AppShell title="Wallet Tracker">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="sharp-panel p-12 text-center max-w-md">
            <LogIn className="h-16 w-16 text-muted-foreground mx-auto" />
            <h2 className="mt-6 text-xl font-bold text-foreground">Sign In Required</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Sign in to track Polymarket wallets. Your tracked wallets will be saved to your account.
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
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="sharp-panel p-4">
            <div className="text-xs text-muted-foreground">Tracked Wallets</div>
            <div className="text-2xl font-bold text-foreground mt-1">{wallets.length}</div>
          </div>
          <div className="sharp-panel p-4">
            <div className="text-xs text-muted-foreground">Combined PnL</div>
            <div className={cn('text-2xl font-bold mt-1', totalPnl >= 0 ? 'text-[#22c55e]' : 'text-red-500')}>
              {formatPnl(totalPnl)}
            </div>
          </div>
          <div className="sharp-panel p-4">
            <div className="text-xs text-muted-foreground">Combined Volume</div>
            <div className="text-2xl font-bold text-foreground mt-1">{formatVolume(totalVolume)}</div>
          </div>
          <div className="sharp-panel p-4">
            <div className="text-xs text-muted-foreground">Alerts Active</div>
            <div className="text-2xl font-bold text-[#22c55e] mt-1">{alertsEnabled}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />Add Wallet</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Add Wallet to Track</DialogTitle>
              </DialogHeader>
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

          <Button variant="outline" onClick={() => wallets.forEach((_, i) => refreshWallet(i))} className="gap-2 border-border bg-transparent">
            <RefreshCw className="h-4 w-4" />Refresh All
          </Button>
        </div>

        {/* Loading State */}
        {isInitialLoading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="sharp-panel p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12" />
                  <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-32" /></div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isInitialLoading && wallets.length === 0 && user && (
          <div className="sharp-panel p-12 text-center">
            <Plus className="h-16 w-16 text-muted-foreground mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-foreground">No wallets tracked yet</h3>
            <p className="mt-2 text-muted-foreground">Add wallet addresses to start tracking their activity. Your wallets are saved to your account.</p>
            <Button onClick={() => setDialogOpen(true)} className="mt-4">Add Your First Wallet</Button>
          </div>
        )}

        {/* Wallet Grid */}
        {!isInitialLoading && wallets.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {wallets.map((wallet, index) => (
              <WalletCard
                key={wallet.id}
                wallet={wallet}
                onToggleAlerts={() => handleToggleAlerts(index)}
                onDelete={() => handleDelete(index)}
                onRefresh={() => refreshWallet(index)}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
