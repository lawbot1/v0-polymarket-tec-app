// Test what category data events have
async function test() {
  // Fetch a few popular events
  const res = await fetch('https://gamma-api.polymarket.com/events?limit=5&order=volume&ascending=false&active=true')
  const events = await res.json()
  
  for (const ev of events) {
    console.log(`Event: ${ev.title}`)
    console.log(`  slug: ${ev.slug}`)
    console.log(`  category: ${ev.category}`)
    console.log(`  tags: ${JSON.stringify(ev.tags)}`)
    console.log(`  markets count: ${ev.markets?.length}`)
    console.log('---')
  }
  
  // Also try fetching a specific event by slug
  console.log('\n=== Fetching specific event by slug ===')
  const slug = events[0]?.slug
  if (slug) {
    const res2 = await fetch(`https://gamma-api.polymarket.com/events/${slug}`)
    const ev2 = await res2.json()
    console.log(`Event: ${ev2.title}, category: ${ev2.category}, tags: ${JSON.stringify(ev2.tags)}`)
  }

  // Also try markets to see if they have tags
  console.log('\n=== Markets with tags ===')
  const mRes = await fetch('https://gamma-api.polymarket.com/markets?limit=5&order=volume24hr&ascending=false&active=true')
  const markets = await mRes.json()
  for (const m of markets) {
    console.log(`Market: ${m.question?.slice(0, 60)}`)
    console.log(`  category: ${m.category}`)
    console.log(`  tags: ${JSON.stringify(m.tags)}`)
    console.log('---')
  }
}

test().catch(console.error)
