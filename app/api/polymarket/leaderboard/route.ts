import { NextRequest, NextResponse } from 'next/server'
import { getLeaderboard, type LeaderboardCategory, type LeaderboardTimePeriod } from '@/lib/polymarket-api'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    const category = searchParams.get('category') as LeaderboardCategory | null
    const timePeriod = searchParams.get('timePeriod') as LeaderboardTimePeriod | null
    const orderBy = searchParams.get('orderBy') as 'PNL' | 'VOL' | null
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')
    const user = searchParams.get('user')
    const userName = searchParams.get('userName')

    const traders = await getLeaderboard({
      category: category || 'OVERALL',
      timePeriod: timePeriod || 'WEEK',
      orderBy: orderBy || 'PNL',
      limit: limit ? parseInt(limit) : 24,
      offset: offset ? parseInt(offset) : 0,
      user: user || undefined,
      userName: userName || undefined,
    })

    return NextResponse.json(traders, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (error) {
    console.error('Leaderboard API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}
