import { NextRequest, NextResponse } from 'next/server'
import { setTelegramWebhook, deleteTelegramWebhook } from '@/lib/telegram'

// Call this once after deploy to register the webhook with Telegram
// GET /api/telegram/setup?action=set&url=https://your-domain.com/api/telegram/webhook
// GET /api/telegram/setup?action=delete
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'set'

  // Simple auth -- only allow if the secret matches
  const secret = searchParams.get('secret')
  if (secret !== process.env.TELEGRAM_BOT_TOKEN?.slice(0, 10)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (action === 'delete') {
    const result = await deleteTelegramWebhook()
    return NextResponse.json(result)
  }

  const url = searchParams.get('url')
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  const result = await setTelegramWebhook(url)
  return NextResponse.json(result)
}
