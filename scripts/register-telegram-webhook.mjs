// Register Telegram webhook directly via Bot API
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is not set')
  process.exit(1)
}

const WEBHOOK_URL = 'https://app.vantake.trade/api/telegram/webhook'

async function registerWebhook() {
  console.log(`Setting webhook to: ${WEBHOOK_URL}`)
  
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: WEBHOOK_URL,
      allowed_updates: ['message'],
      drop_pending_updates: true,
    }),
  })
  
  const data = await res.json()
  console.log('Response:', JSON.stringify(data, null, 2))
  
  // Also get webhook info
  const infoRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`)
  const info = await infoRes.json()
  console.log('Webhook info:', JSON.stringify(info, null, 2))
}

registerWebhook()
