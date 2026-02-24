import { NextRequest, NextResponse } from 'next/server'
import { setTelegramWebhook, deleteTelegramWebhook } from '@/lib/telegram'

// Call this once after deploy to register the webhook with Telegram
// GET /api/telegram/setup?action=set&url=https://your-domain.com/api/telegram/webhook
// GET /api/telegram/setup?action=delete
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'set'

  // No auth needed -- this is a one-time setup call after deploy

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
