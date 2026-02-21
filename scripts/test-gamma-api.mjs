// Test different Gamma API endpoint parameters

const tests = [
  { name: 'Events sorted by volume', url: 'https://gamma-api.polymarket.com/events?limit=3&active=true&closed=false&order=volume&ascending=false' },
  { name: 'Events sorted by volume_24hr', url: 'https://gamma-api.polymarket.com/events?limit=3&active=true&closed=false&order=volume_24hr&ascending=false' },
  { name: 'Events sorted by liquidity', url: 'https://gamma-api.polymarket.com/events?limit=3&active=true&closed=false&order=liquidity&ascending=false' },
  { name: 'Events with tag=politics', url: 'https://gamma-api.polymarket.com/events?limit=3&active=true&closed=false&order=volume&ascending=false&tag=politics' },
  { name: 'Events with tag_slug=politics', url: 'https://gamma-api.polymarket.com/events?limit=3&active=true&closed=false&order=volume&ascending=false&tag_slug=politics' },
  { name: 'Markets sorted by volume', url: 'https://gamma-api.polymarket.com/markets?limit=3&active=true&closed=false&order=volume&ascending=false' },
  { name: 'Markets sorted by volume24hr', url: 'https://gamma-api.polymarket.com/markets?limit=3&active=true&closed=false&order=volume24hr&ascending=false' },
]

for (const test of tests) {
  try {
    const res = await fetch(test.url)
    const data = await res.json()
    const count = Array.isArray(data) ? data.length : 'NOT ARRAY'
    const firstTitle = Array.isArray(data) && data[0] ? (data[0].title || data[0].question || 'no title') : 'empty'
    const firstVol = Array.isArray(data) && data[0] ? (data[0].volume || data[0].volumeNum || 0) : 0
    console.log(`[${res.status}] ${test.name}: count=${count}, first="${firstTitle}", vol=${firstVol}`)
  } catch (err) {
    console.log(`[ERR] ${test.name}: ${err.message}`)
  }
}
