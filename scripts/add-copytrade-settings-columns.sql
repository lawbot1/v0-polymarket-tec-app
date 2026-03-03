-- Add new columns to telegram_copytrade_subscriptions for full copytrade settings

ALTER TABLE telegram_copytrade_subscriptions 
ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'fixed';

ALTER TABLE telegram_copytrade_subscriptions 
ADD COLUMN IF NOT EXISTS trade_size DECIMAL(18, 2) DEFAULT 50;

ALTER TABLE telegram_copytrade_subscriptions 
ADD COLUMN IF NOT EXISTS single_trade_limit DECIMAL(18, 2) DEFAULT NULL;

ALTER TABLE telegram_copytrade_subscriptions 
ADD COLUMN IF NOT EXISTS price_range_min INTEGER DEFAULT NULL;

ALTER TABLE telegram_copytrade_subscriptions 
ADD COLUMN IF NOT EXISTS price_range_max INTEGER DEFAULT NULL;

ALTER TABLE telegram_copytrade_subscriptions 
ADD COLUMN IF NOT EXISTS slippage INTEGER DEFAULT 5;
