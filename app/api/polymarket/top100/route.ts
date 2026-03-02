import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { VANTAKE_TOP_100_WALLETS } from '@/lib/top100-wallets'
import { getProfile } from '@/lib/polymarket-api'

// Fetch fresh data for Vantake Top 100 wallets using profile API (same as trader page)
async function fetchFreshTop100() {
  // Fetch all profiles in parallel batches using the working getProfile function
  const batchSize = 10
  const allProfiles: (Record<string, unknown> | null)[] = []
  
  for (let i = 0; i < VANTAKE_TOP_100_WALLETS.length; i += batchSize) {
    const batch = VANTAKE_TOP_100_WALLETS.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map(wallet => getProfile(wallet).catch(() => null))
    )
    allProfiles.push(...results)
    
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < VANTAKE_TOP_100_WALLETS.length) {
      await new Promise(r => setTimeout(r, 50))
    }
  }
  
  // Build traders array in ORIGINAL order from VANTAKE_TOP_100_WALLETS
  const traders = VANTAKE_TOP_100_WALLETS.map((wallet, index) => {
    const profile = allProfiles[index] as Record<string, unknown> | null
    
    if (!profile) {
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
      proxyWallet: String(profile.proxyWallet || profile.address || wallet),
      userName: String(profile.username || profile.userName || ''),
      vol: Number(profile.volume || profile.vol || 0),
      pnl: Number(profile.pnl || profile.profit || 0),
      profileImage: String(profile.profileImage || profile.pfp || ''),
      xUsername: String(profile.twitterUsername || profile.xUsername || ''),
      verifiedBadge: Boolean(profile.verifiedBadge || false),
      numTrades: Number(profile.numTrades || profile.tradesCount || 0),
      marketsTraded: Number(profile.marketsTraded || profile.markets || 0),
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

    // Serve from cache (instant) - but check if cache has valid data with usernames
    const { data: cache } = await supabase
      .from('top100_cache')
      .select('data, updated_at')
      .eq('id', 1)
      .single()

    // Check if cache is valid - must have traders with userNames
    const cacheValid = cache && 
      Array.isArray(cache.data) && 
      cache.data.length > 0 &&
      cache.data.some((t: Record<string, unknown>) => t.userName || t.pnl)

    if (cacheValid) {
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
