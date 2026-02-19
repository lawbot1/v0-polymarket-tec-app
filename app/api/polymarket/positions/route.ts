import { NextRequest, NextResponse } from 'next/server'
import { getUserPositions } from '@/lib/polymarket-api'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    const user = searchParams.get('user')
    if (!user) {
      return NextResponse.json(
        { error: 'User address is required' },
        { status: 400 }
      )
    }

    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')
    const sortBy = searchParams.get('sortBy') as 'CURRENT' | 'INITIAL' | 'TOKENS' | 'CASHPNL' | 'PERCENTPNL' | null
    const sortDirection = searchParams.get('sortDirection') as 'ASC' | 'DESC' | null

    const positions = await getUserPositions({
      user,
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0,
      sortBy: sortBy || 'CASHPNL',
      sortDirection: sortDirection || 'DESC',
    })

    return NextResponse.json(positions)
  } catch (error) {
    console.error('Positions API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch positions' },
      { status: 500 }
    )
  }
}
