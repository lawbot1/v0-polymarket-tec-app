import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { VANTAKE_TOP_100_WALLETS } from '@/lib/top100-wallets'

const DATA_API = 'https://data-api.polymarket.com'

// Fetch fresh data for Vantake Top 100 wallets from leaderboard
async function fetchFreshTop100() {
  // Polymarket API uses /v1/leaderboard with max limit=50
  // Need to paginate extensively to find all our wallets
  const urls: string[] = []
  
  // Fetch by PNL and VOL with ALL time period (max coverage)
  for (let offset = 0; offset <= 5000; offset += 50) {
    urls.push(`${DATA_API}/v1/leaderboard?timePeriod=ALL&orderBy=PNL&limit=50&offset=${offset}`)
  }
  for (let offset = 0; offset <= 5000; offset += 50) {
    urls.push(`${DATA_API}/v1/leaderboard?timePeriod=ALL&orderBy=VOL&limit=50&offset=${offset}`)
  }
  
  // Fetch in batches to avoid rate limits
  const batchSize = 20
  const allResults: Record<string, unknown>[][] = []
  
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(async (url) => {
      try {
        const res = await fetch(url, { 
          headers: { 'Accept': 'application/json' },
        })
        if (!res.ok) return []
        const data = await res.json()
        return Array.isArray(data) ? data : []
      } catch {
        return []
      }
    }))
    allResults.push(...batchResults)
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < urls.length) {
      await new Promise(r => setTimeout(r, 100))
    }
  }
  
  // Build map of all traders by wallet address (lowercase for matching)
  // Check both 'address' and 'proxyWallet' fields
  const traderMap = new Map<string, Record<string, unknown>>()
  for (const page of allResults) {
    for (const entry of page) {
      // API can return 'address' or 'proxyWallet'
      const wallet = String(entry.address || entry.proxyWallet || '').toLowerCase()
      if (wallet && !traderMap.has(wallet)) {
        traderMap.set(wallet, entry)
      }
    }
  }
  
  console.log(`[v0] Loaded ${traderMap.size} traders from leaderboard`)
  
  // Count how many of our wallets were found
  const foundCount = VANTAKE_TOP_100_WALLETS.filter(w => traderMap.has(w.toLowerCase())).length
  console.log(`[v0] Found ${foundCount}/${VANTAKE_TOP_100_WALLETS.length} Vantake wallets in leaderboard`)
  
  // Build traders array in ORIGINAL order from VANTAKE_TOP_100_WALLETS
  const traders = VANTAKE_TOP_100_WALLETS
    .map((wallet, index) => {
      const t = traderMap.get(wallet.toLowerCase())
      if (!t) {
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
        proxyWallet: String(t.address || t.proxyWallet || wallet),
        userName: String(t.userName || t.username || ''),
        vol: Number(t.vol || t.volume || 0),
        pnl: Number(t.pnl || 0),
        profileImage: String(t.profileImage || t.pfp || ''),
        xUsername: String(t.xUsername || t.twitterUsername || ''),
        verifiedBadge: Boolean(t.verifiedBadge || false),
        numTrades: Number(t.numTrades || t.tradesCount || 0),
        marketsTraded: Number(t.marketsTraded || t.markets || 0),
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
