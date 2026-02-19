import { NextRequest, NextResponse } from 'next/server'

const CLOB_API_BASE = 'https://clob.polymarket.com'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tokenId = searchParams.get('token_id')
    const interval = searchParams.get('interval') || '1w'
    const fidelity = searchParams.get('fidelity') || '60'

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Missing token_id parameter' },
        { status: 400 }
      )
    }

    const url = `${CLOB_API_BASE}/prices-history?token_id=${tokenId}&interval=${interval}&fidelity=${fidelity}`
    
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 60 }
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `CLOB API error: ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Price history API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch price history' },
      { status: 500 }
    )
  }
}
