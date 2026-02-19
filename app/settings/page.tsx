'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Mail, MessageCircle, Check, Loader2 } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const [profileForm, setProfileForm] = useState({
    display_name: '',
    email: '',
    telegram_handle: '',
    polymarket_wallet: '',
  })

  const [notifications, setNotifications] = useState({
    large_trade_alerts: true,
    portfolio_updates: true,
    market_signals: false,
    daily_digest: false,
  })

  // Load data from Supabase on mount
  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUserId(user.id)

      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        setProfileForm({
          display_name: profile.display_name || '',
          email: profile.email || user.email || '',
          telegram_handle: profile.telegram_handle || '',
          polymarket_wallet: profile.polymarket_wallet || '',
        })
      }

      // Load notification settings
      const { data: notifSettings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (notifSettings) {
        setNotifications({
          large_trade_alerts: notifSettings.large_trade_alerts,
          portfolio_updates: notifSettings.portfolio_updates,
          market_signals: notifSettings.market_signals,
          daily_digest: notifSettings.daily_digest,
        })
      }

      setLoading(false)
    }
    loadData()
  }, [])

  const handleSave = async () => {
    if (!userId) return
    setSaving(true)

    // Update profile
    await supabase
      .from('profiles')
      .update({
        display_name: profileForm.display_name,
        telegram_handle: profileForm.telegram_handle,
        polymarket_wallet: profileForm.polymarket_wallet,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    // Update notification settings
    await supabase
      .from('notification_settings')
      .update(notifications)
      .eq('user_id', userId)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) {
    return (
      <AppShell title="Settings">
        <div className="max-w-3xl space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Settings">
      <div className="max-w-3xl space-y-6">
        {/* Profile Settings */}
        <div className="sharp-panel p-6">
          <div className="mb-6">
            <h2 className="font-medium text-foreground">Profile Settings</h2>
            <p className="text-sm text-muted-foreground">Update your display name and contact info</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-foreground">Display Name</Label>
              <Input
                id="displayName"
                placeholder="Enter your display name"
                value={profileForm.display_name}
                onChange={(e) => setProfileForm({ ...profileForm, display_name: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profileForm.email}
                disabled
                className="bg-secondary/50 border-border text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">Email is managed through your account</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wallet" className="text-foreground">Polymarket Wallet</Label>
              <Input
                id="wallet"
                placeholder="0x..."
                value={profileForm.polymarket_wallet}
                onChange={(e) => setProfileForm({ ...profileForm, polymarket_wallet: e.target.value })}
                className="bg-secondary border-border font-mono"
              />
              <p className="text-xs text-muted-foreground">Your Polymarket wallet address for dashboard stats</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telegram" className="text-foreground">Telegram Username</Label>
              <Input
                id="telegram"
                placeholder="@username"
                value={profileForm.telegram_handle}
                onChange={(e) => setProfileForm({ ...profileForm, telegram_handle: e.target.value })}
                className="bg-secondary border-border"
              />
              <p className="text-xs text-muted-foreground">Connect your Telegram for real-time alerts</p>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="sharp-panel p-6">
          <div className="mb-6">
            <h2 className="font-medium text-foreground">Notification Settings</h2>
            <p className="text-sm text-muted-foreground">Choose how you want to receive alerts</p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-foreground">Large Trade Alerts</div>
                  <div className="text-xs text-muted-foreground">Get notified when tracked wallets make large trades</div>
                </div>
              </div>
              <Switch
                checked={notifications.large_trade_alerts}
                onCheckedChange={(checked) => setNotifications({ ...notifications, large_trade_alerts: checked })}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-foreground">Portfolio Updates</div>
                  <div className="text-xs text-muted-foreground">Updates on your linked portfolio performance</div>
                </div>
              </div>
              <Switch
                checked={notifications.portfolio_updates}
                onCheckedChange={(checked) => setNotifications({ ...notifications, portfolio_updates: checked })}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm text-foreground">Market Signals</div>
                <div className="text-xs text-muted-foreground">Smart money movement alerts</div>
              </div>
              <Switch
                checked={notifications.market_signals}
                onCheckedChange={(checked) => setNotifications({ ...notifications, market_signals: checked })}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm text-foreground">Daily Digest</div>
                <div className="text-xs text-muted-foreground">Daily summary of top performers and trends</div>
              </div>
              <Switch
                checked={notifications.daily_digest}
                onCheckedChange={(checked) => setNotifications({ ...notifications, daily_digest: checked })}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" className="border-border bg-secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className={cn(saved && 'bg-[#22c55e] hover:bg-[#22c55e]/90')}>
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
            ) : saved ? (
              <><Check className="mr-2 h-4 w-4" />Saved!</>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </AppShell>
  )
}
