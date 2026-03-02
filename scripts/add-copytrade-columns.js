import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('Adding new columns to telegram_copytrade_subscriptions...')
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE telegram_copytrade_subscriptions 
      ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'fixed',
      ADD COLUMN IF NOT EXISTS trade_size DECIMAL(18, 2) DEFAULT 50,
      ADD COLUMN IF NOT EXISTS single_trade_limit DECIMAL(18, 2) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS price_range_min INTEGER DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS price_range_max INTEGER DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS slippage INTEGER DEFAULT 5;
    `
  })
  
  if (error) {
    // Try alternate approach - columns might already exist or RPC not available
    console.log('RPC approach failed, columns may already exist:', error.message)
    
    // Test if we can insert with new columns
    const testResult = await supabase
      .from('telegram_copytrade_subscriptions')
      .select('mode, trade_size, slippage')
      .limit(1)
    
    if (testResult.error) {
      console.log('Columns do not exist yet. Please run this SQL in Supabase dashboard:')
      console.log(`
ALTER TABLE telegram_copytrade_subscriptions 
ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'fixed',
ADD COLUMN IF NOT EXISTS trade_size DECIMAL(18, 2) DEFAULT 50,
ADD COLUMN IF NOT EXISTS single_trade_limit DECIMAL(18, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS price_range_min INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS price_range_max INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS slippage INTEGER DEFAULT 5;
      `)
    } else {
      console.log('Columns already exist! Migration complete.')
    }
  } else {
    console.log('Migration completed successfully!')
  }
}

runMigration().catch(console.error)
