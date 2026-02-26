import { NextRequest, NextResponse } from 'next/server'

const DATA_API_BASE = 'https://data-api.polymarket.com'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    const category = searchParams.get('category') || 'OVERALL'
    const timePeriod = searchParams.get('timePeriod') || 'WEEK'
    const orderBy = searchParams.get('orderBy') || 'PNL'
    const limit = searchParams.get('limit') || '24'
    const offset = searchParams.get('offset') || '0'
    const user = searchParams.get('user')
    const userName = searchParams.get('userName')

    const apiParams = new URLSearchParams()
    apiParams.set('category', category)
    apiParams.set('timePeriod', timePeriod)
    apiParams.set('orderBy', orderBy)
    apiParams.set('limit', limit)
    apiParams.set('offset', offset)
    if (user) apiParams.set('user', user)
    if (userName) apiParams.set('userName', userName)

    const url = `${DATA_API_BASE}/leaderboard?${apiParams}`
    console.log('[v0] Fetching leaderboard:', url)

    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
      }
    })

    console.log('[v0] Leaderboard response status:', res.status)

    if (!res.ok) {
      const errorText = await res.text()
      console.error('[v0] Leaderboard API error response:', errorText)
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard', details: errorText },
        { status: res.status }
      )
    }

    const data = await res.json()
    console.log('[v0] Leaderboard data count:', Array.isArray(data) ? data.length : 'not array')

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (error) {
    console.error('[v0] Leaderboard API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
