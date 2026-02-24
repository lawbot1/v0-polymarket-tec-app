-- Add telegram_chat_id to notification_settings
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS telegram_chat_id text;

-- Add telegram_notifications_enabled to notification_settings
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS telegram_notifications_enabled boolean DEFAULT false;

-- Remove daily_digest column
ALTER TABLE notification_settings DROP COLUMN IF EXISTS daily_digest;

-- Add telegram_chat_id to profiles for easy lookup
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_chat_id text;
