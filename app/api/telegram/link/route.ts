import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { generateLinkingCode } from '@/lib/telegram'

// Helper to get user ID from either server session or request body
async function getUserId(req?: NextRequest): Promise<string | null> {
  // First try server-side auth
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch {}

  // Fallback: check request body or query param
  if (req) {
    try {
      const url = new URL(req.url)
      const queryUserId = url.searchParams.get('userId')
      if (queryUserId) return queryUserId

      const body = await req.clone().json().catch(() => null)
      if (body?.userId) return body.userId
    } catch {}
  }

  return null
}

// POST -- generate a new linking code for the authenticated user
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Invalidate any existing unused codes for this user (use admin to bypass RLS)
    await supabaseAdmin
      .from('telegram_linking_codes')
      .update({ used: true })
      .eq('user_id', userId)
      .eq('used', false)

    // Generate new code
    const code = generateLinkingCode()

    const { error: insertError } = await supabaseAdmin
      .from('telegram_linking_codes')
      .insert({
        user_id: userId,
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
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const queryUserId = url.searchParams.get('userId')
    
    let userId: string | null = queryUserId

    if (!userId) {
      try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        userId = user?.id || null
      } catch {}
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: settings } = await supabaseAdmin
      .from('notification_settings')
      .select('telegram_chat_id, telegram_notifications_enabled')
      .eq('user_id', userId)
      .single()

    // Check for any active (unused, not expired) code
    const { data: activeCode } = await supabaseAdmin
      .from('telegram_linking_codes')
      .select('code, expires_at')
      .eq('user_id', userId)
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
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId(req)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await supabaseAdmin
      .from('notification_settings')
      .update({
        telegram_chat_id: null,
        telegram_notifications_enabled: false,
      })
      .eq('user_id', userId)

    await supabaseAdmin
      .from('profiles')
      .update({ telegram_chat_id: null })
      .eq('id', userId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Telegram Link] Unlink error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
