import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTelegramMessage, formatTradeNotification } from '@/lib/telegram'

const DATA_API_BASE = 'https://data-api.polymarket.com'

// Protect cron with CRON_SECRET
function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true
  if (!cronSecret && process.env.NODE_ENV === 'development') return true
  return false
}

interface PolyTrade {
  proxyWallet: string
  side: 'BUY' | 'SELL'
  size: number
  price: number
  timestamp: number
  title: string
  slug: string
  icon?: string
  outcome: string
  conditionId: string
  transactionHash?: string
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  let sent = 0
  let inApp = 0
  let errors = 0

  try {
    // 1. Get all tracked wallets with their user info
    const { data: trackedWallets, error: walletsError } = await supabase
      .from('tracked_wallets')
      .select('user_id, wallet_address, label')

    if (walletsError || !trackedWallets?.length) {
      return NextResponse.json({ sent: 0, inApp: 0, message: 'No tracked wallets' })
    }

    // 2. Get notification settings for users with telegram enabled
    const userIds = [...new Set(trackedWallets.map(w => w.user_id))]
    const { data: notifSettings } = await supabase
      .from('notification_settings')
      .select('user_id, telegram_chat_id, telegram_notifications_enabled, large_trade_alerts')
      .in('user_id', userIds)

    const notifMap = new Map(notifSettings?.map(n => [n.user_id, n]) || [])

    // 3. Group wallets by wallet_address to avoid duplicate API calls
    const walletGroups = new Map<string, { user_id: string; label: string }[]>()
    for (const w of trackedWallets) {
      const existing = walletGroups.get(w.wallet_address) || []
      existing.push({ user_id: w.user_id, label: w.label })
      walletGroups.set(w.wallet_address, existing)
    }

    // 4. For each unique wallet, fetch recent trades from Polymarket
    for (const [walletAddress, users] of walletGroups) {
      try {
        const tradesRes = await fetch(
          `${DATA_API_BASE}/trades?user=${walletAddress}&limit=10`,
          { cache: 'no-store' }
        )
        if (!tradesRes.ok) continue

        const trades: PolyTrade[] = await tradesRes.json()
        if (!trades?.length) continue

        for (const trade of trades) {
          // Generate unique trade ID
          const tradeId = trade.transactionHash ||
            `${walletAddress}-${trade.timestamp}-${trade.conditionId}-${trade.outcome}`

          const tradeValue = trade.size * trade.price
          if (tradeValue < 5) continue // Skip tiny trades

          // For each user tracking this wallet
          for (const { user_id, label } of users) {
            // Check if already notified (in telegram_notification_log)
            const { data: existing } = await supabase
              .from('telegram_notification_log')
              .select('id')
              .eq('user_id', user_id)
              .eq('trade_id', tradeId)
              .single()

            if (existing) continue

            const traderName = label || `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`

            // Always create in-app notification
            try {
              await supabase
                .from('notifications')
                .insert({
                  user_id,
                  type: 'trade',
                  title: `${traderName} ${trade.side === 'BUY' ? 'bought' : 'sold'} ${trade.outcome}`,
                  message: trade.title || 'Unknown Market',
                  trader_name: label || null,
                  trader_address: walletAddress,
                  trade_data: {
                    market: trade.title,
                    outcome: trade.outcome,
                    side: trade.side,
                    size: trade.size,
                    price: trade.price,
                    value: tradeValue,
                    slug: trade.slug,
                  },
                })
              inApp++
            } catch (insertErr) {
              console.error(`[Cron] Error inserting notification:`, insertErr)
            }

            // Send Telegram notification if enabled
            const settings = notifMap.get(user_id)
            if (
              settings?.telegram_notifications_enabled &&
              settings?.telegram_chat_id &&
              settings?.large_trade_alerts !== false
            ) {
              const message = formatTradeNotification({
                traderName: label || undefined,
                walletAddress,
                market: trade.title || 'Unknown Market',
                outcome: trade.outcome || 'Unknown',
                side: trade.side || 'BUY',
                size: trade.size || 0,
                price: trade.price || 0,
              })

              const success = await sendTelegramMessage(settings.telegram_chat_id, message)
              if (success) sent++
              else errors++
            }

            // Log to prevent duplicates
            await supabase
              .from('telegram_notification_log')
              .insert({
                user_id,
                wallet_address: walletAddress,
                trade_id: tradeId,
              })

            // Rate limit
            await new Promise(resolve => setTimeout(resolve, 50))
          }
        }
      } catch (walletErr) {
        console.error(`[Cron] Error checking wallet ${walletAddress}:`, walletErr)
        errors++
      }
    }

    return NextResponse.json({
      telegramSent: sent,
      inAppCreated: inApp,
      errors,
      walletsChecked: walletGroups.size,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron] Critical error:', error)
    return NextResponse.json({ error: 'Internal error', sent, errors }, { status: 500 })
  }
}
