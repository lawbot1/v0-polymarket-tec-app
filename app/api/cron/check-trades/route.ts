import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTelegramMessage, formatTradeNotification } from '@/lib/telegram'

// Protect cron with CRON_SECRET
function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true
  // Also allow in dev without secret
  if (!cronSecret && process.env.NODE_ENV === 'development') return true
  return false
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  let sent = 0
  let errors = 0

  try {
    // 1. Get all users with telegram notifications enabled and a chat_id
    const { data: enabledUsers, error: usersError } = await supabase
      .from('notification_settings')
      .select('user_id, telegram_chat_id, large_trade_alerts, market_signals')
      .eq('telegram_notifications_enabled', true)
      .not('telegram_chat_id', 'is', null)

    if (usersError || !enabledUsers?.length) {
      return NextResponse.json({ sent: 0, message: 'No users with telegram enabled' })
    }

    // 2. For each user, get their tracked wallets
    for (const user of enabledUsers) {
      try {
        const { data: wallets } = await supabase
          .from('tracked_wallets')
          .select('wallet_address, label')
          .eq('user_id', user.user_id)

        if (!wallets?.length) continue

        // 3. For each tracked wallet, check recent trades
        for (const wallet of wallets) {
          try {
            // Fetch recent trades from Polymarket API
            const tradesRes = await fetch(
              `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/polymarket/trades?user=${wallet.wallet_address}&limit=5`,
              { cache: 'no-store' }
            )
            if (!tradesRes.ok) continue

            const trades = await tradesRes.json()

            for (const trade of trades) {
              // Generate a unique trade_id from trade properties
              const tradeId = trade.id || `${wallet.wallet_address}-${trade.timestamp}-${trade.market}-${trade.outcome}`

              // Check if we already sent this notification
              const { data: existing } = await supabase
                .from('telegram_notification_log')
                .select('id')
                .eq('user_id', user.user_id)
                .eq('trade_id', tradeId)
                .single()

              if (existing) continue // Already notified

              // Check trade value filter -- only notify for trades > $10
              const tradeValue = (trade.size || 0) * (trade.price || 0)
              if (tradeValue < 10) continue

              // Filter by user preference: large_trade_alerts covers all trade notifications
              if (!user.large_trade_alerts) continue

              // Send notification
              const message = formatTradeNotification({
                traderName: wallet.label || undefined,
                walletAddress: wallet.wallet_address,
                market: trade.market || trade.title || 'Unknown Market',
                outcome: trade.outcome || 'Unknown',
                side: trade.side || 'BUY',
                size: trade.size || 0,
                price: trade.price || 0,
              })

              const success = await sendTelegramMessage(user.telegram_chat_id!, message)

              if (success) {
                // Log the notification to prevent duplicates
                await supabase
                  .from('telegram_notification_log')
                  .insert({
                    user_id: user.user_id,
                    wallet_address: wallet.wallet_address,
                    trade_id: tradeId,
                  })
                sent++
              } else {
                errors++
              }

              // Rate limit: small delay between messages
              await new Promise(resolve => setTimeout(resolve, 100))
            }
          } catch (walletErr) {
            console.error(`[Cron] Error checking wallet ${wallet.wallet_address}:`, walletErr)
            errors++
          }
        }
      } catch (userErr) {
        console.error(`[Cron] Error processing user ${user.user_id}:`, userErr)
        errors++
      }
    }

    return NextResponse.json({
      sent,
      errors,
      users: enabledUsers.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron] Critical error:', error)
    return NextResponse.json({ error: 'Internal error', sent, errors }, { status: 500 })
  }
}
