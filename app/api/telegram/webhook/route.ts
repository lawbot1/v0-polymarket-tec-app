import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTelegramMessage } from '@/lib/telegram'

// Telegram sends updates as POST requests
export async function POST(req: NextRequest) {
  console.log('[v0] Telegram webhook POST received')
  try {
    const body = await req.json()
    console.log('[v0] Telegram webhook body:', JSON.stringify(body).slice(0, 200))
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
        `2. Click "Generate Linking Code" in the Telegram section`,
        `3. Send me the code here`,
        ``,
        `<b>Commands:</b>`,
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

    // Otherwise, try to match a linking code (8 uppercase alphanumeric chars)
    const codeMatch = text.toUpperCase().replace(/\s/g, '')
    if (/^[A-Z0-9]{8}$/.test(codeMatch)) {
      const supabase = createAdminClient()

      // Look up the code
      const { data: linkCode } = await supabase
        .from('telegram_linking_codes')
        .select('*')
        .eq('code', codeMatch)
        .eq('used', false)
        .gte('expires_at', new Date().toISOString())
        .single()

      if (!linkCode) {
        await sendTelegramMessage(chatId, [
          `<b>Invalid or expired code.</b>`,
          ``,
          `Please generate a new code in Vantake Settings.`,
        ].join('\n'))
        return NextResponse.json({ ok: true })
      }

      // Mark code as used
      await supabase
        .from('telegram_linking_codes')
        .update({ used: true })
        .eq('id', linkCode.id)

      // Save chat_id in notification_settings and profiles
      await supabase
        .from('notification_settings')
        .update({
          telegram_chat_id: chatId,
          telegram_notifications_enabled: true,
        })
        .eq('user_id', linkCode.user_id)

      await supabase
        .from('profiles')
        .update({ telegram_chat_id: chatId })
        .eq('id', linkCode.user_id)

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
