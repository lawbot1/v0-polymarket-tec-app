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

// Send a photo with caption to a specific chat
export async function sendTelegramPhoto(
  chatId: string,
  photoUrl: string,
  caption?: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML'
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
  const name = trade.traderName || `${trade.walletAddress.slice(0, 6)}...${trade.walletAddress.slice(-4)}`
  const value = (trade.size * trade.price).toFixed(2)
  const pricePercent = (trade.price * 100).toFixed(0)
  
  // Emojis based on action and outcome
  const isBuy = trade.side?.toUpperCase() === 'BUY'
  const outcomeLower = trade.outcome?.toLowerCase() || ''
  
  // Header emoji: chart up for buy, chart down for sell
  const actionEmoji = isBuy ? '📈' : '📉'
  
  // Outcome emoji logic:
  // - YES/UP = green checkmark
  // - NO/DOWN = red cross
  // - Other specific outcomes (teams, names, etc.) = target/bullseye
  const getOutcomeEmoji = () => {
    if (outcomeLower === 'yes' || outcomeLower === 'up') return '✅'
    if (outcomeLower === 'no' || outcomeLower === 'down') return '❌'
    return '🎯' // For specific outcomes like team names, candidates, etc.
  }
  const outcomeEmoji = getOutcomeEmoji()
  // Money emoji based on value
  const valueEmoji = parseFloat(value) >= 1000 ? '💰' : parseFloat(value) >= 100 ? '💵' : '💲'
  
  // Format value with K suffix for large amounts
  const formattedValue = parseFloat(value) >= 1000 
    ? `$${(parseFloat(value) / 1000).toFixed(1)}K` 
    : `$${value}`

  // Build market link
  const marketLink = trade.slug 
    ? `<a href="https://polymarket.com/event/${trade.slug}">${trade.market}</a>`
    : trade.market

  const lines = [
    `${actionEmoji} <b>${isBuy ? 'BUY' : 'SELL'}</b> ${outcomeEmoji} <b>${trade.outcome?.toUpperCase()}</b>`,
    ``,
    `👤 <b>${name}</b>`,
    ``,
    `📊 ${marketLink}`,
    ``,
    `┌─────────────────────`,
    `│ ${valueEmoji} Value: <b>${formattedValue}</b>`,
    `│ 📍 Price: <b>${pricePercent}¢</b>`,
    `│ 📦 Size: <b>${trade.size.toLocaleString()}</b> shares`,
    `└─────────────────────`,
    ``,
    `<i>Vantake • Real-time alerts</i>`,
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
