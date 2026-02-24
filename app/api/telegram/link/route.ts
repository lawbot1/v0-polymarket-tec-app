import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateLinkingCode } from '@/lib/telegram'

// POST -- generate a new linking code for the authenticated user
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Invalidate any existing unused codes for this user
    await supabase
      .from('telegram_linking_codes')
      .update({ used: true })
      .eq('user_id', user.id)
      .eq('used', false)

    // Generate new code
    const code = generateLinkingCode()

    const { error: insertError } = await supabase
      .from('telegram_linking_codes')
      .insert({
        user_id: user.id,
        code,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
      })

    if (insertError) {
      console.error('[Telegram Link] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 })
    }

    return NextResponse.json({
      code,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })
  } catch (error) {
    console.error('[Telegram Link] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// GET -- check current telegram connection status
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: settings } = await supabase
      .from('notification_settings')
      .select('telegram_chat_id, telegram_notifications_enabled')
      .eq('user_id', user.id)
      .single()

    // Check for any active (unused, not expired) code
    const { data: activeCode } = await supabase
      .from('telegram_linking_codes')
      .select('code, expires_at')
      .eq('user_id', user.id)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      connected: !!settings?.telegram_chat_id,
      enabled: settings?.telegram_notifications_enabled || false,
      activeCode: activeCode?.code || null,
      codeExpiresAt: activeCode?.expires_at || null,
    })
  } catch (error) {
    console.error('[Telegram Link] Status error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// DELETE -- unlink telegram account
export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await supabase
      .from('notification_settings')
      .update({
        telegram_chat_id: null,
        telegram_notifications_enabled: false,
      })
      .eq('user_id', user.id)

    await supabase
      .from('profiles')
      .update({ telegram_chat_id: null })
      .eq('id', user.id)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Telegram Link] Unlink error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
