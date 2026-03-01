import { NextResponse } from 'next/server'

const DATA_API_BASE = 'https://data-api.polymarket.com'

interface UserPosition {
  proxyWallet: string
  cashPnl: number
  percentPnl: number
  size: number
  curPrice: number
  avgPrice: number
  title: string
  eventSlug: string
  outcome: string
  redeemable: boolean
}

interface UserTrade {
  proxyWallet: string
  side: 'BUY' | 'SELL'
  size: number
  price: number
  timestamp: number
  title: string
  eventSlug: string
  outcome: string
}

interface SmartTrader {
  address: string
  winRate: number
  totalTrades: number
  avgTradeSize: number
  pnl: number
  roi: number
  profitFactor: number
  recentTrades: UserTrade[]
  score: number
  profileImage?: string
  userName?: string
}

// Analyze a trader's performance to calculate smart metrics
async function analyzeTrader(address: string): Promise<SmartTrader | null> {
  try {
    // Fetch closed positions (to calculate win rate)
    const closedRes = await fetch(`${DATA_API_BASE}/closed-positions?user=${address}&limit=100`, {
      cache: 'no-store'
    })
    
    // Fetch current positions
    const positionsRes = await fetch(`${DATA_API_BASE}/positions?user=${address}&limit=100`, {
      cache: 'no-store'
    })
    
    // Fetch recent trades
    const tradesRes = await fetch(`${DATA_API_BASE}/trades?user=${address}&limit=50`, {
      cache: 'no-store'
    })
    
    // Fetch profile
    const profileRes = await fetch(`https://gamma-api.polymarket.com/profiles/${address}`, {
      cache: 'no-store'
    })
    
    if (!closedRes.ok || !tradesRes.ok) return null
    
    const closedPositions: UserPosition[] = await closedRes.json()
    const currentPositions: UserPosition[] = positionsRes.ok ? await positionsRes.json() : []
    const trades: UserTrade[] = await tradesRes.json()
    const profile = profileRes.ok ? await profileRes.json() : null
    
    // Calculate win rate from closed positions
    const resolvedPositions = closedPositions.filter(p => p.redeemable || p.cashPnl !== 0)
    const wins = resolvedPositions.filter(p => p.cashPnl > 0).length
    const losses = resolvedPositions.filter(p => p.cashPnl < 0).length
    const totalResolved = wins + losses
    
    const winRate = totalResolved > 0 ? (wins / totalResolved) * 100 : 0
    
    // Calculate total PnL
    const realizedPnl = closedPositions.reduce((sum, p) => sum + (p.cashPnl || 0), 0)
    const unrealizedPnl = currentPositions.reduce((sum, p) => sum + (p.cashPnl || 0), 0)
    const totalPnl = realizedPnl + unrealizedPnl
    
    // Calculate average trade size and total volume
    const buyTrades = trades.filter(t => t.side === 'BUY')
    const totalVolume = buyTrades.reduce((sum, t) => sum + (t.size * t.price), 0)
    const avgTradeSize = buyTrades.length > 0 ? totalVolume / buyTrades.length : 0
    
    // Calculate ROI (PnL / Volume)
    const roi = totalVolume > 0 ? (totalPnl / totalVolume) * 100 : 0
    
    // Calculate profit factor (gross profit / gross loss)
    const grossProfit = closedPositions.filter(p => p.cashPnl > 0).reduce((sum, p) => sum + p.cashPnl, 0)
    const grossLoss = Math.abs(closedPositions.filter(p => p.cashPnl < 0).reduce((sum, p) => sum + p.cashPnl, 0))
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 10 : 0
    
    // Calculate smart score (weighted algorithm)
    // High win rate + consistent sizing + positive ROI + good profit factor
    const score = (
      (winRate * 0.35) + // 35% weight on win rate
      (Math.min(profitFactor, 5) * 10) + // Up to 50 points for profit factor
      (Math.min(roi, 50) * 0.5) + // Up to 25 points for ROI
      (totalResolved >= 10 ? 15 : totalResolved >= 5 ? 8 : 0) // Bonus for experience
    )
    
    return {
      address,
      winRate,
      totalTrades: totalResolved,
      avgTradeSize,
      pnl: totalPnl,
      roi,
      profitFactor,
      recentTrades: trades.slice(0, 10),
      score,
      profileImage: profile?.profileImage || profile?.profileImageOptimized,
      userName: profile?.name || profile?.pseudonym,
    }
  } catch (error) {
    console.error(`Error analyzing trader ${address}:`, error)
    return null
  }
}

// Get list of potential smart traders from various sources
async function discoverSmartTraders(): Promise<string[]> {
  const addresses = new Set<string>()
  
  try {
    // 1. Get traders from leaderboard (various time periods for diversity)
    const periods = ['DAY', 'WEEK', 'MONTH', 'ALL']
    
    for (const period of periods) {
      const leaderboardRes = await fetch(
        `${DATA_API_BASE}/v1/leaderboard?timePeriod=${period}&orderBy=PNL&limit=50`,
        { cache: 'no-store' }
      )
      if (leaderboardRes.ok) {
        const traders = await leaderboardRes.json()
        traders.forEach((t: { proxyWallet: string }) => addresses.add(t.proxyWallet))
      }
    }
    
    // 2. Add some known smart wallets (can be expanded)
    const knownSmartWallets = [
      '0x37d10ffb61998561c5f9fb941c42c952d8fb4e28', // Example from user
    ]
    knownSmartWallets.forEach(w => addresses.add(w))
    
  } catch (error) {
    console.error('Error discovering traders:', error)
  }
  
  return Array.from(addresses)
}

export async function GET() {
  try {
    // Discover potential smart traders
    const traderAddresses = await discoverSmartTraders()
    
    // Analyze each trader (limit to 50 to avoid timeout)
    const analysisPromises = traderAddresses.slice(0, 50).map(addr => analyzeTrader(addr))
    const analysisResults = await Promise.all(analysisPromises)
    
    // Filter out failed analyses and sort by smart score
    const smartTraders = analysisResults
      .filter((t): t is SmartTrader => t !== null)
      // Filter for high-quality traders:
      // - Win rate >= 65%
      // - At least 5 resolved trades
      // - Positive PnL
      // - Average trade size >= $500
      .filter(t => 
        t.winRate >= 65 && 
        t.totalTrades >= 5 && 
        t.pnl > 0 &&
        t.avgTradeSize >= 500
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 20) // Top 20 smart traders
    
    // Get recent trades from smart traders for signals
    const smartSignals = smartTraders.flatMap(trader => 
      trader.recentTrades
        .filter(trade => {
          const tradeValue = trade.size * trade.price
          const entryPrice = trade.price * 100
          // Filter: significant trades, not redemptions
          return tradeValue >= 1000 && entryPrice < 99
        })
        .map(trade => ({
          ...trade,
          traderAddress: trader.address,
          traderWinRate: trader.winRate,
          traderScore: trader.score,
          traderPnl: trader.pnl,
          traderRoi: trader.roi,
          traderProfitFactor: trader.profitFactor,
          traderAvgSize: trader.avgTradeSize,
          traderTotalTrades: trader.totalTrades,
          profileImage: trader.profileImage,
          userName: trader.userName,
        }))
    )
    
    // Sort by timestamp (most recent first) then by trader score
    smartSignals.sort((a, b) => {
      const timeA = a.timestamp < 1e12 ? a.timestamp * 1000 : a.timestamp
      const timeB = b.timestamp < 1e12 ? b.timestamp * 1000 : b.timestamp
      return timeB - timeA
    })
    
    return NextResponse.json({
      traders: smartTraders,
      signals: smartSignals.slice(0, 100), // Top 100 signals
      meta: {
        totalTradersAnalyzed: traderAddresses.length,
        qualifiedTraders: smartTraders.length,
        totalSignals: smartSignals.length,
      }
    })
  } catch (error) {
    console.error('Smart signals API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch smart signals' },
      { status: 500 }
    )
  }
}
