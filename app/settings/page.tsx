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
import { Check, Loader2, Bell, Zap, Users, BarChart3, Send, ExternalLink, Copy } from 'lucide-react'

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

  // Real DB columns from notification_settings
  const [notifications, setNotifications] = useState({
    large_trade_alerts: true,
    new_market_alerts: false,
    whale_alerts: true,
    weekly_report: true,
  })

  // Telegram bot settings
  const [telegramChatId, setTelegramChatId] = useState('')
  const [telegramEnabled, setTelegramEnabled] = useState(false)
  const [telegramLinked, setTelegramLinked] = useState(false)
  const [linkingCode, setLinkingCode] = useState('')
  const [linkingCodeExpires, setLinkingCodeExpires] = useState('')
  const [generatingCode, setGeneratingCode] = useState(false)

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
        // Check if telegram is linked
        if (profile.telegram_chat_id) {
          setTelegramChatId(profile.telegram_chat_id)
          setTelegramLinked(true)
          setTelegramEnabled(true)
        }
      }

      // Load notification settings
      const { data: notifSettings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('id', user.id)
        .single()

      if (notifSettings) {
        setNotifications({
          large_trade_alerts: notifSettings.large_trade_alerts ?? true,
          new_market_alerts: notifSettings.new_market_alerts ?? false,
          whale_alerts: notifSettings.whale_alerts ?? true,
          weekly_report: notifSettings.weekly_report ?? true,
        })
        // Also check telegram fields if they exist on notification_settings
        if (notifSettings.telegram_notifications_enabled !== undefined) {
          setTelegramEnabled(notifSettings.telegram_notifications_enabled)
        }
        if (notifSettings.telegram_chat_id) {
          setTelegramChatId(notifSettings.telegram_chat_id)
          setTelegramLinked(true)
        }
      }

      // Load telegram connection status from API
      try {
        const tgRes = await fetch('/api/telegram/link')
        if (tgRes.ok) {
          const tgData = await tgRes.json()
          setTelegramLinked(tgData.connected)
          setTelegramEnabled(tgData.enabled)
          if (tgData.activeCode) {
            setLinkingCode(tgData.activeCode)
            setLinkingCodeExpires(tgData.codeExpiresAt)
          }
        }
      } catch {}

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

    // Upsert notification settings (use id = userId since PK is user id)
    await supabase
      .from('notification_settings')
      .upsert({
        id: userId,
        ...notifications,
        telegram_notifications_enabled: telegramEnabled,
        updated_at: new Date().toISOString(),
      })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleGenerateCode = async () => {
    setGeneratingCode(true)
    try {
      const res = await fetch('/api/telegram/link', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setLinkingCode(data.code)
        setLinkingCodeExpires(data.expiresAt)
      }
    } catch {}
    setGeneratingCode(false)
  }

  const copyLinkingCode = () => {
    navigator.clipboard.writeText(linkingCode)
  }

  const handleUnlinkTelegram = async () => {
    try {
      const res = await fetch('/api/telegram/link', { method: 'DELETE' })
      if (res.ok) {
        setTelegramLinked(false)
        setTelegramChatId('')
        setTelegramEnabled(false)
        setLinkingCode('')
      }
    } catch {}
  }

  if (loading) {
    return (
      <AppShell title="Settings">
        <div className="max-w-3xl space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Settings">
      <div className="max-w-3xl space-y-6">

        {/* ──── Profile Settings ──── */}
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
            </div>
          </div>
        </div>

        {/* ──── Telegram Bot Notifications ──── */}
        <div className="sharp-panel p-6">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-[#26A5E4]" />
                <h2 className="font-medium text-foreground">Telegram Notifications</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Receive real-time alerts about tracked wallet trades directly in Telegram
              </p>
            </div>
            {telegramLinked && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30">
                <Check className="h-3 w-3" /> Connected
              </span>
            )}
          </div>

          {!telegramLinked ? (
            <div className="space-y-4">
              {/* Step-by-step guide */}
              <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">How to connect:</p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex gap-2">
                    <span className="text-primary font-mono font-bold">1.</span>
                    <span>
                      Open our Telegram bot:{' '}
                      <a
                        href="https://t.me/VantakeBot"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#26A5E4] hover:underline inline-flex items-center gap-1"
                      >
                        @VantakeBot <ExternalLink className="h-3 w-3" />
                      </a>
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-primary font-mono font-bold">2.</span>
                    <span>{'Press Start or send /start'}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-primary font-mono font-bold">3.</span>
                    <div className="flex-1">
                      <span>Generate a code and send it to the bot:</span>
                      <div className="mt-2">
                        {linkingCode ? (
                          <div className="flex items-center gap-2">
                            <code className="bg-background px-3 py-1.5 rounded font-mono text-foreground text-sm tracking-widest border border-border">
                              {linkingCode}
                            </code>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={copyLinkingCode}>
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            {linkingCodeExpires && (
                              <span className="text-[10px] text-muted-foreground">
                                Expires in 30 min
                              </span>
                            )}
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[#26A5E4]/30 text-[#26A5E4] hover:bg-[#26A5E4]/10"
                            onClick={handleGenerateCode}
                            disabled={generatingCode}
                          >
                            {generatingCode ? (
                              <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Generating...</>
                            ) : (
                              'Generate Linking Code'
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-primary font-mono font-bold">4.</span>
                    <span>The bot will confirm the link and you will start receiving notifications</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm text-foreground">Enable Telegram Alerts</div>
                  <div className="text-xs text-muted-foreground">Master toggle for all Telegram notifications</div>
                </div>
                <Switch
                  checked={telegramEnabled}
                  onCheckedChange={setTelegramEnabled}
                />
              </div>

              <div className="pl-4 border-l-2 border-border space-y-3">
                <div className="flex items-center justify-between py-1.5">
                  <div>
                    <div className="text-sm text-foreground">Tracked Wallet Trades</div>
                    <div className="text-xs text-muted-foreground">Notify when tracked wallets place bets</div>
                  </div>
                  <Switch
                    checked={telegramEnabled && notifications.large_trade_alerts}
                    disabled={!telegramEnabled}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, large_trade_alerts: checked })}
                  />
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <div>
                    <div className="text-sm text-foreground">Whale Alerts</div>
                    <div className="text-xs text-muted-foreground">Large trades from top traders</div>
                  </div>
                  <Switch
                    checked={telegramEnabled && notifications.whale_alerts}
                    disabled={!telegramEnabled}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, whale_alerts: checked })}
                  />
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <div>
                    <div className="text-sm text-foreground">New Market Alerts</div>
                    <div className="text-xs text-muted-foreground">Interesting new markets on Polymarket</div>
                  </div>
                  <Switch
                    checked={telegramEnabled && notifications.new_market_alerts}
                    disabled={!telegramEnabled}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, new_market_alerts: checked })}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {'Connected to Telegram Chat ID: '}
                  <code className="font-mono text-foreground">{telegramChatId}</code>
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                  onClick={handleUnlinkTelegram}
                >
                  Unlink
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ──── In-App Notification Settings ──── */}
        <div className="sharp-panel p-6">
          <div className="mb-6">
            <h2 className="font-medium text-foreground">In-App Notifications</h2>
            <p className="text-sm text-muted-foreground">Control which alerts appear in your notification feed</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Zap className="h-4 w-4 text-muted-foreground" />
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
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-foreground">Whale Alerts</div>
                  <div className="text-xs text-muted-foreground">Movements from top 1% traders</div>
                </div>
              </div>
              <Switch
                checked={notifications.whale_alerts}
                onCheckedChange={(checked) => setNotifications({ ...notifications, whale_alerts: checked })}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-foreground">New Market Alerts</div>
                  <div className="text-xs text-muted-foreground">Alerts when interesting new markets are created</div>
                </div>
              </div>
              <Switch
                checked={notifications.new_market_alerts}
                onCheckedChange={(checked) => setNotifications({ ...notifications, new_market_alerts: checked })}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-foreground">Weekly Report</div>
                  <div className="text-xs text-muted-foreground">Weekly summary of top performers and your portfolio</div>
                </div>
              </div>
              <Switch
                checked={notifications.weekly_report}
                onCheckedChange={(checked) => setNotifications({ ...notifications, weekly_report: checked })}
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
