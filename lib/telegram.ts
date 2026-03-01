const TELEGRAM_API = 'https://api.telegram.org/bot'

function getToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('Missing TELEGRAM_BOT_TOKEN')
  return token
}

// Inline keyboard button types
type InlineKeyboardButton = {
  text: string
  url?: string
  callback_data?: string
}

type InlineKeyboardMarkup = {
  inline_keyboard: InlineKeyboardButton[][]
}

// Send a message to a specific chat with optional inline keyboard
export async function sendTelegramMessage(
  chatId: string, 
  text: string, 
  parseMode: 'HTML' | 'Markdown' = 'HTML',
  replyMarkup?: InlineKeyboardMarkup
) {
  const token = getToken()
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: parseMode,
    disable_web_page_preview: true,
  }
  
  if (replyMarkup) {
    body.reply_markup = replyMarkup
  }
  
  const res = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('[Telegram] sendMessage failed:', err)
    return false
  }
  return true
}

// Create inline keyboard for trade notifications
export function createTradeInlineKeyboard(slug?: string): InlineKeyboardMarkup | undefined {
  if (!slug) return undefined
  
  return {
    inline_keyboard: [
      [
        { text: '📊 Copytrade', url: `https://polymarket.com/event/${slug}` },
        { text: '🤖 Copytrade AI (Soon)', callback_data: 'copytrade_ai_soon' },
      ]
    ]
  }
}

// Send a photo with caption and optional inline keyboard
export async function sendTelegramPhoto(
  chatId: string,
  photoUrl: string,
  caption?: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML',
  replyMarkup?: InlineKeyboardMarkup
) {
  const token = getToken()
  const body: Record<string, unknown> = {
    chat_id: chatId,
    photo: photoUrl,
  }
  
  if (caption) {
    body.caption = caption
    body.parse_mode = parseMode
  }
  
  if (replyMarkup) {
    body.reply_markup = replyMarkup
  }
  
  const res = await fetch(`${TELEGRAM_API}${token}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('[Telegram] sendPhoto failed:', err)
    return false
  }
  return true
}

// Answer callback query (for inline button clicks)
export async function answerCallbackQuery(callbackQueryId: string, text?: string, showAlert = false) {
  const token = getToken()
  const res = await fetch(`${TELEGRAM_API}${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert,
    }),
  })
  return res.ok
}

// Set webhook URL for the bot
export async function setTelegramWebhook(webhookUrl: string) {
  const token = getToken()
  const res = await fetch(`${TELEGRAM_API}${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl }),
  })
  return res.json()
}

// Delete webhook
export async function deleteTelegramWebhook() {
  const token = getToken()
  const res = await fetch(`${TELEGRAM_API}${token}/deleteWebhook`, {
    method: 'POST',
  })
  return res.json()
}

// Format a trade notification message
export function formatTradeNotification(trade: {
  traderName?: string
  walletAddress: string
  market: string
  outcome: string
  side: string
  size: number
  price: number
  slug?: string
}) {
  const displayName = trade.traderName || `${trade.walletAddress.slice(0, 6)}...${trade.walletAddress.slice(-4)}`
  const value = (trade.size * trade.price).toFixed(2)
  const pricePercent = (trade.price * 100).toFixed(0)
  
  const isBuy = trade.side?.toUpperCase() === 'BUY'
  
  // Format value with K suffix for large amounts
  const formattedValue = parseFloat(value) >= 1000 
    ? `$${(parseFloat(value) / 1000).toFixed(1)}K` 
    : `$${value}`

  // Build market link
  const marketLink = trade.slug 
    ? `<a href="https://polymarket.com/event/${trade.slug}">${trade.market}</a>`
    : trade.market

  const lines = [
    `<b>${isBuy ? 'BUY' : 'SELL'}</b> — "${trade.outcome}"`,
    ``,
    `Smart Wallet: <b>${displayName}</b> (<code>${trade.walletAddress}</code>)`,
    `Market: "${marketLink}"`,
    ``,
    `• Capital Deployed: <b>${formattedValue}</b>`,
    `• Entry: <b>${pricePercent}c</b>`,
    `• Size: <b>${trade.size.toLocaleString()}</b> shares`,
    ``,
    `<i>Vantake — Real-time Capital Intelligence</i>`,
  ]

  return lines.join('\n')
}

// Generate a random 8-character linking code
export function generateLinkingCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // No ambiguous chars (0/O, 1/I/L)
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Main menu inline keyboard
export function getMainMenuKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '👛 Wallet', callback_data: 'menu_wallet' },
        { text: '👤 Profile', callback_data: 'menu_profile' },
      ],
      [
        { text: '📈 Positions', callback_data: 'menu_positions' },
        { text: '🤖 Copy Trade', callback_data: 'menu_copytrade' },
      ],
      [
        { text: '🎁 Referral', callback_data: 'menu_referral' },
      ],
    ]
  }
}

// Wallet menu keyboard - backTo parameter for navigation history
export function getWalletMenuKeyboard(hasWallet: boolean, backTo: string = 'menu_main'): InlineKeyboardMarkup {
  if (!hasWallet) {
    return {
      inline_keyboard: [
        [
          { text: '+ Create a wallet', callback_data: 'wallet_create' },
        ],
        [
          { text: 'Import', callback_data: 'wallet_import' },
        ],
        [
          { text: 'Back', callback_data: backTo },
        ],
      ]
    }
  }
  
  return {
    inline_keyboard: [
      [
        { text: '💸 Withdraw', callback_data: 'wallet_withdraw' },
        { text: '➕ Deposit', callback_data: 'wallet_deposit' },
      ],
      [
        { text: '📤 Export', callback_data: 'wallet_export' },
        { text: '🔄 Refresh', callback_data: 'wallet_refresh' },
      ],
      [
        { text: '⬅️ Back', callback_data: 'menu_main' },
      ],
    ]
  }
}

// Edit message text with new text and keyboard
export async function editTelegramMessage(
  chatId: string,
  messageId: number,
  text: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML',
  replyMarkup?: InlineKeyboardMarkup
) {
  const token = getToken()
  const body: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: parseMode,
    disable_web_page_preview: true,
  }
  
  if (replyMarkup) {
    body.reply_markup = replyMarkup
  }
  
  const res = await fetch(`${TELEGRAM_API}${token}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.ok
}

// Edit message caption (for photo messages) with new text and keyboard
export async function editMessageCaption(
  chatId: string,
  messageId: number,
  caption: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML',
  replyMarkup?: InlineKeyboardMarkup
) {
  const token = getToken()
  const body: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    caption,
    parse_mode: parseMode,
  }
  
  if (replyMarkup) {
    body.reply_markup = replyMarkup
  }
  
  const res = await fetch(`${TELEGRAM_API}${token}/editMessageCaption`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.ok
}

// Smart edit - tries editMessageText first, falls back to editMessageCaption for photo messages
export async function smartEditMessage(
  chatId: string,
  messageId: number,
  text: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML',
  replyMarkup?: InlineKeyboardMarkup
) {
  // Try editing as text first
  const textSuccess = await editTelegramMessage(chatId, messageId, text, parseMode, replyMarkup)
  if (textSuccess) return true
  
  // If failed, try editing as caption (for photo messages)
  const captionSuccess = await editMessageCaption(chatId, messageId, text, parseMode, replyMarkup)
  return captionSuccess
}
