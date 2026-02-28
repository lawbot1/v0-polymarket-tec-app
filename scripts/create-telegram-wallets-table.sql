-- Create table for Telegram bot wallets (for copytrading)
CREATE TABLE IF NOT EXISTS telegram_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_chat_id TEXT NOT NULL UNIQUE,
  wallet_address TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL, -- Encrypted with server secret
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_telegram_wallets_chat_id ON telegram_wallets(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_wallets_address ON telegram_wallets(wallet_address);

-- Enable RLS
ALTER TABLE telegram_wallets ENABLE ROW LEVEL SECURITY;

-- Only service role can access wallets (for security)
CREATE POLICY "Service role only" ON telegram_wallets
  FOR ALL USING (auth.role() = 'service_role');
