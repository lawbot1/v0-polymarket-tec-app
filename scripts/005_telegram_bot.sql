-- Telegram linking codes table
CREATE TABLE IF NOT EXISTS public.telegram_linking_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 minutes'),
  used boolean DEFAULT false
);

-- No RLS on linking_codes -- only accessed server-side via service role
ALTER TABLE public.telegram_linking_codes ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own codes
CREATE POLICY "linking_codes_select_own" ON public.telegram_linking_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "linking_codes_insert_own" ON public.telegram_linking_codes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Telegram notification log (to track what we've already sent)
CREATE TABLE IF NOT EXISTS public.telegram_notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id text NOT NULL,
  wallet_address text NOT NULL,
  trade_id text NOT NULL,
  message text,
  sent_at timestamptz DEFAULT now()
);

ALTER TABLE public.telegram_notification_log ENABLE ROW LEVEL SECURITY;

-- Index for fast lookup to avoid duplicate notifications
CREATE UNIQUE INDEX IF NOT EXISTS tg_notif_log_unique_trade 
  ON public.telegram_notification_log(user_id, trade_id);

-- Index for cleanup of old logs
CREATE INDEX IF NOT EXISTS tg_notif_log_sent_at ON public.telegram_notification_log(sent_at);

-- Add telegram columns to existing tables (IF NOT EXISTS for safety)
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS telegram_chat_id text;
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS telegram_notifications_enabled boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_chat_id text;

-- Drop daily_digest if it still exists
ALTER TABLE public.notification_settings DROP COLUMN IF EXISTS daily_digest;
