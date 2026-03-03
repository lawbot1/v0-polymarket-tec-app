import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Helper to get user ID from either server session or request body/query
async function getUserId(req?: NextRequest): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch {}

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

// GET -- get user's permanent linking code and telegram status
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Get permanent linking code from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('telegram_linking_code, telegram_chat_id')
      .eq('id', userId)
      .single()

    // Get notification settings
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('telegram_chat_id, telegram_notifications_enabled')
      .eq('user_id', userId)
      .single()

    const chatId = profile?.telegram_chat_id || settings?.telegram_chat_id || null

    return NextResponse.json({
      connected: !!chatId,
      enabled: settings?.telegram_notifications_enabled || false,
      linkingCode: profile?.telegram_linking_code || null,
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

    const supabase = createAdminClient()

    await supabase
      .from('notification_settings')
      .update({
        telegram_chat_id: null,
        telegram_notifications_enabled: false,
      })
      .eq('user_id', userId)

    await supabase
      .from('profiles')
      .update({ telegram_chat_id: null })
      .eq('id', userId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Telegram Link] Unlink error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
