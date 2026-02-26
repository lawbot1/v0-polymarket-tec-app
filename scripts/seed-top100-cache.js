// Seed the top100 cache by calling the Polymarket API and storing in Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const DATA_API_BASE = 'https://data-api.polymarket.com'

const CURATED_WALLETS = [
  '0x17db3fcd93ba12d38382a0cade24b200185c5f6d',
  '0xf2f6af4f27ec2dcf4072095ab804016e14cd5817',
  '0x06ecb7e739f5455922ce57e83284f132c7f0f845',
  '0x3b4484b6c8cbfdaa383ba337ab3f0d71055e264e',
  '0x44c1dfe43260c94ed4f1d00de2e1f80fb113ebc1',
  '0x06dcaa14f57d8a0573f5dc5940565e6de667af59',
  '0x843a6da3886cf889435cf0920659a00a68db8070',
  '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
  '0x9256dc04d6a9af8410c253bb5c52a8ff6eb62e8b',
  '0x7744bfd749a70020d16a1fcbac1d064761c9999e',
]
const CURATED_SET = new Set(CURATED_WALLETS.map((w) => w.toLowerCase()))

async function main() {
  console.log('Fetching bulk leaderboard data...')

  const bulkUrls = [
    `${DATA_API_BASE}/v1/leaderboard?timePeriod=ALL&sortBy=PNL&limit=500&offset=0`,
    `${DATA_API_BASE}/v1/leaderboard?timePeriod=ALL&sortBy=PNL&limit=500&offset=500`,
    `${DATA_API_BASE}/v1/leaderboard?timePeriod=ALL&sortBy=VOL&limit=500&offset=0`,
  ]

  const bulkResults = await Promise.all(
    bulkUrls.map(async (url) => {
      try {
        const res = await fetch(url)
        if (!res.ok) return []
        return await res.json()
      } catch {
        return []
      }
    })
  )

  const foundMap = new Map()
  for (const page of bulkResults) {
    if (!Array.isArray(page)) continue
    for (const entry of page) {
      const wallet = String(entry.proxyWallet || '').toLowerCase()
      if (CURATED_SET.has(wallet) && !foundMap.has(wallet)) {
        foundMap.set(wallet, entry)
      }
    }
  }

  console.log(`Found ${foundMap.size} / ${CURATED_WALLETS.length} from bulk`)

  const traders = Array.from(foundMap.values())
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

  traders.forEach((t, i) => { t.rank = String(i + 1) })

  console.log(`Saving ${traders.length} traders to cache...`)

  const res = await fetch(`${SUPABASE_URL}/rest/v1/top100_cache?id=eq.1`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
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
    console.error('Failed to seed cache:', res.status, await res.text())
  }
}

main().catch(console.error)
