import { NextRequest, NextResponse } from 'next/server'

const CLOB_API_BASE = 'https://clob.polymarket.com'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tokenId = searchParams.get('token_id')

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Missing token_id parameter' },
        { status: 400 }
      )
    }

    const url = `${CLOB_API_BASE}/book?token_id=${tokenId}`
    
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 10 }
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
    console.error('Book API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order book' },
      { status: 500 }
    )
  }
}
