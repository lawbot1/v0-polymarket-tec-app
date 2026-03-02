import { NextResponse } from 'next/server'
import { getProfile, getLeaderboard } from '@/lib/polymarket-api'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')
  
  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 })
  }
  
  try {
    // Try both methods in parallel - gamma profile API and leaderboard API
    // Leaderboard API is more reliable for proxy wallets
    const [profileResult, leaderboardResult] = await Promise.allSettled([
      getProfile(address),
      getLeaderboard({ user: address, limit: 1 })
    ])
    
    // Get data from gamma profile
    const profile = profileResult.status === 'fulfilled' ? profileResult.value : null
    
    // Get data from leaderboard (more reliable for profile images on proxy wallets)
    const leaderboardData = leaderboardResult.status === 'fulfilled' && leaderboardResult.value?.length > 0 
      ? leaderboardResult.value[0] 
      : null
    
    // Prefer leaderboard data as it's more reliable for proxy wallets
    const userName = leaderboardData?.userName || profile?.name || profile?.username || null
    const profileImage = leaderboardData?.profileImage || profile?.profileImage || null
    
    return NextResponse.json({ userName, profileImage })
  } catch {
    return NextResponse.json({ userName: null, profileImage: null })
  }
}
