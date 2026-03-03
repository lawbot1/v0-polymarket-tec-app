import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { VANTAKE_TOP_100_WALLETS } from '@/lib/top100-wallets'
import { getLeaderboard, type LeaderboardTrader } from '@/lib/polymarket-api'

// Fetch fresh data for Vantake Top 100 wallets using leaderboard API with user param
// This is the same method the trader profile page uses
async function fetchFreshTop100() {
  const batchSize = 5 // Smaller batches to avoid rate limits
  const allProfiles: (LeaderboardTrader | null)[] = []
  
  for (let i = 0; i < VANTAKE_TOP_100_WALLETS.length; i += batchSize) {
    const batch = VANTAKE_TOP_100_WALLETS.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map(async (wallet) => {
        try {
          const data = await getLeaderboard({ 
            user: wallet, 
            limit: 1,
            timePeriod: 'ALL'
          })
          if (i === 0) {
            console.log(`[v0] Leaderboard response for ${wallet.slice(0,10)}:`, JSON.stringify(data).slice(0, 300))
          }
          return data?.[0] || null
        } catch (e) {
          console.log(`[v0] Error fetching ${wallet.slice(0,10)}:`, e)
          return null
        }
      })
    )
    allProfiles.push(...results)
    
    // Delay between batches to avoid rate limiting
    if (i + batchSize < VANTAKE_TOP_100_WALLETS.length) {
      await new Promise(r => setTimeout(r, 100))
    }
  }
  
  // Log success rate
  const successCount = allProfiles.filter(p => p !== null).length
  console.log(`[v0] Successfully fetched ${successCount}/${VANTAKE_TOP_100_WALLETS.length} trader profiles`)
  
  // Build traders array in ORIGINAL order from VANTAKE_TOP_100_WALLETS
  const traders = VANTAKE_TOP_100_WALLETS.map((wallet, index) => {
    const profile = allProfiles[index]
    
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
      proxyWallet: profile.proxyWallet || wallet,
      userName: profile.userName || '',
      vol: profile.vol || 0,
      pnl: profile.pnl || 0,
      profileImage: profile.profileImage || '',
      xUsername: profile.xUsername || '',
      verifiedBadge: profile.verifiedBadge || false,
      numTrades: profile.numTrades || 0,
      marketsTraded: profile.marketsTraded || 0,
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

    // Check if cache is valid - most traders should have userNames or pnl data
    const tradersWithData = cache?.data?.filter((t: Record<string, unknown>) => 
      t.userName || (typeof t.pnl === 'number' && t.pnl !== 0)
    )?.length || 0
    
    console.log(`[v0] Cache has ${tradersWithData} traders with data out of ${cache?.data?.length || 0}`)
    
    const cacheValid = cache && 
      Array.isArray(cache.data) && 
      cache.data.length > 0 &&
      tradersWithData > 80 // Need at least 80 traders with data

    if (cacheValid) {
      return NextResponse.json(cache.data, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
      })
    }
    
    console.log(`[v0] Cache invalid, fetching fresh data...`)

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
