import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { VANTAKE_TOP_100_WALLETS } from '@/lib/top100-wallets'

const DATA_API = 'https://data-api.polymarket.com'

// Fetch profile data for a single wallet
async function fetchWalletProfile(wallet: string) {
  try {
    const res = await fetch(`${DATA_API}/v1/profile/${wallet}`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// Fetch fresh data for Vantake Top 100 wallets - preserving original order
async function fetchFreshTop100() {
  // Fetch all wallet profiles in parallel (batched to avoid rate limits)
  const batchSize = 20
  const profileMap = new Map<string, Record<string, unknown>>()
  
  for (let i = 0; i < VANTAKE_TOP_100_WALLETS.length; i += batchSize) {
    const batch = VANTAKE_TOP_100_WALLETS.slice(i, i + batchSize)
    const results = await Promise.all(batch.map(fetchWalletProfile))
    
    // Map results back to wallets to preserve order
    batch.forEach((wallet, idx) => {
      if (results[idx]) {
        profileMap.set(wallet.toLowerCase(), results[idx] as Record<string, unknown>)
      }
    })
  }

  // Build traders array in ORIGINAL order from VANTAKE_TOP_100_WALLETS
  const traders = VANTAKE_TOP_100_WALLETS
    .map((wallet, index) => {
      const t = profileMap.get(wallet.toLowerCase())
      if (!t) {
        // Return placeholder for wallets without profile data
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
