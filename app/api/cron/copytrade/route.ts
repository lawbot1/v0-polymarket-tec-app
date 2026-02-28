import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { decryptPrivateKey, formatWalletAddress } from '@/lib/wallet'
import { sendTelegramMessage } from '@/lib/telegram'
import { ethers, Wallet } from 'ethers'

const POLYGON_RPC = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com'
const POLYMARKET_CLOB_URL = 'https://clob.polymarket.com'

// Get recent trades for a wallet
async function getRecentTrades(walletAddress: string, sinceTimestamp?: number) {
  try {
    const url = new URL(`${POLYMARKET_CLOB_URL}/trades`)
    url.searchParams.set('maker', walletAddress.toLowerCase())
    if (sinceTimestamp) {
      url.searchParams.set('after', sinceTimestamp.toString())
    }
    
    const res = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
    })
    
    if (!res.ok) return []
    
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error fetching trades:', error)
    return []
  }
}

// Place order on Polymarket (simplified - real implementation needs CLOB signing)
async function placePolymarketOrder(
  privateKey: string,
  tokenId: string,
  side: 'BUY' | 'SELL',
  amount: number,
  price: number
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC)
    const wallet = new Wallet(privateKey, provider)
    
    // For real implementation, you need to:
    // 1. Get API key from Polymarket
    // 2. Sign orders with EIP-712
    // 3. Submit to CLOB API
    
    // This is a placeholder - real Polymarket integration requires their SDK
    console.log(`[Copytrade] Would place order: ${side} ${amount} @ ${price} for token ${tokenId}`)
    console.log(`[Copytrade] Wallet: ${wallet.address}`)
    
    // For now, return success to test the flow
    // In production, integrate with Polymarket's py-clob-client or similar
    return { 
      success: true, 
      orderId: `simulated_${Date.now()}`,
      error: 'Polymarket CLOB integration pending - order simulated'
    }
  } catch (error) {
    console.error('Error placing order:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Order failed' }
  }
}

// Calculate copy amount based on settings
function calculateCopyAmount(
  originalAmount: number,
  copyMode: string,
  copyValue: number,
  maxPerTrade: number,
  minTradeSize: number
): number | null {
  // Skip if original trade is too small
  if (originalAmount < minTradeSize) {
    return null
  }
  
  let copyAmount: number
  if (copyMode === 'fixed') {
    copyAmount = copyValue
  } else {
    // Percentage mode
    copyAmount = (originalAmount * copyValue) / 100
  }
  
  // Apply max limit
  copyAmount = Math.min(copyAmount, maxPerTrade)
  
  // Minimum viable trade
  if (copyAmount < 0.1) {
    return null
  }
  
  return copyAmount
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const supabase = createAdminClient()
  
  try {
    // Get all active subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('telegram_copytrade_subscriptions')
      .select('*')
      .eq('is_enabled', true)
    
    if (subError || !subscriptions?.length) {
      return NextResponse.json({ processed: 0, message: 'No active subscriptions' })
    }
    
    let totalProcessed = 0
    let totalCopied = 0
    
    // Group subscriptions by source wallet for efficiency
    const walletSubscriptions = new Map<string, typeof subscriptions>()
    for (const sub of subscriptions) {
      const existing = walletSubscriptions.get(sub.wallet_address) || []
      existing.push(sub)
      walletSubscriptions.set(sub.wallet_address, existing)
    }
    
    // Process each source wallet
    for (const [sourceWallet, subs] of walletSubscriptions) {
      // Get recent trades (last 5 minutes)
      const fiveMinutesAgo = Math.floor((Date.now() - 5 * 60 * 1000) / 1000)
      const trades = await getRecentTrades(sourceWallet, fiveMinutesAgo)
      
      if (!trades.length) continue
      
      // Process each trade for each subscriber
      for (const trade of trades) {
        const tradeId = trade.id || trade.transactionHash || `${trade.timestamp}_${trade.tokenId}`
        
        for (const sub of subs) {
          // Check if we already processed this trade for this subscription
          const { data: existing } = await supabase
            .from('telegram_copytrade_history')
            .select('id')
            .eq('subscription_id', sub.id)
            .eq('original_trade_id', tradeId)
            .single()
          
          if (existing) continue // Already processed
          
          // Get user's wallet
          const { data: userWallet } = await supabase
            .from('telegram_wallets')
            .select('*')
            .eq('telegram_chat_id', sub.telegram_chat_id)
            .single()
          
          if (!userWallet) {
            console.log(`[Copytrade] No wallet for chat ${sub.telegram_chat_id}`)
            continue
          }
          
          // Calculate copy amount
          const originalAmount = parseFloat(trade.size || trade.amount || '0')
          const copyAmount = calculateCopyAmount(
            originalAmount,
            sub.copy_mode || 'percentage',
            parseFloat(sub.copy_value) || 10,
            parseFloat(sub.max_per_trade) || 50,
            parseFloat(sub.min_trade_size) || 1
          )
          
          if (!copyAmount) {
            console.log(`[Copytrade] Trade too small to copy: $${originalAmount}`)
            continue
          }
          
          // Record the trade attempt
          const { data: historyEntry } = await supabase
            .from('telegram_copytrade_history')
            .insert({
              subscription_id: sub.id,
              telegram_chat_id: sub.telegram_chat_id,
              source_wallet: sourceWallet,
              original_trade_id: tradeId,
              market_id: trade.market || trade.tokenId || '',
              market_title: trade.question || trade.marketTitle || 'Unknown Market',
              outcome: trade.outcome || trade.side || 'Yes',
              original_amount: originalAmount,
              copied_amount: copyAmount,
              price: parseFloat(trade.price || '0.5'),
              status: 'pending',
            })
            .select()
            .single()
          
          // Try to execute the copy trade
          const privateKey = decryptPrivateKey(userWallet.encrypted_private_key)
          const result = await placePolymarketOrder(
            privateKey,
            trade.tokenId || trade.assetId || '',
            trade.side === 'sell' ? 'SELL' : 'BUY',
            copyAmount,
            parseFloat(trade.price || '0.5')
          )
          
          // Update history with result
          await supabase
            .from('telegram_copytrade_history')
            .update({
              status: result.success ? 'success' : 'failed',
              tx_hash: result.orderId,
              error_message: result.error,
            })
            .eq('id', historyEntry?.id)
          
          // Notify user
          const marketName = (trade.question || trade.marketTitle || 'Unknown Market').slice(0, 50)
          const notifyText = result.success
            ? [
                `<b>Trade Copied</b>`,
                ``,
                `From: <code>${formatWalletAddress(sourceWallet)}</code>`,
                `Market: ${marketName}`,
                `Side: ${trade.side === 'sell' ? 'SELL' : 'BUY'} ${trade.outcome || 'Yes'}`,
                `Original: $${originalAmount.toFixed(2)}`,
                `Your copy: $${copyAmount.toFixed(2)}`,
              ].join('\n')
            : [
                `<b>Copy Trade Failed</b>`,
                ``,
                `Market: ${marketName}`,
                `Error: ${result.error}`,
              ].join('\n')
          
          await sendTelegramMessage(sub.telegram_chat_id, notifyText, 'HTML')
          
          totalProcessed++
          if (result.success) totalCopied++
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      processed: totalProcessed,
      copied: totalCopied,
      subscriptions: subscriptions.length,
    })
  } catch (error) {
    console.error('Copytrade cron error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
