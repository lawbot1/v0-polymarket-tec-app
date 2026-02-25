import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTelegramMessage } from '@/lib/telegram'

// Telegram sends updates as POST requests
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message = body?.message
    if (!message?.text || !message?.chat?.id) {
      return NextResponse.json({ ok: true })
    } 

    const chatId = String(message.chat.id)
    const text = message.text.trim()
    const firstName = message.from?.first_name || 'there'

    // Handle /start command
    if (text === '/start') {
      await sendTelegramMessage(chatId, [
        `<b>Welcome to Vantake Bot!</b> 👋`,
        ``,
        `I will send you real-time notifications when traders you track on Vantake make new trades on Polymarket.`,
        ``,
        `<b>To connect your account:</b>`,
        `1. Go to <b>Settings</b> on Vantake`,
        `2. Find your <b>Linking Code</b> in the Telegram section`,
        `3. Send it here: <code>/link YOUR_CODE</code>`,
        ``,
        `<b>Commands:</b>`,
        `/link CODE - Link your Vantake account`,
        `/status - Check your connection status`,
        `/stop - Disable notifications`,
        `/start - Show this message`,
      ].join('\n'))
      return NextResponse.json({ ok: true })
    }

    // Handle /status command
    if (text === '/status') {
      const supabase = createAdminClient()
      const { data: settings } = await supabase
        .from('notification_settings')
        .select('telegram_chat_id, telegram_notifications_enabled, user_id')
        .eq('telegram_chat_id', chatId)
        .single()

      if (settings) {
        // Fetch tracked wallets count
        const { count } = await supabase
          .from('tracked_wallets')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', settings.user_id)

        const status = settings.telegram_notifications_enabled ? '🟢 Active' : '🔴 Disabled'
        await sendTelegramMessage(chatId, [
          `<b>Connection Status:</b> ${status}`,
          `<b>Tracked Wallets:</b> ${count || 0}`,
          ``,
          settings.telegram_notifications_enabled
            ? `You will receive notifications when tracked traders make new trades.`
            : `Notifications are disabled. Enable them in Vantake Settings.`,
        ].join('\n'))
      } else {
        await sendTelegramMessage(chatId, [
          `<b>Not connected</b>`,
          ``,
          `Your Telegram is not linked to a Vantake account yet.`,
          `Go to Settings on Vantake and generate a linking code.`,
        ].join('\n'))
      }
      return NextResponse.json({ ok: true })
    }

    // Handle /stop command
    if (text === '/stop') {
      const supabase = createAdminClient()
      const { data: settings } = await supabase
        .from('notification_settings')
        .select('user_id')
        .eq('telegram_chat_id', chatId)
        .single()

      if (settings) {
        await supabase
          .from('notification_settings')
          .update({ telegram_notifications_enabled: false })
          .eq('telegram_chat_id', chatId)

        await sendTelegramMessage(chatId, `Notifications <b>disabled</b>. You can re-enable them in Vantake Settings.`)
      } else {
        await sendTelegramMessage(chatId, `Your Telegram is not linked to any Vantake account.`)
      }
      return NextResponse.json({ ok: true })
    }

    // Extract code from /link command or raw text
    let rawCode = text
    if (text.toLowerCase().startsWith('/link')) {
      rawCode = text.slice(5).trim() // remove "/link " prefix
    }
    const codeMatch = rawCode.toUpperCase().replace(/\s/g, '')
    if (/^[A-Z0-9]{8}$/.test(codeMatch)) {
      const supabase = createAdminClient()

      // First try: look up the permanent code in profiles
      let matchedUserId: string | null = null

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, telegram_linking_code')
        .eq('telegram_linking_code', codeMatch)
        .single()

      if (profile) {
        matchedUserId = profile.id
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
          // Mark code as used
          await supabase
            .from('telegram_linking_codes')
            .update({ used: true })
            .eq('id', linkCode.id)
        }
      }

      if (!matchedUserId) {
        await sendTelegramMessage(chatId, [
          `<b>Invalid code.</b>`,
          ``,
          `Please check your linking code in Vantake Settings.`,
        ].join('\n'))
        return NextResponse.json({ ok: true })
      }

      // Save chat_id in profiles
      await supabase
        .from('profiles')
        .update({ telegram_chat_id: chatId })
        .eq('id', matchedUserId)

      // Upsert notification_settings with chat_id
      await supabase
        .from('notification_settings')
        .upsert({
          user_id: matchedUserId,
          telegram_chat_id: chatId,
          telegram_notifications_enabled: true,
        }, { onConflict: 'user_id' })

      await sendTelegramMessage(chatId, [
        `<b>Account linked successfully!</b> ✅`,
        ``,
        `You will now receive notifications when your tracked traders make new trades on Polymarket.`,
        ``,
        `Use /status to check your setup.`,
        `Use /stop to disable notifications.`,
      ].join('\n'))
      return NextResponse.json({ ok: true })
    }

    // Unknown message
    await sendTelegramMessage(chatId, [
      `I didn't understand that, ${firstName}.`,
      ``,
      `Send me a <b>linking code</b> from Vantake Settings, or use:`,
      `/start - Setup instructions`,
      `/status - Check connection`,
      `/stop - Disable notifications`,
    ].join('\n'))

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Telegram Webhook] Error:', error)
    return NextResponse.json({ ok: true }) // Always return 200 to Telegram
  }
}

// GET endpoint to register/check webhook
export async function GET() {
  return NextResponse.json({ status: 'Telegram webhook endpoint active' })
}
