const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const DATA_API = 'https://data-api.polymarket.com'

async function tryFetch(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function main() {
  // Fetch top traders sorted by PNL with pagination (API returns max 50 per page)
  console.log('Fetching top traders by PNL...')
  const pnlPage1 = await tryFetch(`${DATA_API}/v1/leaderboard?timePeriod=ALL&sortBy=PNL&limit=50&offset=0`)
  const pnlPage2 = await tryFetch(`${DATA_API}/v1/leaderboard?timePeriod=ALL&sortBy=PNL&limit=50&offset=50`)
  const pnlData = [...(pnlPage1 || []), ...(pnlPage2 || [])]
  console.log('PNL total:', pnlData.length, 'items')

  // Also fetch by volume for variety  
  console.log('Fetching top traders by volume...')
  const volPage1 = await tryFetch(`${DATA_API}/v1/leaderboard?timePeriod=ALL&sortBy=VOL&limit=50&offset=0`)
  const volPage2 = await tryFetch(`${DATA_API}/v1/leaderboard?timePeriod=ALL&sortBy=VOL&limit=50&offset=50`)
  const volData = [...(volPage1 || []), ...(volPage2 || [])]
  console.log('VOL total:', volData.length, 'items')

  // Merge and deduplicate by wallet
  const walletMap = new Map()
  
  for (const entry of (pnlData || [])) {
    const wallet = String(entry.proxyWallet || entry.address || '').toLowerCase()
    if (wallet && !walletMap.has(wallet)) {
      walletMap.set(wallet, entry)
    }
  }
  
  // Add volume traders that aren't already in the map
  for (const entry of (volData || [])) {
    const wallet = String(entry.proxyWallet || entry.address || '').toLowerCase()
    if (wallet && !walletMap.has(wallet)) {
      walletMap.set(wallet, entry)
    }
  }

  console.log(`Total unique traders: ${walletMap.size}`)

  // Sort by PNL descending, take top 100
  const traders = Array.from(walletMap.values())
    .map((t) => ({
      rank: '0',
      proxyWallet: String(t.proxyWallet || t.address || ''),
      userName: String(t.userName || t.username || t.name || ''),
      vol: Number(t.vol || t.volume || 0),
      pnl: Number(t.pnl || t.profit || 0),
      profileImage: String(t.profileImage || t.avatar || ''),
      xUsername: String(t.xUsername || ''),
      verifiedBadge: Boolean(t.verifiedBadge || false),
      numTrades: Number(t.numTrades || 0),
      marketsTraded: Number(t.marketsTraded || 0),
    }))
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 100)

  traders.forEach((t, i) => { t.rank = String(i + 1) })

  console.log(`Saving ${traders.length} traders to cache...`)
  if (traders.length > 0) {
    console.log('Top 3:')
    traders.slice(0, 3).forEach(t => console.log(`  #${t.rank} ${t.userName || t.proxyWallet.slice(0,10)} - PNL: $${t.pnl.toLocaleString()}`))
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/top100_cache?id=eq.1`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      data: traders,
      updated_at: new Date().toISOString(),
    }),
  })

  if (res.ok) {
    console.log(`Cache seeded with ${traders.length} traders!`)
  } else {
    console.error('Failed:', res.status, await res.text())
  }
}

main().catch(console.error)
