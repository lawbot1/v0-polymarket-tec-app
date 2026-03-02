-- Add new columns to telegram_copytrade_subscriptions for full copytrade settings
-- These columns store the copytrade configuration from the 7-step flow

ALTER TABLE telegram_copytrade_subscriptions 
ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'fixed',
ADD COLUMN IF NOT EXISTS trade_size DECIMAL(18, 2) DEFAULT 50,
ADD COLUMN IF NOT EXISTS single_trade_limit DECIMAL(18, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS price_range_min INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS price_range_max INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS slippage INTEGER DEFAULT 5;

-- Add comment for documentation
COMMENT ON COLUMN telegram_copytrade_subscriptions.mode IS 'Trade sizing mode: fixed, percentage, or portfolio';
COMMENT ON COLUMN telegram_copytrade_subscriptions.trade_size IS 'Amount for fixed mode ($) or percentage for other modes';
COMMENT ON COLUMN telegram_copytrade_subscriptions.single_trade_limit IS 'Maximum $ per single trade, NULL for no limit';
COMMENT ON COLUMN telegram_copytrade_subscriptions.price_range_min IS 'Minimum price in cents to copy (e.g., 2 for 2¢), NULL for no filter';
COMMENT ON COLUMN telegram_copytrade_subscriptions.price_range_max IS 'Maximum price in cents to copy (e.g., 98 for 98¢), NULL for no filter';
COMMENT ON COLUMN telegram_copytrade_subscriptions.slippage IS 'Slippage tolerance percentage (0-100)';
