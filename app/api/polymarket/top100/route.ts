import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DATA_API = 'https://data-api.polymarket.com'

async function tryFetch(url: string) {
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

// Fetch fresh top 100 from Polymarket leaderboard API
async function fetchFreshTop100() {
  // Fetch 2 pages of 50 by PNL + 2 pages by VOL, merge & dedupe
  const [pnl1, pnl2, vol1, vol2] = await Promise.all([
    tryFetch(`${DATA_API}/v1/leaderboard?timePeriod=ALL&sortBy=PNL&limit=50&offset=0`),
    tryFetch(`${DATA_API}/v1/leaderboard?timePeriod=ALL&sortBy=PNL&limit=50&offset=50`),
    tryFetch(`${DATA_API}/v1/leaderboard?timePeriod=ALL&sortBy=VOL&limit=50&offset=0`),
    tryFetch(`${DATA_API}/v1/leaderboard?timePeriod=ALL&sortBy=VOL&limit=50&offset=50`),
  ])

  const walletMap = new Map<string, Record<string, unknown>>()
  for (const page of [pnl1, pnl2, vol1, vol2]) {
    if (!Array.isArray(page)) continue
    for (const entry of page) {
      const wallet = String(entry.proxyWallet || '').toLowerCase()
      if (wallet && !walletMap.has(wallet)) {
        walletMap.set(wallet, entry)
      }
    }
  }

  const traders = Array.from(walletMap.values())
    .map((t) => ({
      rank: '0',
      proxyWallet: String(t.proxyWallet || ''),
      userName: String(t.userName || ''),
      vol: Number(t.vol || 0),
      pnl: Number(t.pnl || 0),
      profileImage: String(t.profileImage || ''),
      xUsername: String(t.xUsername || ''),
      verifiedBadge: Boolean(t.verifiedBadge || false),
      numTrades: Number(t.numTrades || 0),
      marketsTraded: Number(t.marketsTraded || 0),
    }))
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 100)

  traders.forEach((t, i) => {
    t.rank = String(i + 1)
  })

  return traders
}

// GET: Serve from cache instantly, fallback to live fetch
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const refresh = searchParams.get('refresh')
    const supabase = createAdminClient()

    // Cron refresh: fetch fresh data and update cache
    if (refresh === 'true') {
      const authHeader = req.headers.get('authorization')
      const cronSecret = process.env.CRON_SECRET
      if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const traders = await fetchFreshTop100()
      if (traders.length > 0) {
        await supabase
          .from('top100_cache')
          .update({ data: traders, updated_at: new Date().toISOString() })
          .eq('id', 1)
      }

      return NextResponse.json(traders, {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
      })
    }

    // Serve from cache (instant)
    const { data: cache } = await supabase
      .from('top100_cache')
      .select('data, updated_at')
      .eq('id', 1)
      .single()

    if (cache && Array.isArray(cache.data) && cache.data.length > 0) {
      return NextResponse.json(cache.data, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
      })
    }

    // Cache empty -- live fetch and populate
    const traders = await fetchFreshTop100()
    if (traders.length > 0) {
      await supabase
        .from('top100_cache')
        .update({ data: traders, updated_at: new Date().toISOString() })
        .eq('id', 1)
    }

    return NextResponse.json(traders, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    })
  } catch (error) {
    console.error('Top 100 API error:', error)
    return NextResponse.json({ error: 'Failed to fetch top 100' }, { status: 500 })
  }
}
