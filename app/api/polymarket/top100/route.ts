import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { VANTAKE_TOP_100_WALLETS } from '@/lib/top100-wallets'

const DATA_API = 'https://data-api.polymarket.com'
const GAMMA_API = 'https://gamma-api.polymarket.com'

// Fetch individual wallet profile from Polymarket
async function fetchWalletData(wallet: string): Promise<Record<string, unknown> | null> {
  try {
    // Try Gamma API for user profile (more comprehensive)
    const res = await fetch(`${GAMMA_API}/users?proxyWallet=${wallet}`, {
      headers: { 'Accept': 'application/json' },
    })
    if (res.ok) {
      const data = await res.json()
      console.log(`[v0] Gamma API response for ${wallet.slice(0,8)}:`, JSON.stringify(data).slice(0, 200))
      if (Array.isArray(data) && data.length > 0) {
        return data[0]
      }
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        return data
      }
    }
  } catch (e) {
    console.log(`[v0] Gamma API error for ${wallet.slice(0,8)}:`, e)
  }
  
  try {
    // Fallback to data-api leaderboard search
    const res = await fetch(`${DATA_API}/leaderboard?wallet=${wallet}`, {
      headers: { 'Accept': 'application/json' },
    })
    if (res.ok) {
      const data = await res.json()
      if (data) return data
    }
  } catch {}
  
  return null
}

// Fetch fresh data for Vantake Top 100 wallets
async function fetchFreshTop100() {
  // Fetch all wallet profiles in parallel batches
  const batchSize = 10
  const allProfiles = new Map<string, Record<string, unknown>>()
  
  for (let i = 0; i < VANTAKE_TOP_100_WALLETS.length; i += batchSize) {
    const batch = VANTAKE_TOP_100_WALLETS.slice(i, i + batchSize)
    const results = await Promise.all(batch.map(fetchWalletData))
    
    batch.forEach((wallet, idx) => {
      if (results[idx]) {
        allProfiles.set(wallet.toLowerCase(), results[idx]!)
      }
    })
  }
  
  // Also fetch from leaderboard to supplement data
  const leaderboardUrls = [
    `${DATA_API}/v1/leaderboard?timePeriod=ALL&sortBy=PNL&limit=500&offset=0`,
    `${DATA_API}/v1/leaderboard?timePeriod=ALL&sortBy=PNL&limit=500&offset=500`,
    `${DATA_API}/v1/leaderboard?timePeriod=ALL&sortBy=PNL&limit=500&offset=1000`,
    `${DATA_API}/v1/leaderboard?timePeriod=ALL&sortBy=VOL&limit=500&offset=0`,
  ]
  
  const leaderboardResults = await Promise.all(leaderboardUrls.map(async (url) => {
    try {
      const res = await fetch(url)
      if (!res.ok) return []
      return await res.json()
    } catch {
      return []
    }
  }))
  
  // Merge leaderboard data with profiles
  for (const page of leaderboardResults) {
    if (!Array.isArray(page)) continue
    for (const entry of page) {
      const wallet = String(entry.proxyWallet || '').toLowerCase()
      if (wallet && VANTAKE_TOP_100_WALLETS.some(w => w.toLowerCase() === wallet)) {
        // Merge with existing or add new
        const existing = allProfiles.get(wallet) || {}
        allProfiles.set(wallet, { ...existing, ...entry })
      }
    }
  }
  
  // Build traders array in ORIGINAL order from VANTAKE_TOP_100_WALLETS
  const traders = VANTAKE_TOP_100_WALLETS
    .map((wallet, index) => {
      const t = allProfiles.get(wallet.toLowerCase())
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
        proxyWallet: String(t.proxyWallet || wallet),
        userName: String(t.userName || t.username || t.name || ''),
        vol: Number(t.vol || t.volume || 0),
        pnl: Number(t.pnl || t.profit || 0),
        profileImage: String(t.profileImage || t.image || t.avatar || ''),
        xUsername: String(t.xUsername || t.twitterHandle || t.twitter || ''),
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
