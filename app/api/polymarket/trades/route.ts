import { NextRequest, NextResponse } from 'next/server'

const DATA_API_BASE = 'https://data-api.polymarket.com'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    const user = searchParams.get('user')
    const market = searchParams.get('market')
    const limit = searchParams.get('limit') || '100'
    const offset = searchParams.get('offset') || '0'
    const side = searchParams.get('side')
    const filterType = searchParams.get('filterType')
    const filterAmount = searchParams.get('filterAmount')

    const apiParams = new URLSearchParams()
    if (user) apiParams.set('user', user)
    if (market) apiParams.set('market', market)
    apiParams.set('limit', limit)
    apiParams.set('offset', offset)
    if (side) apiParams.set('side', side)
    if (filterType) apiParams.set('filterType', filterType)
    if (filterAmount) apiParams.set('filterAmount', filterAmount)

    const url = `${DATA_API_BASE}/trades?${apiParams}`
    console.log('[v0] Fetching trades:', url)

    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
      }
    })

    console.log('[v0] Trades response status:', res.status)

    if (!res.ok) {
      const errorText = await res.text()
      console.error('[v0] Trades API error response:', errorText)
      return NextResponse.json(
        { error: 'Failed to fetch trades', details: errorText },
        { status: res.status }
      )
    }

    const data = await res.json()
    console.log('[v0] Trades data count:', Array.isArray(data) ? data.length : 'not array')

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    console.error('[v0] Trades API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trades', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
