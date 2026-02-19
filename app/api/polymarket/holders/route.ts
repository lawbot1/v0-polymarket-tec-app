import { NextRequest, NextResponse } from 'next/server'
import { getMarketHolders } from '@/lib/polymarket-api'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    const market = searchParams.get('market')
    if (!market) {
      return NextResponse.json(
        { error: 'Market condition ID is required' },
        { status: 400 }
      )
    }

    const holders = await getMarketHolders(market)

    return NextResponse.json(holders)
  } catch (error) {
    console.error('Holders API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch holders' },
      { status: 500 }
    )
  }
}
