import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { VANTAKE_TOP_100_WALLETS } from '@/lib/top100-wallets'

const DATA_API = 'https://data-api.polymarket.com'

// Fetch leaderboard data and filter to our wallets
async function fetchFreshTop100() {
  // Fetch large leaderboard to find our wallets
  const urls = [
    `${DATA_API}/v1/leaderboard?timePeriod=ALL&sortBy=PNL&limit=500&offset=0`,
    `${DATA_API}/v1/leaderboard?timePeriod=ALL&sortBy=PNL&limit=500&offset=500`,
    `${DATA_API}/v1/leaderboard?timePeriod=ALL&sortBy=VOL&limit=500&offset=0`,
    `${DATA_API}/v1/leaderboard?timePeriod=ALL&sortBy=VOL&limit=500&offset=500`,
  ]
  
  const results = await Promise.all(urls.map(async (url) => {
    try {
      const res = await fetch(url, { next: { revalidate: 300 } })
      if (!res.ok) return []
      return await res.json()
    } catch {
      return []
    }
  }))
  
  // Build map of all traders by wallet address
  const traderMap = new Map<string, Record<string, unknown>>()
  for (const page of results) {
    if (!Array.isArray(page)) continue
    for (const entry of page) {
      const wallet = String(entry.proxyWallet || '').toLowerCase()
      if (wallet && !traderMap.has(wallet)) {
        traderMap.set(wallet, entry)
      }
    }
  }
  
  // Build traders array in ORIGINAL order from VANTAKE_TOP_100_WALLETS
  const traders = VANTAKE_TOP_100_WALLETS
    .map((wallet, index) => {
      const t = traderMap.get(wallet.toLowerCase())
      if (!t) {
        // Return placeholder for wallets not found in leaderboard
        return {
          rank: String(index + 1),
          proxyWallet: wallet,
          userName: '',
          vol: 0,
          pnl: 0,
          profileImage: '',
          xUsername: '',
          verifiedBadge: false,
          numTrades: 0,
          marketsTraded: 0,
        }
      }
      return {
        rank: String(index + 1),
        proxyWallet: String(t.proxyWallet || wallet),
        userName: String(t.userName || ''),
        vol: Number(t.vol || 0),
        pnl: Number(t.pnl || 0),
        profileImage: String(t.profileImage || ''),
        xUsername: String(t.xUsername || ''),
        verifiedBadge: Boolean(t.verifiedBadge || false),
        numTrades: Number(t.numTrades || 0),
        marketsTraded: Number(t.marketsTraded || 0),
      }
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
