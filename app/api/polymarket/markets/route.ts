import { NextRequest, NextResponse } from 'next/server'

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const endpoint = searchParams.get('endpoint') || 'events'
    const url = new URL(`${GAMMA_API_BASE}/${endpoint}`)

    // Remove our custom param before forwarding
    const forwardParams = new URLSearchParams(searchParams)
    forwardParams.delete('endpoint')

    // Forward all remaining query parameters
    forwardParams.forEach((value, key) => {
      url.searchParams.set(key, value)
    })

    // Defaults for popular markets
    if (!forwardParams.has('order')) {
      url.searchParams.set('order', 'volume')
    }
    if (!forwardParams.has('ascending')) {
      url.searchParams.set('ascending', 'false')
    }
    if (!forwardParams.has('active')) {
      url.searchParams.set('active', 'true')
    }
    if (!forwardParams.has('closed')) {
      url.searchParams.set('closed', 'false')
    }

    const res = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Polymarket API error: ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (error) {
    console.error('Markets API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch markets' },
      { status: 500 }
    )
  }
}
