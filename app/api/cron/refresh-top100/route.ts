import { NextResponse } from 'next/server'

export const maxDuration = 60

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Call the top100 API with refresh=true to trigger a full fetch and cache update
    const appUrl = process.env.APP_URL || 'https://app.vantake.trade'
    const res = await fetch(`${appUrl}/api/polymarket/top100?refresh=true`, {
      headers: cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {},
    })

    if (!res.ok) {
      console.error('[refresh-top100] Failed:', res.status)
      return NextResponse.json({ error: 'Refresh failed' }, { status: 500 })
    }

    const data = await res.json()
    console.log(`[refresh-top100] Cache updated with ${Array.isArray(data) ? data.length : 0} traders`)

    return NextResponse.json({
      success: true,
      tradersCount: Array.isArray(data) ? data.length : 0,
    })
  } catch (error) {
    console.error('[refresh-top100] Error:', error)
    return NextResponse.json({ error: 'Refresh failed' }, { status: 500 })
  }
}
