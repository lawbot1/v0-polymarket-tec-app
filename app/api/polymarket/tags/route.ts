import { NextResponse } from 'next/server'

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com'

export async function GET() {
  try {
    const res = await fetch(`${GAMMA_API_BASE}/tags`, {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store'
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Gamma API error: ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    })
  } catch (error) {
    console.error('Tags API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    )
  }
}
