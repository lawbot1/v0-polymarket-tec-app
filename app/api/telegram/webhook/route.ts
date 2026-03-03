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
  decryptPrivateKey,
  formatWalletAddress,
  getUSDCBalance,
  getPOLBalance,
  getPolymarketPositions,
  sendUSDC,
  getTraderStats
} from '@/lib/wallet'
import { getLeaderboard } from '@/lib/polymarket-api'

const WELCOME_IMAGE_URL = 'https://app.vantake.trade/telegram-welcome.png'
const WALLET_IMAGE_URL = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-5ZjBkRTp9vW4km5vzyvp5JPVeGBq8B.png'
const PROFILE_IMAGE_URL = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Fgu7NCVLAF6fGAL2VTUhBB4FQ2bmrQ.png'
const POSITIONS_IMAGE_URL = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-2B2qRwHmVM6TZtDud2rgIqirvtDZ9b.png'
const COPYTRADE_IMAGE_URL = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-kyFfan5ygX8M725TJvgTtLUj75cJmd.png'
const REFERRAL_IMAGE_URL = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-4ZomyzJGs8UwpFz8ERZyeLYnDkQkPP.png'
const APP_URL = 'https://app.vantake.trade'
const TWITTER_URL = 'https://x.com/VantakeTrade'

// Helper: edit message with photo (for refresh buttons)
async function editMessageMedia(
  chatId: string,
  messageId: number,
  photoUrl: string,
  caption: string,
  parseMode: string = 'HTML',
  replyMarkup?: { inline_keyboard: { text: string; callback_data?: string; url?: string }[][] }
) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    media: {
      type: 'photo',
      media: photoUrl,
      caption: caption,
      parse_mode: parseMode,
    },
  }
  if (replyMarkup) {
    body.reply_markup = replyMarkup
  }
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageMedia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

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

// Helper: get copytrade subscriptions for telegram user
async function getCopytradeSubscriptions(chatId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('telegram_copytrade_subscriptions')
    .select('*')
    .eq('telegram_chat_id', chatId)
    .order('created_at', { ascending: false })
  return data || []
}

// Copytrade settings interface
interface CopytradeSettings {
  walletAddress: string
  nickname?: string
  mode: 'fixed' | 'percentage' | 'portfolio' // Fixed $, Percentage, Portfolio-Weighted
  tradeSize: number // $ amount for fixed, % for percentage/portfolio
  singleTradeLimit?: number // Max $ per trade (null = no limit)
  priceRangeMin?: number // Min price in cents (null = no filter)
  priceRangeMax?: number // Max price in cents (null = no filter)
  slippage: number // Slippage tolerance %
}

// Helper: add copytrade subscription with full settings
async function addCopytradeSubscription(chatId: string, settings: CopytradeSettings) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('telegram_copytrade_subscriptions')
    .insert({
      telegram_chat_id: chatId,
      wallet_address: settings.walletAddress.toLowerCase(),
      name: settings.nickname || null,
      mode: settings.mode,
      trade_size: settings.tradeSize,
      single_trade_limit: settings.singleTradeLimit || null,
      price_range_min: settings.priceRangeMin || null,
      price_range_max: settings.priceRangeMax || null,
      slippage: settings.slippage,
    })
    .select()
    .single()
  return { data, error }
}

// Helper: delete copytrade subscription
async function deleteCopytradeSubscription(chatId: string, walletAddress: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('telegram_copytrade_subscriptions')
    .delete()
    .eq('telegram_chat_id', chatId)
    .eq('wallet_address', walletAddress.toLowerCase())
  return !error
}

// Helper: rename copytrade subscription
async function renameCopytradeSubscription(chatId: string, walletAddress: string, newName: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('telegram_copytrade_subscriptions')
    .update({ name: newName, updated_at: new Date().toISOString() })
    .eq('telegram_chat_id', chatId)
    .eq('wallet_address', walletAddress.toLowerCase())
  return !error
}

// User state for multi-step operations (withdraw amount, add address, rename)
const userStates = new Map<string, { action: string; data?: Record<string, unknown> }>()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Handle callback queries (inline button clicks)
    if (body?.callback_query) {
      const callbackQuery = body.callback_query
      const callbackData = callbackQuery.data
      const chatId = String(callbackQuery.message?.chat?.id)
      const messageId = callbackQuery.message?.message_id
      
      // Main menu (same as /start) - with photo
      if (callbackData === 'menu_main') {
        await answerCallbackQuery(callbackQuery.id)
        const welcomeCaption = [
          `<b>Welcome to Vantake Notifications Bot!</b>`,
          ``,
          `Get real-time alerts when traders you track make new bets on Polymarket.`,
          ``,
          `<b>Option 1 - Link existing account:</b>`,
          `1. Go to app.vantake.trade/settings`,
          `2. Copy your linking code`,
          `3. Send it here: /link YOUR_CODE`,
          ``,
          `<b>Option 2 - Create new wallet:</b>`,
          `1. Click Wallet below`,
          `2. Create a new wallet`,
          `3. Start copy trading top traders!`,
          ``,
          `We on <a href="${TWITTER_URL}">X.com</a> / <a href="${APP_URL}">app.vantake.trade</a>`,
        ].join('\n')
        await sendTelegramPhoto(chatId, WELCOME_IMAGE_URL, welcomeCaption, 'HTML', getMainMenuKeyboard())
        return NextResponse.json({ ok: true })
      }
      
      // Wallet menu
      if (callbackData === 'menu_wallet') {
        await answerCallbackQuery(callbackQuery.id)
        const wallet = await getWalletByChatId(chatId)
        
        if (!wallet) {
          const noWalletText = `You do not have a wallet linked`
          await sendTelegramPhoto(chatId, WALLET_IMAGE_URL, noWalletText, 'HTML', getWalletMenuKeyboard(false))
        } else {
          const [usdcBalance, polBalance, positions] = await Promise.all([
            getUSDCBalance(wallet.wallet_address),
            getPOLBalance(wallet.wallet_address),
            getPolymarketPositions(wallet.wallet_address),
          ])
          
          // Calculate positions value
          const positionsValue = positions.reduce((sum, pos) => sum + (pos.size * pos.currentPrice), 0)
          const availableBalance = parseFloat(usdcBalance)
          
          const walletText = [
            `Your wallet "<code>${formatWalletAddress(wallet.wallet_address)}</code>"`,
            ``,
            `USDC: <b>$${parseFloat(usdcBalance).toFixed(2)}</b>`,
            `Polygon: <b>${parseFloat(polBalance).toFixed(6)} POL</b>`,
            ``,
            `📈 Current Positions: <b>$${positionsValue.toFixed(2)}</b>`,
            `💰 Available Balance: <b>$${availableBalance.toFixed(2)}</b>`,
            `📝 Active Orders: <b>$0.00</b>`,
            ``,
            `<b>Your Polymarket active</b>`,
            ``,
            positions.length > 0 
              ? positions.slice(0, 5).map(p => `• ${p.market.slice(0, 30)}... - $${(p.size * p.currentPrice).toFixed(2)}`).join('\n')
              : `<i>No active bids.</i>`,
          ].join('\n')
          await sendTelegramPhoto(chatId, WALLET_IMAGE_URL, walletText, 'HTML', getWalletMenuKeyboard(true))
        }
        return NextResponse.json({ ok: true })
      }
      
      // Create wallet
      if (callbackData === 'wallet_create') {
        await answerCallbackQuery(callbackQuery.id, 'Creating your wallet...')
        
        const existingWallet = await getWalletByChatId(chatId)
        if (existingWallet) {
          await sendTelegramPhoto(chatId, WALLET_IMAGE_URL, 'You already have a wallet!', 'HTML', getWalletMenuKeyboard(true))
          return NextResponse.json({ ok: true })
        }
        
        const newWallet = await createWalletForChat(chatId)
        if (!newWallet) {
          await sendTelegramPhoto(chatId, WALLET_IMAGE_URL, 'Failed to create wallet. Please try again.', 'HTML', getWalletMenuKeyboard(false))
          return NextResponse.json({ ok: true })
        }
        
        const createdText = [
          `<b>Wallet created</b>`,
          ``,
          `<b>Address:</b> <code>${newWallet.wallet_address}</code>`,
          ``,
          `<b>SAVE YOUR PRIVATE KEY</b>`,
          `<code>${newWallet.privateKey}</code>`,
          ``,
          `<i>This is the only time your private key will be shown. Save it securely!</i>`,
        ].join('\n')
        
        await sendTelegramPhoto(chatId, WALLET_IMAGE_URL, createdText, 'HTML', getWalletMenuKeyboard(true))
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
          `<b>Deposit</b>`,
          ``,
          `Send USDC (Polygon) to:`,
          `<code>${wallet.wallet_address}</code>`,
          ``,
          `<i>Only send USDC on Polygon network!</i>`,
        ].join('\n')
        await sendTelegramPhoto(chatId, WALLET_IMAGE_URL, depositText, 'HTML', getWalletMenuKeyboard(true))
        return NextResponse.json({ ok: true })
      }
      
      // Wallet refresh
      if (callbackData === 'wallet_refresh') {
        await answerCallbackQuery(callbackQuery.id, 'Refreshing...')
        const wallet = await getWalletByChatId(chatId)
        if (wallet) {
          const [usdcBalance, polBalance, positions] = await Promise.all([
            getUSDCBalance(wallet.wallet_address),
            getPOLBalance(wallet.wallet_address),
            getPolymarketPositions(wallet.wallet_address),
          ])
          
          // Calculate positions value
          const positionsValue = positions.reduce((sum, pos) => sum + (pos.size * pos.currentPrice), 0)
          const availableBalance = parseFloat(usdcBalance)
          
          const walletText = [
            `Your wallet "<code>${formatWalletAddress(wallet.wallet_address)}</code>"`,
            ``,
            `USDC: <b>$${parseFloat(usdcBalance).toFixed(2)}</b>`,
            `Polygon: <b>${parseFloat(polBalance).toFixed(6)} POL</b>`,
            ``,
            `📈 Current Positions: <b>$${positionsValue.toFixed(2)}</b>`,
            `💰 Available Balance: <b>$${availableBalance.toFixed(2)}</b>`,
            `📝 Active Orders: <b>$0.00</b>`,
            ``,
            `<b>Your Polymarket active</b>`,
            ``,
            positions.length > 0 
              ? positions.slice(0, 5).map(p => `• ${p.market.slice(0, 30)}... - $${(p.size * p.currentPrice).toFixed(2)}`).join('\n')
              : `<i>No active bids.</i>`,
          ].join('\n')
          await sendTelegramMessage(chatId, walletText, 'HTML', getWalletMenuKeyboard(true))
        }
        return NextResponse.json({ ok: true })
      }
      
      // Wallet export - show private key
      if (callbackData === 'wallet_export') {
        const wallet = await getWalletByChatId(chatId)
        if (!wallet) {
          await answerCallbackQuery(callbackQuery.id, 'No wallet found')
          return NextResponse.json({ ok: true })
        }
        
        await answerCallbackQuery(callbackQuery.id)
        
        // Decrypt private key
        const privateKey = decryptPrivateKey(wallet.encrypted_private_key)
        
        await sendTelegramPhoto(chatId, WALLET_IMAGE_URL, [
          `<b>Export Private Key</b>`,
          ``,
          `<b>Address:</b>`,
          `<code>${wallet.wallet_address}</code>`,
          ``,
          `<b>Private Key:</b>`,
          `<code>${privateKey}</code>`,
          ``,
          `<b>Warning:</b> Never share your private key with anyone!`,
          `Delete this message after saving your key.`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [[{ text: 'Back', callback_data: 'menu_wallet' }]]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Wallet withdraw - step 1: ask for address
      if (callbackData === 'wallet_withdraw') {
        const wallet = await getWalletByChatId(chatId)
        if (!wallet) {
          await answerCallbackQuery(callbackQuery.id, 'No wallet found')
          return NextResponse.json({ ok: true })
        }
        
        await answerCallbackQuery(callbackQuery.id)
        userStates.set(chatId, { action: 'withdraw_address' })
        
        const usdcBalance = await getUSDCBalance(wallet.wallet_address)
        await sendTelegramPhoto(chatId, WALLET_IMAGE_URL, [
          `<b>Withdraw USDC</b>`,
          ``,
          `Balance: <b>$${usdcBalance}</b>`,
          ``,
          `Enter the destination address (0x...):`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [[{ text: 'Cancel', callback_data: 'menu_wallet' }]]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Profile
      if (callbackData === 'menu_profile') {
        await answerCallbackQuery(callbackQuery.id)
        const profile = await findUserByChatId(chatId)
        const wallet = await getWalletByChatId(chatId)
        
        const profileLines = [`<b>👤 Profile</b>`, ``]
        
        if (profile) {
          profileLines.push(`Name: <b>${profile.display_name || 'Vantake User'}</b>`)
          profileLines.push(`Status: <b>Connected</b>`)
        } else {
          profileLines.push(`Status: <b>Not connected</b>`)
          profileLines.push(`Use /link YOUR_CODE to connect.`)
        }
        
        profileLines.push(``)
        
        if (wallet) {
          profileLines.push(`<b>👛 Wallet:</b>`)
          profileLines.push(`<code>${wallet.wallet_address}</code>`)
        } else {
          profileLines.push(`<b>👛 Wallet:</b> Not created`)
          profileLines.push(`Go to Wallet to create one.`)
        }
        
        await sendTelegramPhoto(chatId, PROFILE_IMAGE_URL, profileLines.join('\n'), 'HTML', {
          inline_keyboard: [[{ text: 'Back', callback_data: 'menu_main' }]]
        })
        return NextResponse.json({ ok: true })
      }
      

      // Positions
      if (callbackData === 'menu_positions' || callbackData === 'refresh_positions') {
        const isRefresh = callbackData === 'refresh_positions'
        const messageId = callbackQuery.message?.message_id
        await answerCallbackQuery(callbackQuery.id, isRefresh ? 'Refreshing...' : undefined)
        
        const wallet = await getWalletByChatId(chatId)
        
        if (!wallet) {
          if (isRefresh && messageId) {
            await editMessageMedia(chatId, messageId, POSITIONS_IMAGE_URL, [
              `<b>Positions</b>`,
              ``,
              `Create a wallet first to trade.`,
            ].join('\n'), 'HTML', {
              inline_keyboard: [[{ text: 'Back', callback_data: 'menu_main' }]]
            })
          } else {
            await sendTelegramPhoto(chatId, POSITIONS_IMAGE_URL, [
              `<b>Positions</b>`,
              ``,
              `Create a wallet first to trade.`,
            ].join('\n'), 'HTML', {
              inline_keyboard: [[{ text: 'Back', callback_data: 'menu_main' }]]
            })
          }
          return NextResponse.json({ ok: true })
        }
        
        // Fetch real positions from Polymarket
        const positions = await getPolymarketPositions(wallet.wallet_address)
        
        const posLines = [`<b>Positions</b>`, ``, `Wallet: <code>${formatWalletAddress(wallet.wallet_address)}</code>`, ``]
        
        if (positions.length === 0) {
          posLines.push(`<i>No active positions.</i>`)
          posLines.push(``)
          posLines.push(`Start trading to see your positions here.`)
        } else {
          for (const pos of positions) {
            const pnlSign = pos.pnl >= 0 ? '+' : ''
            const marketName = pos.market.length > 40 ? pos.market.slice(0, 37) + '...' : pos.market
            posLines.push(`<b>${marketName}</b>`)
            posLines.push(`${pos.outcome} | Size: $${pos.size.toFixed(2)} | PnL: ${pnlSign}$${pos.pnl.toFixed(2)}`)
            posLines.push(``)
          }
        }
        
        const keyboard = {
          inline_keyboard: [
            [{ text: 'Refresh', callback_data: 'refresh_positions' }],
            [{ text: 'Back', callback_data: 'menu_main' }]
          ]
        }
        
        if (isRefresh && messageId) {
          await editMessageMedia(chatId, messageId, POSITIONS_IMAGE_URL, posLines.join('\n'), 'HTML', keyboard)
        } else {
          await sendTelegramPhoto(chatId, POSITIONS_IMAGE_URL, posLines.join('\n'), 'HTML', keyboard)
        }
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade - main menu
      if (callbackData === 'menu_copytrade' || callbackData === 'refresh_copytrade') {
        const isRefresh = callbackData === 'refresh_copytrade'
        const messageId = callbackQuery.message?.message_id
        await answerCallbackQuery(callbackQuery.id, isRefresh ? 'Refreshing...' : undefined)
        
        const subscriptions = await getCopytradeSubscriptions(chatId)
        
        const lines: string[] = []
        lines.push(`🎯 <b>Copy Trading</b>`)
        lines.push(``)
        
        // Build keyboard with subscriptions
        const keyboard: { text: string; callback_data: string }[][] = []
        
        if (subscriptions.length === 0) {
          lines.push(`You are not copying any traders yet.`)
        } else {
          lines.push(`You are currently copying <b>${subscriptions.length}</b> trader${subscriptions.length > 1 ? 's' : ''}.`)
          lines.push(``)
          
          // Fetch PnL data for all subscribed wallets in parallel
          const pnlPromises = subscriptions.map(sub => 
            getLeaderboard({ user: sub.wallet_address, limit: 1, timePeriod: 'ALL' }).catch(() => null)
          )
          const pnlResults = await Promise.all(pnlPromises)
          
          for (let i = 0; i < subscriptions.length; i++) {
            const sub = subscriptions[i]
            const traderData = pnlResults[i]?.[0]
            const displayName = sub.name || formatWalletAddress(sub.wallet_address)
            
            // Mode shows Single Trade Limit
            const limitText = sub.single_trade_limit 
              ? `$${sub.single_trade_limit} Fixed` 
              : 'No Limit'
            
            // Get real PnL from trader data
            const totalPnl = traderData?.pnl || 0
            const pnlSign = totalPnl >= 0 ? '+' : ''
            const formattedPnl = totalPnl >= 1000000 
              ? `${pnlSign}$${(totalPnl / 1000000).toFixed(2)}M`
              : totalPnl >= 1000 
                ? `${pnlSign}$${(totalPnl / 1000).toFixed(1)}K`
                : `${pnlSign}$${totalPnl.toFixed(2)}`
            
            lines.push(`• <code>${formatWalletAddress(sub.wallet_address)}</code>`)
            lines.push(`├ Mode: <b>${limitText}</b>`)
            lines.push(`├ Manage`)
            lines.push(`├ Share`)
            lines.push(`├ Daily PnL: <i>N/A</i>`)
            lines.push(`└ Total PnL: <b>${formattedPnl}</b>`)
            lines.push(``)
            
            // Green dot for active subscription
            keyboard.push([{ text: `🟢 ${displayName}`, callback_data: `ct_view_${sub.wallet_address}` }])
          }
        }
        
        keyboard.push([{ text: '+ Add Copy Trade', callback_data: 'ct_add_step1' }])
        keyboard.push([
          { text: 'Activity', callback_data: 'ct_activity' },
          { text: 'Main Menu', callback_data: 'menu_main' }
        ])
        
        if (isRefresh && messageId) {
          await editMessageMedia(chatId, messageId, COPYTRADE_IMAGE_URL, lines.join('\n'), 'HTML', { inline_keyboard: keyboard })
        } else {
          await sendTelegramPhoto(chatId, COPYTRADE_IMAGE_URL, lines.join('\n'), 'HTML', { inline_keyboard: keyboard })
        }
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade - global settings
      if (callbackData === 'ct_global_settings') {
        await answerCallbackQuery(callbackQuery.id)
        
        await sendTelegramPhoto(chatId, COPYTRADE_IMAGE_URL, [
          `<b>Copy Trade Settings</b>`,
          ``,
          `<i>Coming soon!</i>`,
          ``,
          `You will be able to configure:`,
          `- Copy mode (% or fixed $)`,
          `- Copy size per trade`,
          `- Max amount per trade`,
          `- Min trade size to copy`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [
            [{ text: 'AI Mode', callback_data: 'ct_aimode_global' }],
            [{ text: 'Back', callback_data: 'menu_copytrade' }]
          ]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade - global AI mode
      if (callbackData === 'ct_aimode_global') {
        await answerCallbackQuery(callbackQuery.id)
        await sendTelegramPhoto(chatId, COPYTRADE_IMAGE_URL, [
          `<b>🤖 AI Mode</b>`,
          ``,
          `<i>Coming soon!</i>`,
          ``,
          `AI will analyze trades and automatically`,
          `decide which ones to copy based on:`,
          ``,
          `• Market conditions`,
          `• Trader's historical performance`,
          `• Risk assessment`,
          `• Portfolio diversification`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [[{ text: 'Back to Settings', callback_data: 'ct_global_settings' }]]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade - Activity
      if (callbackData === 'ct_activity') {
        await answerCallbackQuery(callbackQuery.id)
        await sendTelegramMessage(chatId, [
          `<b>Copy Trade Activity</b>`,
          ``,
          `<i>No recent activity.</i>`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [[{ text: 'Back', callback_data: 'menu_copytrade' }]]
        })
        return NextResponse.json({ ok: true })
      }
      
      // ============ 7-STEP COPYTRADE FLOW ============
      
      // Step 1: Enter wallet address
      if (callbackData === 'ct_add_step1' || callbackData === 'ct_add') {
        await answerCallbackQuery(callbackQuery.id)
        userStates.set(chatId, { action: 'ct_step1_address' })
        
        await sendTelegramMessage(chatId, [
          `➕ <b>Add Copytrade | Step 1/7</b>`,
          ``,
          `Enter the wallet address of the trader you want to copy:`,
          ``,
          `🔑 <i>Example:</i>`,
          `<code>0x07b8e44b90cc3e91b8d5fe60ea810d2534638e25</code>`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [
            [
              { text: '⬅️ Back', callback_data: 'menu_copytrade' },
              { text: '🏠 Menu', callback_data: 'menu_main' }
            ]
          ]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Step 2: Skip nickname
      if (callbackData === 'ct_step2_skip') {
        await answerCallbackQuery(callbackQuery.id)
        const state = userStates.get(chatId)
        if (!state?.data?.walletAddress) {
          await sendTelegramMessage(chatId, 'Session expired. Please start again.', 'HTML', {
            inline_keyboard: [[{ text: 'Start Over', callback_data: 'ct_add_step1' }]]
          })
          return NextResponse.json({ ok: true })
        }
        
        // Skip to step 3
        userStates.set(chatId, { 
          action: 'ct_step3_mode', 
          data: { ...state.data, nickname: null } 
        })
        
        await sendTelegramMessage(chatId, [
          `➕ <b>Add Copytrade | Step 3/7</b>`,
          ``,
          `How should your copy-trades be sized?`,
          ``,
          `💵 <b>Fixed Amount</b>`,
          `Enter a fixed USDC amount to buy on every copied trade.`,
          `<i>Example: Enter 10 USDC to always buy 10 USDC, regardless of trade size.</i>`,
          ``,
          `💰 <b>Percentage</b>`,
          `Enter the percentage of the leader's buy you want to copy.`,
          `<i>Example: If set to 50% and the leader buys 100 USDC, you'll buy 50 USDC.</i>`,
          ``,
          `📊 <b>Portfolio-Weighted</b>`,
          `Copy trades based on how large the position is relative to the leader's total portfolio.`,
          `<i>Example: If the leader uses 10% of their portfolio on a trade, you'll also use 10% of your portfolio, regardless of account size.</i>`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [
            [{ text: '💵 Fixed', callback_data: 'ct_step3_fixed' }],
            [{ text: '💰 Percentage', callback_data: 'ct_step3_percentage' }],
            [{ text: '📊 Portfolio-Weighted', callback_data: 'ct_step3_portfolio' }],
            [
              { text: '⬅️ Back', callback_data: 'ct_add_step1' },
              { text: '❌ Cancel', callback_data: 'menu_copytrade' }
            ]
          ]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Step 3: Mode selection
      if (callbackData.startsWith('ct_step3_')) {
        await answerCallbackQuery(callbackQuery.id)
        const mode = callbackData.replace('ct_step3_', '') as 'fixed' | 'percentage' | 'portfolio'
        
        const state = userStates.get(chatId)
        if (!state?.data?.walletAddress) {
          await sendTelegramMessage(chatId, 'Session expired. Please start again.', 'HTML', {
            inline_keyboard: [[{ text: 'Start Over', callback_data: 'ct_add_step1' }]]
          })
          return NextResponse.json({ ok: true })
        }
        
        userStates.set(chatId, { 
          action: 'ct_step3b_amount', 
          data: { ...state.data, mode } 
        })
        
        if (mode === 'fixed') {
          await sendTelegramMessage(chatId, [
            `➕ <b>Add Copytrade | Step 3/7</b>`,
            ``,
            `Enter a fixed USDC amount to buy on every copied trade:`,
            ``,
            `<i>Example: If you enter $50, you will spend $50 on each individual market.</i>`,
            ``,
            `<i>(You can also type your own amount, for example $200 or $500)</i>`,
          ].join('\n'), 'HTML', {
            inline_keyboard: [
              [
                { text: '$10', callback_data: 'ct_step3b_10' },
                { text: '$25', callback_data: 'ct_step3b_25' },
                { text: '$50', callback_data: 'ct_step3b_50' },
                { text: '$100', callback_data: 'ct_step3b_100' }
              ],
              [
                { text: '⬅️ Back', callback_data: 'ct_step2_skip' },
                { text: '❌ Cancel', callback_data: 'menu_copytrade' }
              ]
            ]
          })
        } else {
          await sendTelegramMessage(chatId, [
            `➕ <b>Add Copytrade | Step 3/7</b>`,
            ``,
            `What percentage of the leader's trade amount do you want to copy?`,
            ``,
            `<b>Examples:</b>`,
            `• 50% → Leader trades $100, you trade $50`,
            `• 100% → Leader trades $100, you trade $100`,
            `• 200% → Leader trades $100, you trade $200`,
            ``,
            `<b>Range:</b> 1% to 1000%`,
            ``,
            `<i>(You can also type your own percentage, for example 75 or 150)</i>`,
          ].join('\n'), 'HTML', {
            inline_keyboard: [
              [
                { text: '10%', callback_data: 'ct_step3b_10' },
                { text: '25%', callback_data: 'ct_step3b_25' }
              ],
              [
                { text: '50%', callback_data: 'ct_step3b_50' },
                { text: '100%', callback_data: 'ct_step3b_100' }
              ],
              [
                { text: '⬅️ Back', callback_data: 'ct_step2_skip' },
                { text: '❌ Cancel', callback_data: 'menu_copytrade' }
              ]
            ]
          })
        }
        return NextResponse.json({ ok: true })
      }
      
      // Step 3b: Amount/Percentage value
      if (callbackData.startsWith('ct_step3b_')) {
        await answerCallbackQuery(callbackQuery.id)
        const value = parseInt(callbackData.replace('ct_step3b_', ''))
        
        const state = userStates.get(chatId)
        if (!state?.data?.walletAddress) {
          await sendTelegramMessage(chatId, 'Session expired. Please start again.', 'HTML', {
            inline_keyboard: [[{ text: 'Start Over', callback_data: 'ct_add_step1' }]]
          })
          return NextResponse.json({ ok: true })
        }
        
        userStates.set(chatId, { 
          action: 'ct_step4_limit', 
          data: { ...state.data, tradeSize: value } 
        })
        
        await sendTelegramMessage(chatId, [
          `➕ <b>Add Copytrade | Step 4/7</b>`,
          ``,
          `Set your Max Copy $ Amount per Trade`,
          ``,
          `<i>Example: If you set $50, you will spend up to $50 on each individual market.</i>`,
          ``,
          `<i>You can also type your own limit, for example $200 or $500.</i>`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [
            [
              { text: '$10', callback_data: 'ct_step4_10' },
              { text: '$25', callback_data: 'ct_step4_25' },
              { text: '$50', callback_data: 'ct_step4_50' },
              { text: '$100', callback_data: 'ct_step4_100' }
            ],
            [{ text: '∞ No Limit', callback_data: 'ct_step4_nolimit' }],
            [
              { text: '⬅️ Back', callback_data: `ct_step3_${state.data.mode}` },
              { text: '❌ Cancel', callback_data: 'menu_copytrade' }
            ]
          ]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Step 4: Single trade limit
      if (callbackData.startsWith('ct_step4_')) {
        await answerCallbackQuery(callbackQuery.id)
        const limitStr = callbackData.replace('ct_step4_', '')
        const limit = limitStr === 'nolimit' ? null : parseInt(limitStr)
        
        const state = userStates.get(chatId)
        if (!state?.data?.walletAddress) {
          await sendTelegramMessage(chatId, 'Session expired. Please start again.', 'HTML', {
            inline_keyboard: [[{ text: 'Start Over', callback_data: 'ct_add_step1' }]]
          })
          return NextResponse.json({ ok: true })
        }
        
        userStates.set(chatId, { 
          action: 'ct_step5_price', 
          data: { ...state.data, singleTradeLimit: limit } 
        })
        
        await sendTelegramMessage(chatId, [
          `➕ <b>Add Copytrade | Step 5/7</b>`,
          ``,
          `Set a price range for the trades you want to copy:`,
          ``,
          `📝 <i>Example:</i>`,
          `<i>Type a range like 40¢-80¢, or pick one below.</i>`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [
            [
              { text: '2¢–98¢', callback_data: 'ct_step5_2_98' },
              { text: '5¢–95¢', callback_data: 'ct_step5_5_95' }
            ],
            [
              { text: '10¢–90¢', callback_data: 'ct_step5_10_90' },
              { text: '30¢–70¢', callback_data: 'ct_step5_30_70' }
            ],
            [{ text: '🚫 No Filter', callback_data: 'ct_step5_nofilter' }],
            [
              { text: '⬅️ Back', callback_data: 'ct_step4_back' },
              { text: '❌ Cancel', callback_data: 'menu_copytrade' }
            ]
          ]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Step 4 back button
      if (callbackData === 'ct_step4_back') {
        await answerCallbackQuery(callbackQuery.id)
        const state = userStates.get(chatId)
        if (state?.data?.mode) {
          // Go back to step 3b
          userStates.set(chatId, { action: 'ct_step3b_amount', data: state.data })
        }
        // Trigger step 3 mode selection
        return NextResponse.json({ ok: true })
      }
      
      // Step 5: Price range
      if (callbackData.startsWith('ct_step5_')) {
        await answerCallbackQuery(callbackQuery.id)
        const rangeStr = callbackData.replace('ct_step5_', '')
        let priceRangeMin: number | null = null
        let priceRangeMax: number | null = null
        
        if (rangeStr !== 'nofilter') {
          const parts = rangeStr.split('_')
          priceRangeMin = parseInt(parts[0])
          priceRangeMax = parseInt(parts[1])
        }
        
        const state = userStates.get(chatId)
        if (!state?.data?.walletAddress) {
          await sendTelegramMessage(chatId, 'Session expired. Please start again.', 'HTML', {
            inline_keyboard: [[{ text: 'Start Over', callback_data: 'ct_add_step1' }]]
          })
          return NextResponse.json({ ok: true })
        }
        
        userStates.set(chatId, { 
          action: 'ct_step6_slippage', 
          data: { ...state.data, priceRangeMin, priceRangeMax } 
        })
        
        await sendTelegramMessage(chatId, [
          `➕ <b>Add Copytrade | Step 6/7</b>`,
          ``,
          `Set slippage tolerance:`,
          ``,
          `<i>How much price movement to accept when executing trades.</i>`,
          ``,
          `<i>(You can also type your own, for example 12 or 12%)</i>`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [
            [
              { text: '1%', callback_data: 'ct_step6_1' },
              { text: '2%', callback_data: 'ct_step6_2' },
              { text: '5%', callback_data: 'ct_step6_5' },
              { text: '10%', callback_data: 'ct_step6_10' }
            ],
            [
              { text: '🎯 Exact Price', callback_data: 'ct_step6_0' },
              { text: '⚡ Any Price', callback_data: 'ct_step6_100' }
            ],
            [
              { text: '⬅️ Back', callback_data: 'ct_step5_back' },
              { text: '❌ Cancel', callback_data: 'menu_copytrade' }
            ]
          ]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Step 5 back button
      if (callbackData === 'ct_step5_back') {
        await answerCallbackQuery(callbackQuery.id)
        const state = userStates.get(chatId)
        if (state?.data) {
          userStates.set(chatId, { action: 'ct_step4_limit', data: state.data })
        }
        return NextResponse.json({ ok: true })
      }
      
      // Step 6: Slippage
      if (callbackData.startsWith('ct_step6_')) {
        await answerCallbackQuery(callbackQuery.id)
        const slippage = parseInt(callbackData.replace('ct_step6_', ''))
        
        const state = userStates.get(chatId)
        if (!state?.data?.walletAddress) {
          await sendTelegramMessage(chatId, 'Session expired. Please start again.', 'HTML', {
            inline_keyboard: [[{ text: 'Start Over', callback_data: 'ct_add_step1' }]]
          })
          return NextResponse.json({ ok: true })
        }
        
        const data = { ...state.data, slippage }
        userStates.set(chatId, { action: 'ct_step7_confirm', data })
        
        // Build review message
        const modeText = data.mode === 'fixed' 
          ? 'Fixed Amount' 
          : data.mode === 'percentage' 
            ? 'Percentage'
            : 'Portfolio-Weighted'
        
        const tradeSizeText = data.mode === 'fixed'
          ? `$${data.tradeSize}`
          : `${data.tradeSize}% of leader's amount`
        
        const limitText = data.singleTradeLimit ? `$${data.singleTradeLimit}` : 'No limit'
        
        const priceRangeText = data.priceRangeMin && data.priceRangeMax
          ? `${data.priceRangeMin}¢–${data.priceRangeMax}¢`
          : 'No filter'
        
        const slippageText = slippage === 0 
          ? 'Exact Price' 
          : slippage >= 100 
            ? 'Any Price'
            : `${slippage}%`
        
        await sendTelegramMessage(chatId, [
          `➕ <b>Add Copytrade | Step 7/7</b>`,
          ``,
          `Review your settings before confirming:`,
          ``,
          `🏷️ <b>Nickname:</b> ${data.nickname || formatWalletAddress(data.walletAddress as string)}`,
          `📍 <b>Address:</b>`,
          `<code>${data.walletAddress}</code>`,
          ``,
          `⚙️ <b>Mode:</b> ${modeText}`,
          `📐 <b>Trade Size:</b> ${tradeSizeText}`,
          `📏 <b>Single Trade Limit:</b> ${limitText}`,
          `💰 <b>Price Range:</b> ${priceRangeText}`,
          `⚡ <b>Slippage:</b> ${slippageText}`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [
            [{ text: '✅ Confirm', callback_data: 'ct_step7_confirm' }],
            [
              { text: '⬅️ Back', callback_data: 'ct_step6_back' },
              { text: '❌ Cancel', callback_data: 'menu_copytrade' }
            ]
          ]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Step 6 back button
      if (callbackData === 'ct_step6_back') {
        await answerCallbackQuery(callbackQuery.id)
        const state = userStates.get(chatId)
        if (state?.data) {
          userStates.set(chatId, { action: 'ct_step5_price', data: state.data })
        }
        return NextResponse.json({ ok: true })
      }
      
      // Step 7: Confirm and create
      if (callbackData === 'ct_step7_confirm') {
        await answerCallbackQuery(callbackQuery.id)
        const state = userStates.get(chatId)
        
        if (!state?.data?.walletAddress) {
          await sendTelegramMessage(chatId, 'Session expired. Please start again.', 'HTML', {
            inline_keyboard: [[{ text: 'Start Over', callback_data: 'ct_add_step1' }]]
          })
          return NextResponse.json({ ok: true })
        }
        
        const settings: CopytradeSettings = {
          walletAddress: state.data.walletAddress as string,
          nickname: state.data.nickname as string | undefined,
          mode: (state.data.mode as 'fixed' | 'percentage' | 'portfolio') || 'fixed',
          tradeSize: (state.data.tradeSize as number) || 50,
          singleTradeLimit: state.data.singleTradeLimit as number | undefined,
          priceRangeMin: state.data.priceRangeMin as number | undefined,
          priceRangeMax: state.data.priceRangeMax as number | undefined,
          slippage: (state.data.slippage as number) || 5,
        }
        
        userStates.delete(chatId)
        const { error } = await addCopytradeSubscription(chatId, settings)
        
        if (error) {
          await sendTelegramMessage(chatId, [
            `<b>Error</b>`,
            ``,
            `This address is already in your subscriptions.`,
          ].join('\n'), 'HTML', {
            inline_keyboard: [[{ text: 'Back to Copy Trading', callback_data: 'menu_copytrade' }]]
          })
        } else {
          const modeText = settings.mode === 'fixed' 
            ? 'Fixed Amount' 
            : settings.mode === 'percentage' 
              ? 'Percentage'
              : 'Portfolio-Weighted'
          
          const tradeSizeText = settings.mode === 'fixed'
            ? `$${settings.tradeSize}`
            : `${settings.tradeSize}% of leader's amount`
          
          const limitText = settings.singleTradeLimit ? `$${settings.singleTradeLimit}` : 'No limit'
          
          const priceRangeText = settings.priceRangeMin && settings.priceRangeMax
            ? `${settings.priceRangeMin}¢–${settings.priceRangeMax}¢`
            : 'No filter'
          
          const slippageText = settings.slippage === 0 
            ? 'Exact Price' 
            : settings.slippage >= 100 
              ? 'Any Price'
              : `${settings.slippage}%`
          
          await sendTelegramMessage(chatId, [
            `✅ <b>Copytrade Created</b>`,
            ``,
            `Your copytrade with <code>${formatWalletAddress(settings.walletAddress)}</code> is now live!`,
            ``,
            `📐 <b>Trade Size:</b> ${tradeSizeText}`,
            `📏 <b>Single Trade Limit:</b> ${limitText}`,
            `💰 <b>Price Range:</b> ${priceRangeText}`,
            `⚡ <b>Slippage:</b> ${slippageText}`,
          ].join('\n'), 'HTML', {
            inline_keyboard: [
              [{ text: '🔄 Mirror this Copy Trade', callback_data: 'ct_mirror' }],
              [{ text: '⚙️ Manage Copytrade', callback_data: `ct_view_${settings.walletAddress}` }],
              [{ text: '👁️ View All', callback_data: 'menu_copytrade' }]
            ]
          })
        }
        return NextResponse.json({ ok: true })
      }
      
      // Mirror copytrade (placeholder)
      if (callbackData === 'ct_mirror') {
        await answerCallbackQuery(callbackQuery.id, 'Coming soon!')
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade - view subscription details
      if (callbackData.startsWith('ct_view_')) {
        const walletAddress = callbackData.replace('ct_view_', '')
        await answerCallbackQuery(callbackQuery.id)
        
        // Get subscription details from database
        const subscriptions = await getCopytradeSubscriptions(chatId)
        const sub = subscriptions.find(s => s.wallet_address.toLowerCase() === walletAddress.toLowerCase())
        
        if (!sub) {
          await sendTelegramMessage(chatId, 'Subscription not found.', 'HTML', {
            inline_keyboard: [[{ text: 'Back', callback_data: 'menu_copytrade' }]]
          })
          return NextResponse.json({ ok: true })
        }
        
        // Format mode text
        const modeText = sub.mode === 'fixed' 
          ? 'Fixed Amount' 
          : sub.mode === 'percentage' 
            ? 'Percentage'
            : 'Portfolio-Weighted'
        
        // Format trade size
        const tradeSizeText = sub.mode === 'fixed'
          ? `$${sub.trade_size || 0}`
          : `${sub.trade_size || 0}% of leader's amount`
        
        // Format price range
        const priceRangeText = sub.price_range_min && sub.price_range_max
          ? `${sub.price_range_min}c - ${sub.price_range_max}c`
          : 'No filter'
        
        // Format single trade limit
        const singleLimitText = sub.single_trade_limit 
          ? `$${parseFloat(sub.single_trade_limit).toFixed(2)}`
          : 'No limit'
        
        // Status (default to active)
        const isActive = sub.is_active !== false
        const statusText = isActive ? '▶️ Active' : '⏸ Paused'
        
        // Notifications (default to enabled)
        const notificationsEnabled = sub.notifications !== false
        const notifText = notificationsEnabled ? '🔔 Enabled' : '🔕 Disabled'
        
        const lines = [
          `📋 <b>Copytrade Details</b>`,
          ``,
          `👤 <b>Leader:</b> <code>${formatWalletAddress(walletAddress)}</code>`,
          `🔗 <a href="https://polymarket.com/profile/${walletAddress}">View on Polymarket</a>`,
          `📊 <b>Status:</b> ${statusText}`,
          `🔔 <b>Notifications:</b> ${notifText}`,
          `💵 <b>Spent:</b> $0.00 / ${sub.single_trade_limit ? '$' + sub.single_trade_limit : '∞'}`,
          ``,
          `<b>Mode & Trade Size</b>`,
          `• Mode: ${modeText}`,
          `• Trade Size: ${tradeSizeText}`,
          ``,
          `<b>Limits</b>`,
          `• Slippage: ${sub.slippage || 5}%`,
          `• Price Range: ${priceRangeText}`,
          `• Single Market: ${singleLimitText}`,
        ]
        
        await sendTelegramMessage(chatId, lines.join('\n'), 'HTML', {
          inline_keyboard: [
            [{ text: '⚙️ Change Mode', callback_data: `ct_edit_mode_${walletAddress}` }],
            [
              { text: '📊 Price Range', callback_data: `ct_edit_price_${walletAddress}` },
              { text: '⚡ Slippage', callback_data: `ct_edit_slip_${walletAddress}` }
            ],
            [
              { text: '📅 Daily Limit', callback_data: `ct_edit_daily_${walletAddress}` },
              { text: '📐 Single Trade Limit', callback_data: `ct_edit_single_${walletAddress}` }
            ],
            [
              { text: isActive ? '⏸ Pause' : '▶️ Resume', callback_data: `ct_toggle_${walletAddress}` },
              { text: notificationsEnabled ? '🔕 Mute' : '🔔 Unmute', callback_data: `ct_notif_${walletAddress}` },
              { text: '🗑 Delete', callback_data: `ct_delete_${walletAddress}` }
            ],
            [
              { text: '⬅️ Back', callback_data: 'menu_copytrade' },
              { text: '🏠 Main Menu', callback_data: 'menu_main' }
            ]
          ]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade - toggle pause/resume
      if (callbackData.startsWith('ct_toggle_')) {
        const walletAddress = callbackData.replace('ct_toggle_', '')
        await answerCallbackQuery(callbackQuery.id, 'Coming soon!')
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade - toggle notifications
      if (callbackData.startsWith('ct_notif_')) {
        const walletAddress = callbackData.replace('ct_notif_', '')
        await answerCallbackQuery(callbackQuery.id, 'Coming soon!')
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade - edit mode
      if (callbackData.startsWith('ct_edit_mode_')) {
        const walletAddress = callbackData.replace('ct_edit_mode_', '')
        await answerCallbackQuery(callbackQuery.id)
        
        await sendTelegramMessage(chatId, [
          `⚙️ <b>Change Mode</b>`,
          ``,
          `Select a new copy trading mode:`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [
            [{ text: '💵 Fixed Amount', callback_data: `ct_setmode_fixed_${walletAddress}` }],
            [{ text: '💰 Percentage', callback_data: `ct_setmode_percentage_${walletAddress}` }],
            [{ text: '📊 Portfolio-Weighted', callback_data: `ct_setmode_portfolio_${walletAddress}` }],
            [{ text: '⬅️ Back', callback_data: `ct_view_${walletAddress}` }]
          ]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade - edit price range
      if (callbackData.startsWith('ct_edit_price_')) {
        const walletAddress = callbackData.replace('ct_edit_price_', '')
        await answerCallbackQuery(callbackQuery.id)
        
        await sendTelegramMessage(chatId, [
          `📊 <b>Price Range</b>`,
          ``,
          `Set a price range for trades to copy:`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [
            [
              { text: '2c-98c', callback_data: `ct_setprice_2_98_${walletAddress}` },
              { text: '5c-95c', callback_data: `ct_setprice_5_95_${walletAddress}` }
            ],
            [
              { text: '10c-90c', callback_data: `ct_setprice_10_90_${walletAddress}` },
              { text: '30c-70c', callback_data: `ct_setprice_30_70_${walletAddress}` }
            ],
            [{ text: '🚫 No Filter', callback_data: `ct_setprice_none_${walletAddress}` }],
            [{ text: '⬅️ Back', callback_data: `ct_view_${walletAddress}` }]
          ]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade - edit slippage
      if (callbackData.startsWith('ct_edit_slip_')) {
        const walletAddress = callbackData.replace('ct_edit_slip_', '')
        await answerCallbackQuery(callbackQuery.id)
        
        await sendTelegramMessage(chatId, [
          `⚡ <b>Slippage Tolerance</b>`,
          ``,
          `Set how much price movement to accept:`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [
            [
              { text: '1%', callback_data: `ct_setslip_1_${walletAddress}` },
              { text: '2%', callback_data: `ct_setslip_2_${walletAddress}` },
              { text: '5%', callback_data: `ct_setslip_5_${walletAddress}` },
              { text: '10%', callback_data: `ct_setslip_10_${walletAddress}` }
            ],
            [
              { text: '🎯 Exact Price', callback_data: `ct_setslip_0_${walletAddress}` },
              { text: '⚡ Any Price', callback_data: `ct_setslip_100_${walletAddress}` }
            ],
            [{ text: '⬅️ Back', callback_data: `ct_view_${walletAddress}` }]
          ]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade - edit daily limit
      if (callbackData.startsWith('ct_edit_daily_')) {
        const walletAddress = callbackData.replace('ct_edit_daily_', '')
        await answerCallbackQuery(callbackQuery.id, 'Coming soon!')
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade - edit single trade limit
      if (callbackData.startsWith('ct_edit_single_')) {
        const walletAddress = callbackData.replace('ct_edit_single_', '')
        await answerCallbackQuery(callbackQuery.id)
        
        await sendTelegramMessage(chatId, [
          `📐 <b>Single Trade Limit</b>`,
          ``,
          `Set max amount per trade:`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [
            [
              { text: '$10', callback_data: `ct_setsingle_10_${walletAddress}` },
              { text: '$25', callback_data: `ct_setsingle_25_${walletAddress}` },
              { text: '$50', callback_data: `ct_setsingle_50_${walletAddress}` },
              { text: '$100', callback_data: `ct_setsingle_100_${walletAddress}` }
            ],
            [{ text: '∞ No Limit', callback_data: `ct_setsingle_none_${walletAddress}` }],
            [{ text: '⬅️ Back', callback_data: `ct_view_${walletAddress}` }]
          ]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade - rename subscription
      if (callbackData.startsWith('ct_rename_')) {
        const walletAddress = callbackData.replace('ct_rename_', '')
        await answerCallbackQuery(callbackQuery.id)
        userStates.set(chatId, { action: 'copytrade_rename', data: { walletAddress } })
        
        await sendTelegramMessage(chatId, [
          `<b>Rename Subscription</b>`,
          ``,
          `Current: <code>${formatWalletAddress(walletAddress)}</code>`,
          ``,
          `Enter new name:`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [[{ text: 'Cancel', callback_data: `ct_view_${walletAddress}` }]]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade - delete subscription
      if (callbackData.startsWith('ct_delete_')) {
        const walletAddress = callbackData.replace('ct_delete_', '')
        await answerCallbackQuery(callbackQuery.id)
        
        const success = await deleteCopytradeSubscription(chatId, walletAddress)
        if (success) {
          await sendTelegramMessage(chatId, `Subscription deleted.`, 'HTML', {
            inline_keyboard: [[{ text: 'Back to Copy Trading', callback_data: 'menu_copytrade' }]]
          })
        } else {
          await sendTelegramMessage(chatId, `Failed to delete subscription.`, 'HTML', {
            inline_keyboard: [[{ text: 'Back', callback_data: 'menu_copytrade' }]]
          })
        }
        return NextResponse.json({ ok: true })
      }
      

      // Referral
      if (callbackData === 'menu_referral') {
        await answerCallbackQuery(callbackQuery.id)
        await sendTelegramPhoto(chatId, REFERRAL_IMAGE_URL, [
          `<b>Referral</b>`,
          ``,
          `<i>Coming soon!</i>`,
          ``,
          `Invite friends and earn rewards.`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [[{ text: 'Back', callback_data: 'menu_main' }]]
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
    
    // Check for user state (multi-step operations)
    const userState = userStates.get(chatId)
    if (userState) {
      // Withdraw - step 2: got address, ask for amount
      if (userState.action === 'withdraw_address') {
        if (!text.startsWith('0x') || text.length !== 42) {
          await sendTelegramMessage(chatId, 'Invalid address. Please enter a valid Ethereum address (0x...)', 'HTML', {
            inline_keyboard: [[{ text: 'Cancel', callback_data: 'menu_wallet' }]]
          })
          return NextResponse.json({ ok: true })
        }
        
        userStates.set(chatId, { action: 'withdraw_amount', data: { toAddress: text } })
        await sendTelegramMessage(chatId, [
          `<b>Withdraw USDC</b>`,
          ``,
          `To: <code>${text}</code>`,
          ``,
          `Enter amount to withdraw (e.g., 10.50):`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [[{ text: 'Cancel', callback_data: 'menu_wallet' }]]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Withdraw - step 3: got amount, execute
      if (userState.action === 'withdraw_amount') {
        const amount = parseFloat(text)
        if (isNaN(amount) || amount <= 0) {
          await sendTelegramMessage(chatId, 'Invalid amount. Please enter a valid number.', 'HTML', {
            inline_keyboard: [[{ text: 'Cancel', callback_data: 'menu_wallet' }]]
          })
          return NextResponse.json({ ok: true })
        }
        
        const toAddress = userState.data?.toAddress as string
        userStates.delete(chatId)
        
        const wallet = await getWalletByChatId(chatId)
        if (!wallet) {
          await sendTelegramMessage(chatId, 'No wallet found.')
          return NextResponse.json({ ok: true })
        }
        
        await sendTelegramMessage(chatId, 'Processing withdrawal...')
        
        const privateKey = decryptPrivateKey(wallet.encrypted_private_key)
        const result = await sendUSDC(privateKey, toAddress, amount.toString())
        
        if (result.success) {
          await sendTelegramMessage(chatId, [
            `<b>Withdrawal Successful</b>`,
            ``,
            `Amount: <b>$${amount.toFixed(2)}</b>`,
            `To: <code>${formatWalletAddress(toAddress)}</code>`,
            ``,
            `TX: <code>${result.txHash}</code>`,
          ].join('\n'), 'HTML', {
            inline_keyboard: [[{ text: 'Back to Wallet', callback_data: 'menu_wallet' }]]
          })
        } else {
          await sendTelegramMessage(chatId, [
            `<b>Withdrawal Failed</b>`,
            ``,
            `Error: ${result.error}`,
          ].join('\n'), 'HTML', {
            inline_keyboard: [[{ text: 'Back to Wallet', callback_data: 'menu_wallet' }]]
          })
        }
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade Step 1 - Enter wallet address
      if (userState.action === 'ct_step1_address') {
        if (!text.startsWith('0x') || text.length !== 42) {
          await sendTelegramMessage(chatId, [
            `Invalid address format.`,
            ``,
            `Please enter a valid Ethereum address starting with 0x (42 characters).`,
          ].join('\n'), 'HTML', {
            inline_keyboard: [
              [
                { text: '⬅️ Back', callback_data: 'menu_copytrade' },
                { text: '❌ Cancel', callback_data: 'menu_copytrade' }
              ]
            ]
          })
          return NextResponse.json({ ok: true })
        }
        
        // Move to step 2 - nickname
        userStates.set(chatId, { 
          action: 'ct_step2_nickname', 
          data: { walletAddress: text.toLowerCase() } 
        })
        
        await sendTelegramMessage(chatId, [
          `➕ <b>Add Copytrade | Step 2/7</b>`,
          ``,
          `<b>Wallet:</b>`,
          `<code>${text}</code>`,
          ``,
          `Give this trader a nickname:`,
          ``,
          `📝 <i>Example:</i>`,
          `<i>"Top Trader", "Degen King"</i>`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [
            [{ text: '⏭️ Skip', callback_data: 'ct_step2_skip' }],
            [
              { text: '⬅️ Back', callback_data: 'ct_add_step1' },
              { text: '❌ Cancel', callback_data: 'menu_copytrade' }
            ]
          ]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade Step 2 - Enter nickname
      if (userState.action === 'ct_step2_nickname') {
        const walletAddress = userState.data?.walletAddress as string
        if (!walletAddress) {
          await sendTelegramMessage(chatId, 'Session expired. Please start again.', 'HTML', {
            inline_keyboard: [[{ text: 'Start Over', callback_data: 'ct_add_step1' }]]
          })
          return NextResponse.json({ ok: true })
        }
        
        // Move to step 3 - mode selection
        userStates.set(chatId, { 
          action: 'ct_step3_mode', 
          data: { walletAddress, nickname: text } 
        })
        
        await sendTelegramMessage(chatId, [
          `➕ <b>Add Copytrade | Step 3/7</b>`,
          ``,
          `How should your copy-trades be sized?`,
          ``,
          `💵 <b>Fixed Amount</b>`,
          `Enter a fixed USDC amount to buy on every copied trade.`,
          `<i>Example: Enter 10 USDC to always buy 10 USDC, regardless of trade size.</i>`,
          ``,
          `💰 <b>Percentage</b>`,
          `Enter the percentage of the leader's buy you want to copy.`,
          `<i>Example: If set to 50% and the leader buys 100 USDC, you'll buy 50 USDC.</i>`,
          ``,
          `📊 <b>Portfolio-Weighted</b>`,
          `Copy trades based on how large the position is relative to the leader's total portfolio.`,
          `<i>Example: If the leader uses 10% of their portfolio on a trade, you'll also use 10% of your portfolio, regardless of account size.</i>`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [
            [{ text: '💵 Fixed', callback_data: 'ct_step3_fixed' }],
            [{ text: '💰 Percentage', callback_data: 'ct_step3_percentage' }],
            [{ text: '📊 Portfolio-Weighted', callback_data: 'ct_step3_portfolio' }],
            [
              { text: '⬅️ Back', callback_data: 'ct_add_step1' },
              { text: '❌ Cancel', callback_data: 'menu_copytrade' }
            ]
          ]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade Step 3b - Custom amount/percentage input
      if (userState.action === 'ct_step3b_amount') {
        const value = parseInt(text.replace(/[^0-9]/g, ''))
        if (isNaN(value) || value <= 0) {
          await sendTelegramMessage(chatId, 'Please enter a valid number.', 'HTML', {
            inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'menu_copytrade' }]]
          })
          return NextResponse.json({ ok: true })
        }
        
        // Move to step 4
        userStates.set(chatId, { 
          action: 'ct_step4_limit', 
          data: { ...userState.data, tradeSize: value } 
        })
        
        await sendTelegramMessage(chatId, [
          `➕ <b>Add Copytrade | Step 4/7</b>`,
          ``,
          `Set your Max Copy $ Amount per Trade`,
          ``,
          `<i>Example: If you set $50, you will spend up to $50 on each individual market.</i>`,
          ``,
          `<i>You can also type your own limit, for example $200 or $500.</i>`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [
            [
              { text: '$10', callback_data: 'ct_step4_10' },
              { text: '$25', callback_data: 'ct_step4_25' },
              { text: '$50', callback_data: 'ct_step4_50' },
              { text: '$100', callback_data: 'ct_step4_100' }
            ],
            [{ text: '∞ No Limit', callback_data: 'ct_step4_nolimit' }],
            [
              { text: '⬅️ Back', callback_data: `ct_step3_${userState.data?.mode}` },
              { text: '❌ Cancel', callback_data: 'menu_copytrade' }
            ]
          ]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade Step 4 - Custom limit input
      if (userState.action === 'ct_step4_limit') {
        const value = parseInt(text.replace(/[^0-9]/g, ''))
        if (isNaN(value) || value <= 0) {
          await sendTelegramMessage(chatId, 'Please enter a valid number or use "No Limit".', 'HTML', {
            inline_keyboard: [[{ text: '∞ No Limit', callback_data: 'ct_step4_nolimit' }]]
          })
          return NextResponse.json({ ok: true })
        }
        
        // Move to step 5
        userStates.set(chatId, { 
          action: 'ct_step5_price', 
          data: { ...userState.data, singleTradeLimit: value } 
        })
        
        await sendTelegramMessage(chatId, [
          `➕ <b>Add Copytrade | Step 5/7</b>`,
          ``,
          `Set a price range for the trades you want to copy:`,
          ``,
          `📝 <i>Example:</i>`,
          `<i>Type a range like 40¢-80¢, or pick one below.</i>`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [
            [
              { text: '2¢–98¢', callback_data: 'ct_step5_2_98' },
              { text: '5¢–95¢', callback_data: 'ct_step5_5_95' }
            ],
            [
              { text: '10¢–90¢', callback_data: 'ct_step5_10_90' },
              { text: '30¢–70¢', callback_data: 'ct_step5_30_70' }
            ],
            [{ text: '🚫 No Filter', callback_data: 'ct_step5_nofilter' }],
            [
              { text: '⬅️ Back', callback_data: 'ct_step4_back' },
              { text: '❌ Cancel', callback_data: 'menu_copytrade' }
            ]
          ]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade Step 6 - Custom slippage input
      if (userState.action === 'ct_step6_slippage') {
        const value = parseInt(text.replace(/[^0-9]/g, ''))
        if (isNaN(value) || value < 0 || value > 100) {
          await sendTelegramMessage(chatId, 'Please enter a valid slippage percentage (0-100).', 'HTML', {
            inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'menu_copytrade' }]]
          })
          return NextResponse.json({ ok: true })
        }
        
        const data = { ...userState.data, slippage: value }
        userStates.set(chatId, { action: 'ct_step7_confirm', data })
        
        // Build review message
        const modeText = data.mode === 'fixed' 
          ? 'Fixed Amount' 
          : data.mode === 'percentage' 
            ? 'Percentage'
            : 'Portfolio-Weighted'
        
        const tradeSizeText = data.mode === 'fixed'
          ? `$${data.tradeSize}`
          : `${data.tradeSize}% of leader's amount`
        
        const limitText = data.singleTradeLimit ? `$${data.singleTradeLimit}` : 'No limit'
        
        const priceRangeText = data.priceRangeMin && data.priceRangeMax
          ? `${data.priceRangeMin}¢–${data.priceRangeMax}¢`
          : 'No filter'
        
        const slippageText = value === 0 
          ? 'Exact Price' 
          : value >= 100 
            ? 'Any Price'
            : `${value}%`
        
        await sendTelegramMessage(chatId, [
          `➕ <b>Add Copytrade | Step 7/7</b>`,
          ``,
          `Review your settings before confirming:`,
          ``,
          `🏷️ <b>Nickname:</b> ${data.nickname || formatWalletAddress(data.walletAddress as string)}`,
          `📍 <b>Address:</b>`,
          `<code>${data.walletAddress}</code>`,
          ``,
          `⚙️ <b>Mode:</b> ${modeText}`,
          `📐 <b>Trade Size:</b> ${tradeSizeText}`,
          `📏 <b>Single Trade Limit:</b> ${limitText}`,
          `💰 <b>Price Range:</b> ${priceRangeText}`,
          `⚡ <b>Slippage:</b> ${slippageText}`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [
            [{ text: '✅ Confirm', callback_data: 'ct_step7_confirm' }],
            [
              { text: '⬅️ Back', callback_data: 'ct_step6_back' },
              { text: '❌ Cancel', callback_data: 'menu_copytrade' }
            ]
          ]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade - rename
      if (userState.action === 'copytrade_rename') {
        const walletAddress = userState.data?.walletAddress as string
        userStates.delete(chatId)
        
        const success = await renameCopytradeSubscription(chatId, walletAddress, text)
        if (success) {
          await sendTelegramMessage(chatId, `Renamed to "${text}"`, 'HTML', {
            inline_keyboard: [[{ text: 'Back to Copy Trading', callback_data: 'menu_copytrade' }]]
          })
        } else {
          await sendTelegramMessage(chatId, 'Failed to rename.', 'HTML', {
            inline_keyboard: [[{ text: 'Back', callback_data: 'menu_copytrade' }]]
          })
        }
        return NextResponse.json({ ok: true })
      }
    }
    
    // /start
    if (text === '/start') {
      const welcomeCaption = [
        `<b>Welcome to Vantake Notifications Bot!</b>`,
        ``,
        `Get real-time alerts when traders you track make new bets on Polymarket.`,
        ``,
        `<b>Option 1 - Link existing account:</b>`,
        `1. Go to app.vantake.trade/settings`,
        `2. Copy your linking code`,
        `3. Send it here: /link YOUR_CODE`,
        ``,
        `<b>Option 2 - Create new wallet:</b>`,
        `1. Click Wallet below`,
        `2. Create a new wallet`,
        `3. Start copy trading top traders!`,
        ``,
        `We on <a href="${TWITTER_URL}">X.com</a> / <a href="${APP_URL}">app.vantake.trade</a>`,
      ].join('\n')
      
      await sendTelegramPhoto(chatId, WELCOME_IMAGE_URL, welcomeCaption, 'HTML', getMainMenuKeyboard())
      return NextResponse.json({ ok: true })
    }
    
    // /status
    if (text === '/status') {
      const supabase = createAdminClient()
      
      // Check both profiles AND notification_settings for telegram_chat_id
      const profile = await findUserByChatId(chatId)
      
      // Also check notification_settings directly
      const { data: notifSettings } = await supabase
        .from('notification_settings')
        .select('user_id, telegram_notifications_enabled, telegram_chat_id')
        .eq('telegram_chat_id', chatId)
        .single()

      if (profile || notifSettings) {
        const userId = profile?.id || notifSettings?.user_id
        const traders = userId ? await getTrackedTraders(userId) : []
        
        // Get display name if not from profile
        let displayName = profile?.display_name
        if (!displayName && notifSettings?.user_id) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', notifSettings.user_id)
            .single()
          displayName = userProfile?.display_name
        }

        const enabled = notifSettings?.telegram_notifications_enabled ?? true
        const status = enabled ? 'Active' : 'Paused'

        await sendTelegramMessage(chatId, [
          `<b>Account Status</b>`,
          ``,
          `Account: <b>${displayName || 'Vantake User'}</b>`,
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

    // /link without code - show instructions
    if (text.toLowerCase() === '/link') {
      await sendTelegramMessage(chatId, [
        `<b>Link Your Vantake Account</b>`,
        ``,
        `To receive trade alerts, link your Vantake account:`,
        ``,
        `1. Go to <b>app.vantake.trade/settings</b>`,
        `2. Find your <b>Telegram Linking Code</b>`,
        `3. Send it here: <code>/link YOUR_CODE</code>`,
        ``,
        `Example: <code>/link ABC12345</code>`,
      ].join('\n'), 'HTML', {
        inline_keyboard: [
          [{ text: 'Open Settings', url: 'https://app.vantake.trade/settings' }],
          [{ text: 'Main Menu', callback_data: 'menu_main' }]
        ]
      })
      return NextResponse.json({ ok: true })
    }
    
    // /link CODE or raw 8-char code
    let rawCode = text
    if (text.toLowerCase().startsWith('/link ')) {
      rawCode = text.slice(6).trim()
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
