// Polymarket API Integration - REAL DATA ONLY
// Documentation: https://docs.polymarket.com

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com'
const CLOB_API_BASE = 'https://clob.polymarket.com'
const DATA_API_BASE = 'https://data-api.polymarket.com'

// ============================================
// TYPES - Based on Polymarket API Documentation
// ============================================

export interface PolymarketMarket {
  id: string
  question: string
  conditionId: string
  slug: string
  description?: string
  category?: string
  startDate?: string
  endDate?: string
  active: boolean
  closed: boolean
  archived?: boolean
  resolutionSource?: string
  outcomes: string
  outcomePrices: string
  volume: string
  volume24hr?: number
  volumeNum?: number
  liquidity: string
  liquidityNum?: number
  openInterest?: number
  bestBid?: number
  bestAsk?: number
  lastTradePrice?: number
  oneDayPriceChange?: number
  clobTokenIds?: string
  negRisk?: boolean
  image?: string
  icon?: string
  tags?: Array<{ id: string; label: string; slug: string }>
  makerBaseFee?: number
  takerBaseFee?: number
  spread?: number
}

export interface PolymarketEvent {
  id: string
  title: string
  slug: string
  description?: string
  category?: string
  startDate?: string
  endDate?: string
  active: boolean
  closed: boolean
  volume: string
  volumeNum?: number
  liquidity: string
  liquidityNum?: number
  openInterest?: number
  image?: string
  icon?: string
  markets: PolymarketMarket[]
  tags?: Array<{ id: string; label: string; slug: string }>
}

// Leaderboard Types
export type LeaderboardCategory = 
  | 'OVERALL' 
  | 'POLITICS' 
  | 'SPORTS' 
  | 'CRYPTO' 
  | 'CULTURE' 
  | 'MENTIONS' 
  | 'WEATHER' 
  | 'ECONOMICS' 
  | 'TECH' 
  | 'FINANCE'

export type LeaderboardTimePeriod = 'DAY' | 'WEEK' | 'MONTH' | 'ALL'

export interface LeaderboardTrader {
  rank: string
  proxyWallet: string
  userName?: string
  vol: number
  pnl: number
  profileImage?: string
  xUsername?: string
  verifiedBadge?: boolean
}

// Position Types
export interface UserPosition {
  proxyWallet: string
  asset: string
  conditionId: string
  size: number
  avgPrice: number
  initialValue: number
  currentValue: number
  cashPnl: number
  percentPnl: number
  totalBought: number
  realizedPnl: number
  percentRealizedPnl: number
  curPrice: number
  redeemable: boolean
  mergeable: boolean
  title: string
  slug: string
  icon?: string
  eventSlug: string
  outcome: string
  outcomeIndex: number
  oppositeOutcome: string
  oppositeAsset: string
  endDate?: string
  negativeRisk: boolean
}

// Trade Types
export interface UserTrade {
  proxyWallet: string
  side: 'BUY' | 'SELL'
  asset: string
  conditionId: string
  size: number
  price: number
  timestamp: number
  title: string
  slug: string
  icon?: string
  eventSlug: string
  outcome: string
  outcomeIndex: number
  name?: string
  pseudonym?: string
  bio?: string
  profileImage?: string
  profileImageOptimized?: string
  transactionHash?: string
}

// Activity Types
export interface UserActivity {
  proxyWallet: string
  type: 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAWAL' | 'REDEEM' | 'MERGE'
  timestamp: number
  conditionId?: string
  title?: string
  slug?: string
  outcome?: string
  size?: number
  price?: number
  usdcAmount?: number
  transactionHash?: string
}

// Profile Types
export interface UserProfile {
  proxyWallet: string
  name?: string
  pseudonym?: string
  bio?: string
  profileImage?: string
  profileImageOptimized?: string
  xUsername?: string
  verifiedBadge?: boolean
  createdAt?: string
}

// Top Holders
export interface MarketHolder {
  proxyWallet: string
  name?: string
  pseudonym?: string
  profileImage?: string
  size: number
  avgPrice: number
  outcome: string
}

// Order Book
export interface OrderBookEntry {
  price: string
  size: string
}

export interface OrderBook {
  bids: OrderBookEntry[]
  asks: OrderBookEntry[]
  market?: {
    min_order_size?: string
    tick_size?: string
    neg_risk?: boolean
  }
}

// Price History
export interface PriceHistory {
  t: number
  p: string
}

// ============================================
// API FUNCTIONS - GAMMA API (Market Discovery)
// ============================================

export async function getMarkets(params?: {
  closed?: boolean
  active?: boolean
  limit?: number
  offset?: number
  order?: string
  ascending?: boolean
  tag_id?: string
}): Promise<PolymarketMarket[]> {
  const searchParams = new URLSearchParams()
  
  if (params?.closed !== undefined) searchParams.set('closed', String(params.closed))
  if (params?.active !== undefined) searchParams.set('active', String(params.active))
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.offset) searchParams.set('offset', String(params.offset))
  if (params?.order) searchParams.set('order', params.order)
  if (params?.ascending !== undefined) searchParams.set('ascending', String(params.ascending))
  if (params?.tag_id) searchParams.set('tag_id', params.tag_id)

  const url = `${GAMMA_API_BASE}/markets${searchParams.toString() ? `?${searchParams}` : ''}`
  
  const res = await fetch(url, {
    next: { revalidate: 60 }
  })
  
  if (!res.ok) {
    throw new Error(`Failed to fetch markets: ${res.status}`)
  }
  
  return res.json()
}

export async function getMarket(idOrSlug: string): Promise<PolymarketMarket> {
  const res = await fetch(`${GAMMA_API_BASE}/markets/${idOrSlug}`, {
    next: { revalidate: 60 }
  })
  
  if (!res.ok) {
    throw new Error(`Failed to fetch market: ${res.status}`)
  }
  
  return res.json()
}

export async function getEvents(params?: {
  closed?: boolean
  active?: boolean
  limit?: number
  offset?: number
  order?: string
  ascending?: boolean
  tag_id?: string
}): Promise<PolymarketEvent[]> {
  const searchParams = new URLSearchParams()
  
  if (params?.closed !== undefined) searchParams.set('closed', String(params.closed))
  if (params?.active !== undefined) searchParams.set('active', String(params.active))
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.offset) searchParams.set('offset', String(params.offset))
  if (params?.order) searchParams.set('order', params.order)
  if (params?.ascending !== undefined) searchParams.set('ascending', String(params.ascending))
  if (params?.tag_id) searchParams.set('tag_id', params.tag_id)

  const url = `${GAMMA_API_BASE}/events${searchParams.toString() ? `?${searchParams}` : ''}`
  
  const res = await fetch(url, {
    next: { revalidate: 60 }
  })
  
  if (!res.ok) {
    throw new Error(`Failed to fetch events: ${res.status}`)
  }
  
  return res.json()
}

export async function getEvent(idOrSlug: string): Promise<PolymarketEvent> {
  const res = await fetch(`${GAMMA_API_BASE}/events/${idOrSlug}`, {
    next: { revalidate: 60 }
  })
  
  if (!res.ok) {
    throw new Error(`Failed to fetch event: ${res.status}`)
  }
  
  return res.json()
}

export async function searchMarkets(query: string): Promise<{
  markets: PolymarketMarket[]
  events: PolymarketEvent[]
}> {
  const res = await fetch(`${GAMMA_API_BASE}/search?query=${encodeURIComponent(query)}`, {
    next: { revalidate: 60 }
  })
  
  if (!res.ok) {
    throw new Error(`Search failed: ${res.status}`)
  }
  
  return res.json()
}

export async function getTags(): Promise<Array<{ id: string; label: string; slug: string }>> {
  const res = await fetch(`${GAMMA_API_BASE}/tags`, {
    next: { revalidate: 3600 }
  })
  
  if (!res.ok) {
    throw new Error(`Failed to fetch tags: ${res.status}`)
  }
  
  return res.json()
}

// ============================================
// API FUNCTIONS - DATA API (Leaderboard, Positions, Trades)
// ============================================

export async function getLeaderboard(params?: {
  category?: LeaderboardCategory
  timePeriod?: LeaderboardTimePeriod
  orderBy?: 'PNL' | 'VOL'
  limit?: number
  offset?: number
  user?: string
  userName?: string
}): Promise<LeaderboardTrader[]> {
  const searchParams = new URLSearchParams()
  
  if (params?.category) searchParams.set('category', params.category)
  if (params?.timePeriod) searchParams.set('timePeriod', params.timePeriod)
  if (params?.orderBy) searchParams.set('orderBy', params.orderBy)
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.offset) searchParams.set('offset', String(params.offset))
  if (params?.user) searchParams.set('user', params.user)
  if (params?.userName) searchParams.set('userName', params.userName)

  const url = `${DATA_API_BASE}/v1/leaderboard${searchParams.toString() ? `?${searchParams}` : ''}`
  
  const res = await fetch(url, {
    next: { revalidate: 60 }
  })
  
  if (!res.ok) {
    throw new Error(`Failed to fetch leaderboard: ${res.status}`)
  }
  
  return res.json()
}

export async function getUserPositions(params: {
  user: string
  market?: string[]
  eventId?: number[]
  sizeThreshold?: number
  redeemable?: boolean
  mergeable?: boolean
  limit?: number
  offset?: number
  sortBy?: 'CURRENT' | 'INITIAL' | 'TOKENS' | 'CASHPNL' | 'PERCENTPNL' | 'TITLE' | 'RESOLVING' | 'PRICE' | 'AVGPRICE'
  sortDirection?: 'ASC' | 'DESC'
  title?: string
}): Promise<UserPosition[]> {
  const searchParams = new URLSearchParams()
  
  searchParams.set('user', params.user)
  if (params.market) searchParams.set('market', params.market.join(','))
  if (params.eventId) searchParams.set('eventId', params.eventId.join(','))
  if (params.sizeThreshold !== undefined) searchParams.set('sizeThreshold', String(params.sizeThreshold))
  if (params.redeemable !== undefined) searchParams.set('redeemable', String(params.redeemable))
  if (params.mergeable !== undefined) searchParams.set('mergeable', String(params.mergeable))
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.offset) searchParams.set('offset', String(params.offset))
  if (params.sortBy) searchParams.set('sortBy', params.sortBy)
  if (params.sortDirection) searchParams.set('sortDirection', params.sortDirection)
  if (params.title) searchParams.set('title', params.title)

  const url = `${DATA_API_BASE}/positions?${searchParams}`
  
  const res = await fetch(url, {
    next: { revalidate: 30 }
  })
  
  if (!res.ok) {
    throw new Error(`Failed to fetch positions: ${res.status}`)
  }
  
  return res.json()
}

export async function getUserTrades(params?: {
  user?: string
  market?: string[]
  eventId?: number[]
  limit?: number
  offset?: number
  takerOnly?: boolean
  filterType?: 'CASH' | 'TOKENS'
  filterAmount?: number
  side?: 'BUY' | 'SELL'
}): Promise<UserTrade[]> {
  const searchParams = new URLSearchParams()
  
  if (params?.user) searchParams.set('user', params.user)
  if (params?.market) searchParams.set('market', params.market.join(','))
  if (params?.eventId) searchParams.set('eventId', params.eventId.join(','))
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.offset) searchParams.set('offset', String(params.offset))
  if (params?.takerOnly !== undefined) searchParams.set('takerOnly', String(params.takerOnly))
  if (params?.filterType) searchParams.set('filterType', params.filterType)
  if (params?.filterAmount !== undefined) searchParams.set('filterAmount', String(params.filterAmount))
  if (params?.side) searchParams.set('side', params.side)

  const url = `${DATA_API_BASE}/trades${searchParams.toString() ? `?${searchParams}` : ''}`
  
  const res = await fetch(url, {
    next: { revalidate: 30 }
  })
  
  if (!res.ok) {
    throw new Error(`Failed to fetch trades: ${res.status}`)
  }
  
  return res.json()
}

export async function getUserActivity(params: {
  user: string
  limit?: number
  offset?: number
}): Promise<UserActivity[]> {
  const searchParams = new URLSearchParams()
  
  searchParams.set('user', params.user)
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.offset) searchParams.set('offset', String(params.offset))

  const url = `${DATA_API_BASE}/activity?${searchParams}`
  
  const res = await fetch(url, {
    next: { revalidate: 30 }
  })
  
  if (!res.ok) {
    throw new Error(`Failed to fetch activity: ${res.status}`)
  }
  
  return res.json()
}

export async function getMarketHolders(conditionId: string): Promise<MarketHolder[]> {
  const res = await fetch(`${DATA_API_BASE}/holders?market=${conditionId}`, {
    next: { revalidate: 60 }
  })
  
  if (!res.ok) {
    throw new Error(`Failed to fetch market holders: ${res.status}`)
  }
  
  return res.json()
}

export async function getUserPortfolioValue(user: string): Promise<{ value: number }> {
  const res = await fetch(`${DATA_API_BASE}/value?user=${user}`, {
    next: { revalidate: 30 }
  })
  
  if (!res.ok) {
    throw new Error(`Failed to fetch portfolio value: ${res.status}`)
  }
  
  return res.json()
}

export async function getUserClosedPositions(params: {
  user: string
  limit?: number
  offset?: number
}): Promise<UserPosition[]> {
  const searchParams = new URLSearchParams()
  
  searchParams.set('user', params.user)
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.offset) searchParams.set('offset', String(params.offset))

  const url = `${DATA_API_BASE}/closed-positions?${searchParams}`
  
  const res = await fetch(url, {
    next: { revalidate: 60 }
  })
  
  if (!res.ok) {
    throw new Error(`Failed to fetch closed positions: ${res.status}`)
  }
  
  return res.json()
}

// ============================================
// API FUNCTIONS - GAMMA PROFILES
// ============================================

export async function getProfile(addressOrUsername: string): Promise<UserProfile | null> {
  const res = await fetch(`${GAMMA_API_BASE}/profiles/${addressOrUsername}`, {
    next: { revalidate: 300 }
  })
  
  if (!res.ok) {
    if (res.status === 404) return null
    throw new Error(`Failed to fetch profile: ${res.status}`)
  }
  
  return res.json()
}

// ============================================
// API FUNCTIONS - CLOB API (Pricing & Order Book)
// ============================================

export async function getPrice(tokenId: string, side: 'BUY' | 'SELL'): Promise<{ price: string }> {
  const res = await fetch(`${CLOB_API_BASE}/price?token_id=${tokenId}&side=${side}`, {
    next: { revalidate: 10 }
  })
  
  if (!res.ok) {
    throw new Error(`Failed to fetch price: ${res.status}`)
  }
  
  return res.json()
}

export async function getMidpoint(tokenId: string): Promise<{ mid: string }> {
  const res = await fetch(`${CLOB_API_BASE}/midpoint?token_id=${tokenId}`, {
    next: { revalidate: 10 }
  })
  
  if (!res.ok) {
    throw new Error(`Failed to fetch midpoint: ${res.status}`)
  }
  
  return res.json()
}

export async function getOrderBook(tokenId: string): Promise<OrderBook> {
  const res = await fetch(`${CLOB_API_BASE}/book?token_id=${tokenId}`, {
    next: { revalidate: 10 }
  })
  
  if (!res.ok) {
    throw new Error(`Failed to fetch order book: ${res.status}`)
  }
  
  return res.json()
}

export async function getPriceHistory(tokenId: string, params?: {
  interval?: '1h' | '6h' | '1d' | '1w' | '1m' | 'all'
  fidelity?: number
  startTs?: number
  endTs?: number
}): Promise<{ history: PriceHistory[] }> {
  const searchParams = new URLSearchParams()
  searchParams.set('token_id', tokenId)
  
  if (params?.interval) searchParams.set('interval', params.interval)
  if (params?.fidelity) searchParams.set('fidelity', String(params.fidelity))
  if (params?.startTs) searchParams.set('startTs', String(params.startTs))
  if (params?.endTs) searchParams.set('endTs', String(params.endTs))

  const res = await fetch(`${CLOB_API_BASE}/prices-history?${searchParams}`, {
    next: { revalidate: 60 }
  })
  
  if (!res.ok) {
    throw new Error(`Failed to fetch price history: ${res.status}`)
  }
  
  return res.json()
}

export async function getSpread(tokenId: string): Promise<{ bid: string; ask: string; spread: string }> {
  const res = await fetch(`${CLOB_API_BASE}/spread?token_id=${tokenId}`, {
    next: { revalidate: 10 }
  })
  
  if (!res.ok) {
    throw new Error(`Failed to fetch spread: ${res.status}`)
  }
  
  return res.json()
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function safeParseJSON<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

export function parseOutcomes(market: PolymarketMarket): string[] {
  return safeParseJSON(market.outcomes, ['Yes', 'No'])
}

export function parseOutcomePrices(market: PolymarketMarket): number[] {
  return safeParseJSON(market.outcomePrices, [0.5, 0.5])
}

export function parseClobTokenIds(market: PolymarketMarket): string[] {
  return safeParseJSON(market.clobTokenIds || '[]', [])
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) {
    return `$${(volume / 1_000_000).toFixed(1)}M`
  }
  if (volume >= 1_000) {
    return `$${(volume / 1_000).toFixed(1)}K`
  }
  return `$${volume.toFixed(0)}`
}

export function formatPnl(pnl: number): string {
  const prefix = pnl >= 0 ? '+' : ''
  if (Math.abs(pnl) >= 1_000_000) {
    return `${prefix}$${(pnl / 1_000_000).toFixed(2)}M`
  }
  if (Math.abs(pnl) >= 1_000) {
    return `${prefix}$${(pnl / 1_000).toFixed(1)}K`
  }
  return `${prefix}$${pnl.toFixed(0)}`
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

export function formatAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function getImpliedProbability(market: PolymarketMarket): number {
  const prices = parseOutcomePrices(market)
  return prices[0] || 0.5
}

export function calculateLiquidityDepth(orderBook: OrderBook, percentageRange = 0.1): {
  buyLiquidity: number
  sellLiquidity: number
  midPrice: number
} {
  if (!orderBook.bids?.length || !orderBook.asks?.length) {
    return { buyLiquidity: 0, sellLiquidity: 0, midPrice: 0.5 }
  }

  const bestBid = parseFloat(orderBook.bids[0].price)
  const bestAsk = parseFloat(orderBook.asks[0].price)
  const midPrice = (bestBid + bestAsk) / 2
  
  const upperLimit = midPrice * (1 + percentageRange)
  const lowerLimit = midPrice * (1 - percentageRange)

  let buyLiquidity = 0
  for (const ask of orderBook.asks) {
    const price = parseFloat(ask.price)
    if (price <= upperLimit) {
      buyLiquidity += parseFloat(ask.size)
    } else {
      break
    }
  }

  let sellLiquidity = 0
  for (const bid of orderBook.bids) {
    const price = parseFloat(bid.price)
    if (price >= lowerLimit) {
      sellLiquidity += parseFloat(bid.size)
    } else {
      break
    }
  }

  return { buyLiquidity, sellLiquidity, midPrice }
}

export function timeAgo(timestamp: number | string): string {
  if (!timestamp) return 'Unknown'
  
  let dateMs: number
  
  if (typeof timestamp === 'string') {
    // ISO string format
    dateMs = new Date(timestamp).getTime()
  } else if (typeof timestamp === 'number') {
    // Check if timestamp is in seconds (Unix) or milliseconds
    // If timestamp is less than year 2000 in ms, it's probably in seconds
    if (timestamp < 946684800000) {
      // Timestamp is in seconds, convert to milliseconds
      dateMs = timestamp * 1000
    } else {
      dateMs = timestamp
    }
  } else {
    return 'Unknown'
  }
  
  // Validate the date
  if (isNaN(dateMs) || dateMs <= 0) return 'Unknown'
  
  const now = Date.now()
  const seconds = Math.floor((now - dateMs) / 1000)
  
  // If negative or too far in future, something is wrong
  if (seconds < 0) return 'Just now'
  
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago` // Less than 30 days
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago` // Less than 1 year
  return `${Math.floor(seconds / 31536000)}y ago`
}

// Normalize timestamp to milliseconds
// Polymarket API returns timestamps in seconds (Unix) or ISO strings
export function normalizeTimestamp(timestamp: number | string): number {
  if (!timestamp) return Date.now()
  
  if (typeof timestamp === 'string') {
    // ISO string format
    const ms = new Date(timestamp).getTime()
    return isNaN(ms) ? Date.now() : ms
  }
  
  if (typeof timestamp === 'number') {
    // If timestamp is less than year 2000 in ms, it's in seconds
    if (timestamp < 946684800000) {
      return timestamp * 1000
    }
    return timestamp
  }
  
  return Date.now()
}

// Format timestamp to localized date string
export function formatDate(timestamp: number | string, options?: Intl.DateTimeFormatOptions): string {
  const ms = normalizeTimestamp(timestamp)
  const defaultOptions: Intl.DateTimeFormatOptions = { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  }
  return new Date(ms).toLocaleDateString('en-US', options || defaultOptions)
}

// Format timestamp to short date (for charts)
export function formatShortDate(timestamp: number | string): string {
  const ms = normalizeTimestamp(timestamp)
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Map Polymarket categories to UI categories
export function mapCategory(category?: string): string {
  if (!category) return 'Other'
  const categoryMap: Record<string, string> = {
    'POLITICS': 'Politics',
    'SPORTS': 'Sports',
    'CRYPTO': 'Crypto',
    'CULTURE': 'Pop Culture',
    'MENTIONS': 'Pop Culture',
    'WEATHER': 'Science',
    'ECONOMICS': 'Finance',
    'TECH': 'Tech',
    'FINANCE': 'Finance',
  }
  return categoryMap[category.toUpperCase()] || category
}

// Map UI categories to API categories
export function mapCategoryToApi(category: string): LeaderboardCategory {
  const categoryMap: Record<string, LeaderboardCategory> = {
    'All': 'OVERALL',
    'Politics': 'POLITICS',
    'Sports': 'SPORTS',
    'Crypto': 'CRYPTO',
    'Pop Culture': 'CULTURE',
    'Finance': 'FINANCE',
    'Tech': 'TECH',
  }
  return categoryMap[category] || 'OVERALL'
}

// Map timeframe to API format
export function mapTimeframeToApi(timeframe: string): LeaderboardTimePeriod {
  const timeframeMap: Record<string, LeaderboardTimePeriod> = {
    '24H': 'DAY',
    '7D': 'WEEK',
    '30D': 'MONTH',
    'All': 'ALL',
  }
  return timeframeMap[timeframe] || 'WEEK'
}
