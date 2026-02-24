const TELEGRAM_API = 'https://api.telegram.org/bot'

function getToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('Missing TELEGRAM_BOT_TOKEN')
  return token
}

// Send a message to a specific chat
export async function sendTelegramMessage(chatId: string, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML') {
  const token = getToken()
  const res = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('[Telegram] sendMessage failed:', err)
    return false
  }
  return true
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
}) {
  const name = trade.traderName || `${trade.walletAddress.slice(0, 6)}...${trade.walletAddress.slice(-4)}`
  const value = (trade.size * trade.price).toFixed(2)
  const outcomeColor = trade.outcome?.toLowerCase() === 'yes' ? '🟢' : trade.outcome?.toLowerCase() === 'no' ? '🔴' : '🟡'

  return [
    `<b>🔔 New Trade Alert</b>`,
    ``,
    `<b>Trader:</b> ${name}`,
    `<b>Market:</b> ${trade.market}`,
    `<b>Side:</b> ${trade.side} ${outcomeColor} <b>${trade.outcome}</b>`,
    `<b>Value:</b> $${value}`,
    `<b>Price:</b> ${(trade.price * 100).toFixed(1)}¢`,
    ``,
    `<i>via Vantake</i>`,
  ].join('\n')
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
