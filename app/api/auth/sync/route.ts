import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Use service role key to bypass RLS for profile upserts
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey)
}

export async function POST(request: Request) {
  try {
    const { privyId, email, walletAddress } = await request.json()

    if (!privyId) {
      return NextResponse.json({ error: 'Missing privyId' }, { status: 400 })
    }

    const supabase = getAdminClient()

    // Use Privy DID as the stable user ID
    // Check if profile already exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('id', privyId)
      .single()

    if (existing) {
      // Profile exists -- update email/wallet if changed
      await supabase
        .from('profiles')
        .update({
          email: email || undefined,
          polymarket_wallet: walletAddress || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', privyId)

      return NextResponse.json({
        userId: existing.id,
        displayName: existing.display_name,
      })
    }

    // Create new profile
    const displayName = email?.split('@')[0] || walletAddress?.slice(0, 8) || 'User'

    const { data: newProfile, error } = await supabase
      .from('profiles')
      .insert({
        id: privyId,
        display_name: displayName,
        email: email || null,
        polymarket_wallet: walletAddress || null,
      })
      .select('id, display_name')
      .single()

    if (error) {
      console.error('[auth/sync] Insert error:', error)
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
    }

    // Create default notification settings
    await supabase
      .from('notification_settings')
      .insert({
        user_id: privyId,
        email_notifications: true,
        trade_alerts: true,
        price_alerts: false,
        daily_summary: true,
      })
      .select()
      .single()

    return NextResponse.json({
      userId: newProfile.id,
      displayName: newProfile.display_name,
    })
  } catch (e) {
    console.error('[auth/sync] Error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
