const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is not set')
  process.exit(1)
}

async function checkWebhook() {
  const infoRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`)
  const info = await infoRes.json()
  console.log('Current webhook info:')
  console.log(JSON.stringify(info, null, 2))
  
  if (info.result?.last_error_message) {
    console.log('\n--- PROBLEM DETECTED ---')
    console.log('Last error:', info.result.last_error_message)
    console.log('Last error date:', new Date(info.result.last_error_date * 1000).toISOString())
  }
  
  if (info.result?.url) {
    console.log('\nWebhook URL:', info.result.url)
    
    // Try to hit the webhook URL ourselves
    try {
      const testRes = await fetch(info.result.url, { method: 'GET' })
      console.log('GET test status:', testRes.status, testRes.statusText)
      const body = await testRes.text()
      console.log('GET test body:', body.substring(0, 200))
    } catch (e) {
      console.log('GET test FAILED:', e.message)
    }
  }
}

checkWebhook()
