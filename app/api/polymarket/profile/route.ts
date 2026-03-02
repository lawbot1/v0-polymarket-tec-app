import { NextResponse } from 'next/server'
import { getProfile } from '@/lib/polymarket-api'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')
  
  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 })
  }
  
  try {
    const profile = await getProfile(address)
    
    if (!profile) {
      return NextResponse.json({ userName: null, profileImage: null })
    }
    
    return NextResponse.json({
      userName: profile.name || profile.username || null,
      profileImage: profile.profileImage || null,
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ userName: null, profileImage: null })
  }
}
