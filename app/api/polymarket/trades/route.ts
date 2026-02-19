import { NextRequest, NextResponse } from 'next/server'
import { getUserTrades } from '@/lib/polymarket-api'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    const user = searchParams.get('user')
    const market = searchParams.get('market')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')
    const side = searchParams.get('side') as 'BUY' | 'SELL' | null
    const filterType = searchParams.get('filterType') as 'CASH' | 'TOKENS' | null
    const filterAmount = searchParams.get('filterAmount')

    const trades = await getUserTrades({
      user: user || undefined,
      market: market ? market.split(',') : undefined,
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0,
      side: side || undefined,
      filterType: filterType || undefined,
      filterAmount: filterAmount ? parseFloat(filterAmount) : undefined,
    })

    return NextResponse.json(trades)
  } catch (error) {
    console.error('Trades API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trades' },
      { status: 500 }
    )
  }
}
