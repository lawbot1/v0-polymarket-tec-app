import { NextResponse } from 'next/server'
import { getProfile } from '@/lib/polymarket-api'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')
  
  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 })
  }
  
  try {
    console.log('[v0] Fetching profile for:', address.slice(0, 10))
    const profile = await getProfile(address)
    console.log('[v0] Profile result:', address.slice(0, 10), profile?.name || profile?.username, profile?.profileImage ? 'has img' : 'no img')
    
    if (!profile) {
      return NextResponse.json({ userName: null, profileImage: null })
    }
    
    return NextResponse.json({
      userName: profile.name || profile.username || null,
      profileImage: profile.profileImage || null,
    })
  } catch (error) {
    console.error('[v0] Error fetching profile:', address.slice(0, 10), error)
    return NextResponse.json({ userName: null, profileImage: null })
  }
}
