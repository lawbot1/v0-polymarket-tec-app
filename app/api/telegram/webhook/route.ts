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

const WELCOME_IMAGE_URL = 'https://app.vantake.trade/telegram-welcome.png'
const WALLET_IMAGE_URL = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-5ZjBkRTp9vW4km5vzyvp5JPVeGBq8B.png'
const PROFILE_IMAGE_URL = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Fgu7NCVLAF6fGAL2VTUhBB4FQ2bmrQ.png'
const POSITIONS_IMAGE_URL = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-2B2qRwHmVM6TZtDud2rgIqirvtDZ9b.png'
const COPYTRADE_IMAGE_URL = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-kyFfan5ygX8M725TJvgTtLUj75cJmd.png'
const REFERRAL_IMAGE_URL = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-4ZomyzJGs8UwpFz8ERZyeLYnDkQkPP.png'
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

// Helper: add copytrade subscription
async function addCopytradeSubscription(chatId: string, walletAddress: string, name?: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('telegram_copytrade_subscriptions')
    .insert({
      telegram_chat_id: chatId,
      wallet_address: walletAddress.toLowerCase(),
      name: name || null,
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

// Helper: get single subscription by wallet
async function getSubscription(chatId: string, walletAddress: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('telegram_copytrade_subscriptions')
    .select('*')
    .eq('telegram_chat_id', chatId)
    .eq('wallet_address', walletAddress.toLowerCase())
    .single()
  return data
}

// Helper: update copytrade settings
async function updateCopytradeSettings(
  chatId: string, 
  walletAddress: string, 
  settings: {
    copy_mode?: string
    copy_value?: number
    max_per_trade?: number
    min_trade_size?: number
    is_enabled?: boolean
  }
) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('telegram_copytrade_subscriptions')
    .update({ ...settings, updated_at: new Date().toISOString() })
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
      
      // Handle "Copytrade AI (Soon)" button
      if (callbackData === 'copytrade_ai_soon') {
        await answerCallbackQuery(callbackQuery.id, 'Copytrade AI is coming soon! Stay tuned.')
        return NextResponse.json({ ok: true })
      }
      
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
      if (callbackData === 'menu_positions') {
        await answerCallbackQuery(callbackQuery.id)
        const wallet = await getWalletByChatId(chatId)
        
        if (!wallet) {
          await sendTelegramPhoto(chatId, POSITIONS_IMAGE_URL, [
            `<b>Positions</b>`,
            ``,
            `Create a wallet first to trade.`,
          ].join('\n'), 'HTML', {
            inline_keyboard: [[{ text: 'Back', callback_data: 'menu_main' }]]
          })
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
        
        await sendTelegramPhoto(chatId, POSITIONS_IMAGE_URL, posLines.join('\n'), 'HTML', {
          inline_keyboard: [
            [{ text: 'Refresh', callback_data: 'menu_positions' }],
            [{ text: 'Back', callback_data: 'menu_main' }]
          ]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade - main menu
      if (callbackData === 'menu_copytrade') {
        await answerCallbackQuery(callbackQuery.id)
        const subscriptions = await getCopytradeSubscriptions(chatId)
        
        const lines = [`<b>Copy Trading</b>`, ``, `Your subscriptions:`]
        
        // Build keyboard with subscriptions
        const keyboard: { text: string; callback_data: string }[][] = []
        
        if (subscriptions.length === 0) {
          lines.push(``, `<i>No subscriptions yet.</i>`)
        } else {
          for (const sub of subscriptions) {
            const displayName = sub.name || formatWalletAddress(sub.wallet_address)
            lines.push(``)
            lines.push(`🟢 Active <code>${formatWalletAddress(sub.wallet_address)}</code>`)
            keyboard.push([{ text: displayName, callback_data: `ct_view_${sub.wallet_address}` }])
          }
        }
        
        keyboard.push([{ text: '+ Add address', callback_data: 'ct_add' }])
        keyboard.push([{ text: '⚙️ Settings', callback_data: 'ct_global_settings' }])
        keyboard.push([
          { text: 'Back', callback_data: 'menu_main' },
          { text: 'Refresh', callback_data: 'menu_copytrade' }
        ])
        
        await sendTelegramPhoto(chatId, COPYTRADE_IMAGE_URL, lines.join('\n'), 'HTML', { inline_keyboard: keyboard })
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade - global settings
      if (callbackData === 'ct_global_settings') {
        await answerCallbackQuery(callbackQuery.id)
        const subscriptions = await getCopytradeSubscriptions(chatId)
        
        if (subscriptions.length === 0) {
          await sendTelegramPhoto(chatId, COPYTRADE_IMAGE_URL, [
            `<b>⚙️ Copy Trade Settings</b>`,
            ``,
            `<i>No subscriptions yet.</i>`,
            ``,
            `Add a wallet address first to configure settings.`,
          ].join('\n'), 'HTML', {
            inline_keyboard: [[{ text: 'Back', callback_data: 'menu_copytrade' }]]
          })
          return NextResponse.json({ ok: true })
        }
        
        const lines = [
          `<b>⚙️ Copy Trade Settings</b>`,
          ``,
          `Select a wallet to configure:`,
        ]
        
        const keyboard: { text: string; callback_data: string }[][] = []
        for (const sub of subscriptions) {
          const displayName = sub.name || formatWalletAddress(sub.wallet_address)
          const status = sub.is_enabled ? '🟢' : '🔴'
          keyboard.push([{ text: `${status} ${displayName}`, callback_data: `ct_settings_${sub.wallet_address}` }])
        }
        
        keyboard.push([{ text: '🤖 AI Mode', callback_data: 'ct_aimode_global' }])
        keyboard.push([{ text: 'Back', callback_data: 'menu_copytrade' }])
        
        await sendTelegramPhoto(chatId, COPYTRADE_IMAGE_URL, lines.join('\n'), 'HTML', { inline_keyboard: keyboard })
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
      
      // Copy Trade - add address
      if (callbackData === 'ct_add') {
        await answerCallbackQuery(callbackQuery.id)
        userStates.set(chatId, { action: 'copytrade_add' })
        
        await sendTelegramPhoto(chatId, COPYTRADE_IMAGE_URL, [
          `<b>Add Copy Trade Address</b>`,
          ``,
          `Enter the wallet address you want to copy (0x...):`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [[{ text: 'Cancel', callback_data: 'menu_copytrade' }]]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade - view subscription details
      if (callbackData.startsWith('ct_view_')) {
        const walletAddress = callbackData.replace('ct_view_', '')
        await answerCallbackQuery(callbackQuery.id)
        
        // Get subscription settings
        const sub = await getSubscription(chatId, walletAddress)
        const stats = await getTraderStats(walletAddress)
        const pnlSign = stats.pnl >= 0 ? '+' : ''
        
        const modeText = sub?.copy_mode === 'fixed' ? `$${sub?.copy_value || 5}` : `${sub?.copy_value || 10}%`
        const statusText = sub?.is_enabled ? 'Enabled' : 'Disabled'
        
        const lines = [
          `<b>Trader Stats</b>`,
          ``,
          `Address: <code>${formatWalletAddress(walletAddress)}</code>`,
          `Status: <b>${statusText}</b>`,
          ``,
          `<b>Copy Settings:</b>`,
          `Mode: ${sub?.copy_mode === 'fixed' ? 'Fixed Amount' : 'Percentage'}`,
          `Copy Size: ${modeText}`,
          `Max per trade: $${sub?.max_per_trade || 50}`,
          `Min trade size: $${sub?.min_trade_size || 1}`,
          ``,
          `<b>Trader Performance:</b>`,
          `PnL: <b>${pnlSign}$${stats.pnl.toFixed(2)}</b>`,
          `Volume: <b>$${stats.volume.toFixed(2)}</b>`,
          `Trades: <b>${stats.numTrades}</b>`,
        ]
        
        if (stats.positions.length > 0) {
          lines.push(``, `<b>Active Positions:</b>`)
          for (const pos of stats.positions.slice(0, 3)) {
            const marketName = pos.market.length > 30 ? pos.market.slice(0, 27) + '...' : pos.market
            lines.push(`• ${marketName}`)
          }
        }
        
        await sendTelegramPhoto(chatId, COPYTRADE_IMAGE_URL, lines.join('\n'), 'HTML', {
          inline_keyboard: [
            [{ text: sub?.is_enabled ? 'Disable' : 'Enable', callback_data: `ct_toggle_${walletAddress}` }],
            [{ text: 'Settings', callback_data: `ct_settings_${walletAddress}` }],
            [{ text: 'Rename', callback_data: `ct_rename_${walletAddress}` }],
            [{ text: 'Delete', callback_data: `ct_delete_${walletAddress}` }],
            [{ text: 'Back', callback_data: 'menu_copytrade' }]
          ]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade - toggle enable/disable
      if (callbackData.startsWith('ct_toggle_')) {
        const walletAddress = callbackData.replace('ct_toggle_', '')
        const sub = await getSubscription(chatId, walletAddress)
        await updateCopytradeSettings(chatId, walletAddress, { is_enabled: !sub?.is_enabled })
        await answerCallbackQuery(callbackQuery.id, sub?.is_enabled ? 'Disabled' : 'Enabled')
        // Redirect back to view
        const newSub = await getSubscription(chatId, walletAddress)
        const stats = await getTraderStats(walletAddress)
        const pnlSign = stats.pnl >= 0 ? '+' : ''
        const modeText = newSub?.copy_mode === 'fixed' ? `$${newSub?.copy_value || 5}` : `${newSub?.copy_value || 10}%`
        const statusText = newSub?.is_enabled ? 'Enabled' : 'Disabled'
        
        const lines = [
          `<b>Trader Stats</b>`,
          ``,
          `Address: <code>${formatWalletAddress(walletAddress)}</code>`,
          `Status: <b>${statusText}</b>`,
          ``,
          `<b>Copy Settings:</b>`,
          `Mode: ${newSub?.copy_mode === 'fixed' ? 'Fixed Amount' : 'Percentage'}`,
          `Copy Size: ${modeText}`,
          `Max per trade: $${newSub?.max_per_trade || 50}`,
          `Min trade size: $${newSub?.min_trade_size || 1}`,
          ``,
          `<b>Trader Performance:</b>`,
          `PnL: <b>${pnlSign}$${stats.pnl.toFixed(2)}</b>`,
        ]
        
        await sendTelegramPhoto(chatId, COPYTRADE_IMAGE_URL, lines.join('\n'), 'HTML', {
          inline_keyboard: [
            [{ text: newSub?.is_enabled ? 'Disable' : 'Enable', callback_data: `ct_toggle_${walletAddress}` }],
            [{ text: 'Settings', callback_data: `ct_settings_${walletAddress}` }],
            [{ text: 'Rename', callback_data: `ct_rename_${walletAddress}` }],
            [{ text: 'Delete', callback_data: `ct_delete_${walletAddress}` }],
            [{ text: 'Back', callback_data: 'menu_copytrade' }]
          ]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade - settings menu
      if (callbackData.startsWith('ct_settings_')) {
        const walletAddress = callbackData.replace('ct_settings_', '')
        await answerCallbackQuery(callbackQuery.id)
        const sub = await getSubscription(chatId, walletAddress)
        
        const modeText = sub?.copy_mode === 'fixed' ? 'Fixed Amount' : 'Percentage'
        const valueText = sub?.copy_mode === 'fixed' ? `$${sub?.copy_value || 5}` : `${sub?.copy_value || 10}%`
        
        await sendTelegramPhoto(chatId, COPYTRADE_IMAGE_URL, [
          `<b>Copy Trade Settings</b>`,
          ``,
          `Wallet: <code>${formatWalletAddress(walletAddress)}</code>`,
          ``,
          `<b>Current Settings:</b>`,
          `Copy Mode: ${modeText}`,
          `Copy Size: ${valueText}`,
          `Max per trade: $${sub?.max_per_trade || 50}`,
          `Min trade size: $${sub?.min_trade_size || 1}`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [
            [{ text: `Mode: ${modeText}`, callback_data: `ct_mode_${walletAddress}` }],
            [{ text: `Copy Size: ${valueText}`, callback_data: `ct_value_${walletAddress}` }],
            [{ text: `Max: $${sub?.max_per_trade || 50}`, callback_data: `ct_max_${walletAddress}` }],
            [{ text: `Min: $${sub?.min_trade_size || 1}`, callback_data: `ct_min_${walletAddress}` }],
            [{ text: 'AI Mode', callback_data: `ct_aimode_${walletAddress}` }],
            [{ text: 'Back', callback_data: `ct_view_${walletAddress}` }]
          ]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade - AI Mode (coming soon)
      if (callbackData.startsWith('ct_aimode_')) {
        const walletAddress = callbackData.replace('ct_aimode_', '')
        await answerCallbackQuery(callbackQuery.id)
        await sendTelegramPhoto(chatId, COPYTRADE_IMAGE_URL, [
          `<b>AI Mode</b>`,
          ``,
          `<i>Coming soon!</i>`,
          ``,
          `AI will analyze trades and automatically`,
          `decide which ones to copy based on:`,
          ``,
          `- Market conditions`,
          `- Trader's historical performance`,
          `- Risk assessment`,
          `- Portfolio diversification`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [[{ text: 'Back to Settings', callback_data: `ct_settings_${walletAddress}` }]]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade - change mode
      if (callbackData.startsWith('ct_mode_')) {
        const walletAddress = callbackData.replace('ct_mode_', '')
        const sub = await getSubscription(chatId, walletAddress)
        const newMode = sub?.copy_mode === 'fixed' ? 'percentage' : 'fixed'
        await updateCopytradeSettings(chatId, walletAddress, { copy_mode: newMode })
        await answerCallbackQuery(callbackQuery.id, `Mode: ${newMode === 'fixed' ? 'Fixed Amount' : 'Percentage'}`)
        // Refresh settings
        const newSub = await getSubscription(chatId, walletAddress)
        const modeText = newSub?.copy_mode === 'fixed' ? 'Fixed Amount' : 'Percentage'
        const valueText = newSub?.copy_mode === 'fixed' ? `$${newSub?.copy_value || 5}` : `${newSub?.copy_value || 10}%`
        
        await sendTelegramPhoto(chatId, COPYTRADE_IMAGE_URL, [
          `<b>Copy Trade Settings</b>`,
          ``,
          `Wallet: <code>${formatWalletAddress(walletAddress)}</code>`,
          ``,
          `<b>Current Settings:</b>`,
          `Copy Mode: ${modeText}`,
          `Copy Size: ${valueText}`,
          `Max per trade: $${newSub?.max_per_trade || 50}`,
          `Min trade size: $${newSub?.min_trade_size || 1}`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [
            [{ text: `Mode: ${modeText}`, callback_data: `ct_mode_${walletAddress}` }],
            [{ text: `Copy Size: ${valueText}`, callback_data: `ct_value_${walletAddress}` }],
            [{ text: `Max: $${newSub?.max_per_trade || 50}`, callback_data: `ct_max_${walletAddress}` }],
            [{ text: `Min: $${newSub?.min_trade_size || 1}`, callback_data: `ct_min_${walletAddress}` }],
            [{ text: 'AI Mode', callback_data: `ct_aimode_${walletAddress}` }],
            [{ text: 'Back', callback_data: `ct_view_${walletAddress}` }]
          ]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade - set copy value
      if (callbackData.startsWith('ct_value_')) {
        const walletAddress = callbackData.replace('ct_value_', '')
        await answerCallbackQuery(callbackQuery.id)
        const sub = await getSubscription(chatId, walletAddress)
        userStates.set(chatId, { action: 'ct_set_value', data: { walletAddress } })
        
        const hint = sub?.copy_mode === 'fixed' ? 'Enter amount in $ (e.g., 10):' : 'Enter percentage (e.g., 15):'
        await sendTelegramMessage(chatId, [
          `<b>Set Copy Size</b>`,
          ``,
          `Mode: ${sub?.copy_mode === 'fixed' ? 'Fixed Amount' : 'Percentage'}`,
          `Current: ${sub?.copy_mode === 'fixed' ? `$${sub?.copy_value}` : `${sub?.copy_value}%`}`,
          ``,
          hint,
        ].join('\n'), 'HTML', {
          inline_keyboard: [[{ text: 'Cancel', callback_data: `ct_settings_${walletAddress}` }]]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade - set max per trade
      if (callbackData.startsWith('ct_max_')) {
        const walletAddress = callbackData.replace('ct_max_', '')
        await answerCallbackQuery(callbackQuery.id)
        userStates.set(chatId, { action: 'ct_set_max', data: { walletAddress } })
        
        await sendTelegramMessage(chatId, [
          `<b>Set Max Per Trade</b>`,
          ``,
          `Enter maximum amount per single trade in $ (e.g., 100):`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [[{ text: 'Cancel', callback_data: `ct_settings_${walletAddress}` }]]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade - set min trade size
      if (callbackData.startsWith('ct_min_')) {
        const walletAddress = callbackData.replace('ct_min_', '')
        await answerCallbackQuery(callbackQuery.id)
        userStates.set(chatId, { action: 'ct_set_min', data: { walletAddress } })
        
        await sendTelegramMessage(chatId, [
          `<b>Set Min Trade Size</b>`,
          ``,
          `Enter minimum trade size to copy in $ (e.g., 5):`,
          `Trades smaller than this will be ignored.`,
        ].join('\n'), 'HTML', {
          inline_keyboard: [[{ text: 'Cancel', callback_data: `ct_settings_${walletAddress}` }]]
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
      
      // Copy Trade - add address
      if (userState.action === 'copytrade_add') {
        if (!text.startsWith('0x') || text.length !== 42) {
          await sendTelegramMessage(chatId, 'Invalid address. Please enter a valid Ethereum address (0x...)', 'HTML', {
            inline_keyboard: [[{ text: 'Cancel', callback_data: 'menu_copytrade' }]]
          })
          return NextResponse.json({ ok: true })
        }
        
        userStates.delete(chatId)
        const { error } = await addCopytradeSubscription(chatId, text)
        
        if (error) {
          await sendTelegramMessage(chatId, 'This address is already in your subscriptions.', 'HTML', {
            inline_keyboard: [[{ text: 'Back to Copy Trading', callback_data: 'menu_copytrade' }]]
          })
        } else {
          await sendTelegramMessage(chatId, [
            `<b>Address Added</b>`,
            ``,
            `<code>${text}</code>`,
            ``,
            `You will now copy trades from this wallet.`,
          ].join('\n'), 'HTML', {
            inline_keyboard: [[{ text: 'Back to Copy Trading', callback_data: 'menu_copytrade' }]]
          })
        }
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
      
      // Copy Trade - set copy value
      if (userState.action === 'ct_set_value') {
        const walletAddress = userState.data?.walletAddress as string
        const value = parseFloat(text)
        if (isNaN(value) || value <= 0) {
          await sendTelegramMessage(chatId, 'Invalid value. Please enter a positive number.', 'HTML', {
            inline_keyboard: [[{ text: 'Cancel', callback_data: `ct_settings_${walletAddress}` }]]
          })
          return NextResponse.json({ ok: true })
        }
        userStates.delete(chatId)
        await updateCopytradeSettings(chatId, walletAddress, { copy_value: value })
        await sendTelegramMessage(chatId, `Copy size updated to ${value}`, 'HTML', {
          inline_keyboard: [[{ text: 'Back to Settings', callback_data: `ct_settings_${walletAddress}` }]]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade - set max per trade
      if (userState.action === 'ct_set_max') {
        const walletAddress = userState.data?.walletAddress as string
        const value = parseFloat(text)
        if (isNaN(value) || value <= 0) {
          await sendTelegramMessage(chatId, 'Invalid value. Please enter a positive number.', 'HTML', {
            inline_keyboard: [[{ text: 'Cancel', callback_data: `ct_settings_${walletAddress}` }]]
          })
          return NextResponse.json({ ok: true })
        }
        userStates.delete(chatId)
        await updateCopytradeSettings(chatId, walletAddress, { max_per_trade: value })
        await sendTelegramMessage(chatId, `Max per trade updated to $${value}`, 'HTML', {
          inline_keyboard: [[{ text: 'Back to Settings', callback_data: `ct_settings_${walletAddress}` }]]
        })
        return NextResponse.json({ ok: true })
      }
      
      // Copy Trade - set min trade size
      if (userState.action === 'ct_set_min') {
        const walletAddress = userState.data?.walletAddress as string
        const value = parseFloat(text)
        if (isNaN(value) || value < 0) {
          await sendTelegramMessage(chatId, 'Invalid value. Please enter a non-negative number.', 'HTML', {
            inline_keyboard: [[{ text: 'Cancel', callback_data: `ct_settings_${walletAddress}` }]]
          })
          return NextResponse.json({ ok: true })
        }
        userStates.delete(chatId)
        await updateCopytradeSettings(chatId, walletAddress, { min_trade_size: value })
        await sendTelegramMessage(chatId, `Min trade size updated to $${value}`, 'HTML', {
          inline_keyboard: [[{ text: 'Back to Settings', callback_data: `ct_settings_${walletAddress}` }]]
        })
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
