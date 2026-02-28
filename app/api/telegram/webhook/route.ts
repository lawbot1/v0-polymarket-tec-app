import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { 
  sendTelegramMessage, 
  sendTelegramPhoto, 
  answerCallbackQuery, 
  getMainMenuKeyboard,
  getWalletMenuKeyboard,
  smartEditMessage 
} from '@/lib/telegram'
import { 
  generateWallet, 
  encryptPrivateKey, 
  formatWalletAddress,
  getUSDCBalance,
  getPOLBalance 
} from '@/lib/wallet'

const WELCOME_IMAGE_URL = 'https://app.vantake.trade/telegram-welcome.png'
const APP_URL = 'https://app.vantake.trade'
const TWITTER_URL = 'https://x.com/VantakeTrade'

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

// Helper: get or create wallet for telegram user
async function getWalletByChatId(chatId: string) {
  const supabase = createAdminClient()
  const { data: wallet } = await supabase
    .from('telegram_wallets')
    .select('*')
    .eq('telegram_chat_id', chatId)
    .single()
  return wallet
}

// Helper: create new wallet for telegram user
async function createWalletForChat(chatId: string) {
  const supabase = createAdminClient()
  const { address, privateKey } = generateWallet()
  const encryptedKey = encryptPrivateKey(privateKey)
  
  const { data: wallet, error } = await supabase
    .from('telegram_wallets')
    .insert({
      telegram_chat_id: chatId,
      wallet_address: address,
      encrypted_private_key: encryptedKey,
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating wallet:', error)
    return null
  }
  
  return { ...wallet, privateKey } // Return unencrypted key only on creation
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Handle callback queries (inline button clicks)
    if (body?.callback_query) {
      const callbackQuery = body.callback_query
      const callbackData = callbackQuery.data
      const chatId = String(callbackQuery.message?.chat?.id)
      const messageId = callbackQuery.message?.message_id
      
      console.log('[v0] Callback query received:', callbackData, 'from chat:', chatId)
      
      // Handle "Copytrade AI (Soon)" button
      if (callbackData === 'copytrade_ai_soon') {
        await answerCallbackQuery(callbackQuery.id, 'Copytrade AI is coming soon! Stay tuned.')
        return NextResponse.json({ ok: true })
      }
      
      // Main menu (same as /start)
      if (callbackData === 'menu_main') {
        await answerCallbackQuery(callbackQuery.id)
        const welcomeText = [
          `<b>Welcome to Vantake Notifications Bot!</b>`,
          ``,
          `Get real-time alerts when traders you track make new bets on Polymarket.`,
          ``,
          `<b>How to get started:</b>`,
          `1. Go to app.vantake.trade/settings`,
          `2. Copy your linking code`,
          `3. Send it here: /link YOUR_CODE`,
          ``,
          `We on <a href="${TWITTER_URL}">X.com</a> / <a href="${APP_URL}">app.vantake.trade</a>`,
        ].join('\n')
        await sendTelegramMessage(chatId, welcomeText, 'HTML', getMainMenuKeyboard())
        return NextResponse.json({ ok: true })
      }
      
      // Wallet menu
      if (callbackData === 'menu_wallet') {
        await answerCallbackQuery(callbackQuery.id)
        const wallet = await getWalletByChatId(chatId)
        
        if (!wallet) {
          const noWalletText = `You do not have a wallet linked`
          await sendTelegramMessage(chatId, noWalletText, 'HTML', getWalletMenuKeyboard(false))
        } else {
          const [usdcBalance, polBalance] = await Promise.all([
            getUSDCBalance(wallet.wallet_address),
            getPOLBalance(wallet.wallet_address),
          ])
          
          const walletText = [
            `<b>Your wallet</b> <code>${formatWalletAddress(wallet.wallet_address)}</code>`,
            ``,
            `USDC: <b>$${usdcBalance}</b>`,
            `Polygon: <b>${parseFloat(polBalance).toFixed(6)} POL</b>`,
            ``,
            `<b>Your Polymarket active</b>`,
            ``,
            `<i>No active bids.</i>`,
          ].join('\n')
          await sendTelegramMessage(chatId, walletText, 'HTML', getWalletMenuKeyboard(true))
        }
        return NextResponse.json({ ok: true })
      }
      
      // Create wallet
      if (callbackData === 'wallet_create') {
        await answerCallbackQuery(callbackQuery.id, 'Creating your wallet...')
        
        const existingWallet = await getWalletByChatId(chatId)
        if (existingWallet) {
          await sendTelegramMessage(chatId, 'You already have a wallet!')
          return NextResponse.json({ ok: true })
        }
        
        const newWallet = await createWalletForChat(chatId)
        if (!newWallet) {
          await sendTelegramMessage(chatId, 'Failed to create wallet. Please try again.')
          return NextResponse.json({ ok: true })
        }
        
        const createdText = [
          `<b>✅ Wallet created</b>`,
          ``,
          `<b>Address:</b> <code>${newWallet.wallet_address}</code>`,
          ``,
          `<b>⚠️ SAVE YOUR PRIVATE KEY</b>`,
          `<code>${newWallet.privateKey}</code>`,
          ``,
          `<i>This is the only time your private key will be shown. Save it securely!</i>`,
        ].join('\n')
        
        await sendTelegramMessage(chatId, createdText, 'HTML', getWalletMenuKeyboard(true))
        return NextResponse.json({ ok: true })
      }
      
      // Wallet import (coming soon)
      if (callbackData === 'wallet_import') {
        await answerCallbackQuery(callbackQuery.id, 'Import feature coming soon!', true)
        return NextResponse.json({ ok: true })
      }
      
      // Wallet deposit
      if (callbackData === 'wallet_deposit') {
        const wallet = await getWalletByChatId(chatId)
        if (!wallet) {
          await answerCallbackQuery(callbackQuery.id, 'No wallet found')
          return NextResponse.json({ ok: true })
        }
        
        await answerCallbackQuery(callbackQuery.id)
        const depositText = [
          `<b>➕ Deposit</b>`,
          ``,
          `Send USDC (Polygon) to:`,
          `<code>${wallet.wallet_address}</code>`,
          ``,
          `<i>Only send USDC on Polygon network!</i>`,
        ].join('\n')
        await sendTelegramMessage(chatId, depositText, 'HTML', getWalletMenuKeyboard(true))
        return NextResponse.json({ ok: true })
      }
      
      // Wallet refresh
      if (callbackData === 'wallet_refresh') {
        await answerCallbackQuery(callbackQuery.id, 'Refreshing...')
        const wallet = await getWalletByChatId(chatId)
        if (wallet) {
          const [usdcBalance, polBalance] = await Promise.all([
            getUSDCBalance(wallet.wallet_address),
            getPOLBalance(wallet.wallet_address),
          ])
          
          const walletText = [
            `<b>🟢 Your wallet</b> <code>${formatWalletAddress(wallet.wallet_address)}</code>`,
            ``,
            `💵 USDC: <b>$${usdcBalance}</b>`,
            `💎 Polygon: <b>${parseFloat(polBalance).toFixed(6)} POL</b>`,
            ``,
            `<b>⚙️ Your Polymarket active</b>`,
            ``,
            `<i>No active bids.</i>`,
          ].join('\n')
          await sendTelegramMessage(chatId, walletText, 'HTML', getWalletMenuKeyboard(true))
        }
        return NextResponse.json({ ok: true })
      }
      
      // Wallet export (show private key warning)
      if (callbackData === 'wallet_export') {
        await answerCallbackQuery(callbackQuery.id, 'Export is disabled for security. Save your key when creating wallet.', true)
        return NextResponse.json({ ok: true })
      }
      
      // Wallet withdraw (coming soon)
      if (callbackData === 'wallet_withdraw') {
        await answerCallbackQuery(callbackQuery.id, 'Withdraw feature coming soon!', true)
        return NextResponse.json({ ok: true })
      }
      
      // Profile
      if (callbackData === 'menu_profile') {
        await answerCallbackQuery(callbackQuery.id)
        const profile = await findUserByChatId(chatId)
        const profileText = profile ? [
          `<b>👤 Profile</b>`,
          ``,
          `Name: <b>${profile.display_name || 'Vantake User'}</b>`,
          `Status: <b>Connected</b>`,
          ``,
          `Manage your profile at ${APP_URL}`,
        ].join('\n') : [
          `<b>👤 Profile</b>`,
          ``,
          `Not connected to Vantake account.`,
          `Use /link YOUR_CODE to connect.`,
        ].join('\n')
        await sendTelegramMessage(chatId, profileText, 'HTML', {
          inline_keyboard: [[{ text: '⬅️ Back', callback_data: 'menu_main' }]]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Markets
      if (callbackData === 'menu_markets') {
        await answerCallbackQuery(callbackQuery.id)
        await sendTelegramMessage(chatId, [
          `<b>📊 Markets</b>`,
          ``,
          `Browse markets at:`,
          `${APP_URL}/markets`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [
            [{ text: '🔗 Open Markets', url: `${APP_URL}/markets` }],
            [{ text: '⬅️ Back', callback_data: 'menu_main' }]
          ]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Positions
      if (callbackData === 'menu_positions') {
        await answerCallbackQuery(callbackQuery.id)
        const wallet = await getWalletByChatId(chatId)
        const posText = wallet ? [
          `<b>📈 Positions</b>`,
          ``,
          `<i>No active positions.</i>`,
          ``,
          `Start trading to see your positions here.`,
        ].join('\n') : [
          `<b>📈 Positions</b>`,
          ``,
          `Create a wallet first to trade.`,
        ].join('\n')
        await sendTelegramMessage(chatId, posText, 'HTML', {
          inline_keyboard: [[{ text: '⬅️ Back', callback_data: 'menu_main' }]]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade
      if (callbackData === 'menu_copytrade') {
        await answerCallbackQuery(callbackQuery.id)
        await sendTelegramMessage(chatId, [
          `<b>🤖 Copy Trade</b>`,
          ``,
          `<i>Coming soon!</i>`,
          ``,
          `Automatically copy trades from top traders.`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [[{ text: '⬅️ Back', callback_data: 'menu_main' }]]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Whales
      if (callbackData === 'menu_whales') {
        await answerCallbackQuery(callbackQuery.id)
        await sendTelegramMessage(chatId, [
          `<b>🐋 Whales</b>`,
          ``,
          `Track whale movements at:`,
          `${APP_URL}/insider-signals`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [
            [{ text: '🔗 View Signals', url: `${APP_URL}/insider-signals` }],
            [{ text: '⬅️ Back', callback_data: 'menu_main' }]
          ]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Referral
      if (callbackData === 'menu_referral') {
        await answerCallbackQuery(callbackQuery.id)
        await sendTelegramMessage(chatId, [
          `<b>🎁 Referral</b>`,
          ``,
          `<i>Coming soon!</i>`,
          ``,
          `Invite friends and earn rewards.`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [[{ text: '⬅️ Back', callback_data: 'menu_main' }]]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Help
      if (callbackData === 'menu_help') {
        await answerCallbackQuery(callbackQuery.id)
        await sendTelegramMessage(chatId, [
          `<b>Help</b>`,
          ``,
          `<b>Commands:</b>`,
          `/start - Show main menu`,
          `/link <code> - Link Vantake account`,
          `/status - Check account status`,
          `/unlink - Disconnect Telegram`,
          ``,
          `<b>Found a bug or something not working?</b>`,
          `Contact us:`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [
            [{ text: 'Telegram DM', url: 'https://t.me/Eth_ancarter' }],
            [{ text: 'X (Twitter)', url: TWITTER_URL }],
            [{ text: 'Back', callback_data: 'menu_main' }]
          ]
        })
        return NextResponse.json({ ok: true })
      }
      
      return NextResponse.json({ ok: true })
    }
    
    const message = body?.message
    if (!message?.text || !message?.chat?.id) {
      return NextResponse.json({ ok: true })
    }

    const chatId = String(message.chat.id)
    const text = message.text.trim()

    // /start
    if (text === '/start') {
      const welcomeCaption = [
        `<b>Welcome to Vantake Notifications Bot!</b>`,
        ``,
        `Get real-time alerts when traders you track make new bets on Polymarket.`,
        ``,
        `<b>How to get started:</b>`,
        `1. Go to app.vantake.trade/settings`,
        `2. Copy your linking code`,
        `3. Send it here: /link YOUR_CODE`,
        ``,
        `We on <a href="${TWITTER_URL}">X.com</a> / <a href="${APP_URL}">app.vantake.trade</a>`,
      ].join('\n')
      
      await sendTelegramPhoto(chatId, WELCOME_IMAGE_URL, welcomeCaption, 'HTML', getMainMenuKeyboard())
      return NextResponse.json({ ok: true })
    }
    
    // /help
    if (text === '/help') {
      await sendTelegramMessage(chatId, [
        `<b>❓ Help</b>`,
        ``,
        `<b>Commands:</b>`,
        `/start - Show main menu`,
        `/link <code> - Link Vantake account`,
        `/status - Check account status`,
        `/unlink - Disconnect Telegram`,
        ``,
        `Need help? Contact us:`,
        `Twitter: ${TWITTER_URL}`,
      ].join('\n'), 'HTML', {
        inline_keyboard: [
          [{ text: '🐦 Twitter', url: TWITTER_URL }],
          [{ text: '🏠 Main Menu', callback_data: 'menu_main' }]
        ]
      })
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
