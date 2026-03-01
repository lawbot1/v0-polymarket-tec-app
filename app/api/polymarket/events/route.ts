import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const url = new URL(`${GAMMA_API_BASE}/events`)
    
    // Forward all query parameters
    searchParams.forEach((value, key) => {
      url.searchParams.set(key, value)
    })

    const res = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store'
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
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error('Events API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}
