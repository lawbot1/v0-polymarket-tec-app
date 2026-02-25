import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTelegramMessage } from '@/lib/telegram'

// Helper: find user by telegram chat_id
async function findUserByChatId(chatId: string) {
  const supabase = createAdminClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, telegram_chat_id, telegram_linking_code')
    .eq('telegram_chat_id', chatId)
    .single()
  return profile
}

// Helper: get tracked traders for a user
async function getTrackedTraders(userId: string) {
  const supabase = createAdminClient()
  const { data: traders } = await supabase
    .from('followed_traders')
    .select('trader_name, trader_address')
    .eq('user_id', userId)
  return traders || []
}

// Helper: format trader list for message
function formatTraderList(traders: { trader_name: string; trader_address: string }[]) {
  if (traders.length === 0) return 'None yet. Follow traders on app.vantake.trade'
  return traders
    .map((t, i) => {
      const name = t.trader_name.length > 30
        ? t.trader_name.slice(0, 6) + '...' + t.trader_name.slice(-4)
        : t.trader_name
      return `${i + 1}. <code>${name}</code>`
    })
    .join('\n')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message = body?.message
    if (!message?.text || !message?.chat?.id) {
      return NextResponse.json({ ok: true })
    }

    const chatId = String(message.chat.id)
    const text = message.text.trim()

    // /start or /help
    if (text === '/start' || text === '/help') {
      await sendTelegramMessage(chatId, [
        `<b>Welcome to Vantake Notifications Bot!</b>`,
        ``,
        `Get real-time alerts when traders you track make new bets on Polymarket.`,
        ``,
        `<b>How to get started:</b>`,
        `1. Go to app.vantake.trade/settings`,
        `2. Copy your linking code`,
        `3. Send it here: <code>/link YOUR_CODE</code>`,
        ``,
        `<b>Commands:</b>`,
        `/link &lt;code&gt; - Link your Vantake account`,
        `/status - Check your account status`,
        `/unlink - Unlink your Telegram`,
        `/help - Show all commands`,
      ].join('\n'))
      return NextResponse.json({ ok: true })
    }

    // /status
    if (text === '/status') {
      const profile = await findUserByChatId(chatId)

      if (profile) {
        const traders = await getTrackedTraders(profile.id)

        // Check notification_settings
        const supabase = createAdminClient()
        const { data: notifSettings } = await supabase
          .from('notification_settings')
          .select('telegram_notifications_enabled')
          .eq('user_id', profile.id)
          .single()

        const enabled = notifSettings?.telegram_notifications_enabled ?? true
        const status = enabled ? 'Active' : 'Paused'

        await sendTelegramMessage(chatId, [
          `<b>Account Status</b>`,
          ``,
          `Account: <b>${profile.display_name || 'Vantake User'}</b>`,
          `Status: <b>${status}</b>`,
          `Notifications: ${enabled ? 'On' : 'Off'}`,
          ``,
          `<b>Tracked Traders (${traders.length}):</b>`,
          formatTraderList(traders),
          ``,
          `Manage traders at app.vantake.trade`,
        ].join('\n'))
      } else {
        await sendTelegramMessage(chatId, [
          `<b>Not Connected</b>`,
          ``,
          `Your Telegram is not linked to a Vantake account.`,
          ``,
          `To connect:`,
          `1. Go to app.vantake.trade/settings`,
          `2. Copy your linking code`,
          `3. Send: <code>/link YOUR_CODE</code>`,
        ].join('\n'))
      }
      return NextResponse.json({ ok: true })
    }

    // /unlink (replaces /stop)
    if (text === '/unlink' || text === '/stop') {
      const profile = await findUserByChatId(chatId)

      if (profile) {
        const supabase = createAdminClient()

        // Remove chat_id from profiles
        await supabase
          .from('profiles')
          .update({ telegram_chat_id: null })
          .eq('id', profile.id)

        // Disable notifications
        await supabase
          .from('notification_settings')
          .update({
            telegram_chat_id: null,
            telegram_notifications_enabled: false,
          })
          .eq('user_id', profile.id)

        await sendTelegramMessage(chatId, [
          `<b>Account Unlinked</b>`,
          ``,
          `Your Telegram has been disconnected from Vantake.`,
          `You will no longer receive trade notifications.`,
          ``,
          `To reconnect, use <code>/link YOUR_CODE</code>`,
        ].join('\n'))
      } else {
        await sendTelegramMessage(chatId, `Your Telegram is not linked to any Vantake account.`)
      }
      return NextResponse.json({ ok: true })
    }

    // /link CODE or raw 8-char code
    let rawCode = text
    if (text.toLowerCase().startsWith('/link')) {
      rawCode = text.slice(5).trim()
    }
    const codeMatch = rawCode.toUpperCase().replace(/\s/g, '')
    if (/^[A-Z0-9]{8}$/.test(codeMatch)) {
      const supabase = createAdminClient()

      // Look up permanent code in profiles
      let matchedUserId: string | null = null
      let matchedName: string | null = null

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, display_name, telegram_linking_code')
        .eq('telegram_linking_code', codeMatch)
        .single()

      if (profile) {
        matchedUserId = profile.id
        matchedName = profile.display_name
      } else {
        // Fallback: try old telegram_linking_codes table
        const { data: linkCode } = await supabase
          .from('telegram_linking_codes')
          .select('*')
          .eq('code', codeMatch)
          .eq('used', false)
          .gte('expires_at', new Date().toISOString())
          .single()

        if (linkCode) {
          matchedUserId = linkCode.user_id
          await supabase
            .from('telegram_linking_codes')
            .update({ used: true })
            .eq('id', linkCode.id)

          // Get display name
          const { data: p } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', linkCode.user_id)
            .single()
          matchedName = p?.display_name || null
        }
      }

      if (!matchedUserId) {
        await sendTelegramMessage(chatId, [
          `<b>Invalid Code</b>`,
          ``,
          `This linking code was not found.`,
          `Check your code at app.vantake.trade/settings`,
        ].join('\n'))
        return NextResponse.json({ ok: true })
      }

      // Save chat_id in profiles
      await supabase
        .from('profiles')
        .update({ telegram_chat_id: chatId })
        .eq('id', matchedUserId)

      // Upsert notification_settings
      await supabase
        .from('notification_settings')
        .upsert({
          user_id: matchedUserId,
          telegram_chat_id: chatId,
          telegram_notifications_enabled: true,
        }, { onConflict: 'user_id' })

      // Get tracked traders
      const traders = await getTrackedTraders(matchedUserId)

      await sendTelegramMessage(chatId, [
        `<b>Account Linked Successfully!</b>`,
        ``,
        `Welcome, <b>${matchedName || 'Vantake User'}</b>!`,
        `You will now receive alerts when your tracked traders make new bets on Polymarket.`,
        ``,
        `<b>Tracked Traders (${traders.length}):</b>`,
        formatTraderList(traders),
        ``,
        `<b>Commands:</b>`,
        `/status - Check your account status`,
        `/unlink - Disconnect Telegram`,
        `/help - Show all commands`,
      ].join('\n'))
      return NextResponse.json({ ok: true })
    }

    // Unknown message
    await sendTelegramMessage(chatId, [
      `I didn't understand that.`,
      ``,
      `<b>Available commands:</b>`,
      `/link &lt;code&gt; - Link your Vantake account`,
      `/status - Check your account status`,
      `/unlink - Unlink your Telegram`,
      `/help - Show all commands`,
    ].join('\n'))

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Telegram Webhook] Error:', error)
    return NextResponse.json({ ok: true })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Telegram webhook endpoint active' })
}
