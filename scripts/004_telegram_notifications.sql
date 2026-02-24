-- Add telegram notification columns to notification_settings
ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS telegram_chat_id text,
  ADD COLUMN IF NOT EXISTS telegram_notifications_enabled boolean default false,
  ADD COLUMN IF NOT EXISTS portfolio_updates boolean default true,
  ADD COLUMN IF NOT EXISTS market_signals boolean default false;

-- Remove daily_digest column
ALTER TABLE public.notification_settings
  DROP COLUMN IF EXISTS daily_digest;

-- Add telegram_chat_id to profiles as well for easy lookup
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telegram_chat_id text;
