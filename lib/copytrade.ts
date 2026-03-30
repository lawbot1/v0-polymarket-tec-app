import { ethers, Wallet } from 'ethers'
import crypto from 'crypto'
import { decryptPrivateKey } from './wallet'

// Polymarket CLOB API
const CLOB_API_BASE = 'https://clob.polymarket.com'

// Polymarket contract addresses on Polygon
const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
const CTF_EXCHANGE = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E'
const NEG_RISK_CTF_EXCHANGE = '0xC5d563A36AE78145C45a50134d48A1215220f80a'
const NEG_RISK_ADAPTER = '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296'

// Polygon RPC
const POLYGON_RPC = 'https://polygon-rpc.com'

// Order types
export interface CopyTradeOrder {
  tokenId: string
  side: 'BUY' | 'SELL'
  size: number // in shares
  price: number // 0-1
  feeRateBps?: number
  nonce?: number
  expiration?: number
}

export interface CopyTradeResult {
  success: boolean
  orderId?: string
  txHash?: string
  filledSize?: number
  avgPrice?: number
  error?: string
}

// EIP-712 Domain for Polymarket
const EIP712_DOMAIN = {
  name: 'Polymarket CTF Exchange',
  version: '1',
  chainId: 137, // Polygon
}

// Order struct type for EIP-712
const ORDER_TYPES = {
  Order: [
    { name: 'salt', type: 'uint256' },
    { name: 'maker', type: 'address' },
    { name: 'signer', type: 'address' },
    { name: 'taker', type: 'address' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'makerAmount', type: 'uint256' },
    { name: 'takerAmount', type: 'uint256' },
    { name: 'expiration', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'feeRateBps', type: 'uint256' },
    { name: 'side', type: 'uint8' },
    { name: 'signatureType', type: 'uint8' },
  ],
}

// Generate L2 API headers for authentication
function generateL2Headers(
  method: string,
  path: string,
  body?: string
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const apiKey = process.env.POLYMARKET_API_KEY
  const apiSecret = process.env.POLYMARKET_API_SECRET
  const passphrase = process.env.POLYMARKET_API_PASSPHRASE

  if (!apiKey || !apiSecret || !passphrase) {
    throw new Error('Missing Polymarket API credentials')
  }

  // Create signature message
  const message = timestamp + method.toUpperCase() + path + (body || '')
  
  // Sign with HMAC-SHA256
  const signature = crypto
    .createHmac('sha256', Buffer.from(apiSecret, 'base64'))
    .update(message)
    .digest('base64')

  return {
    'POLY_API_KEY': apiKey,
    'POLY_SIGNATURE': signature,
    'POLY_TIMESTAMP': timestamp,
    'POLY_PASSPHRASE': passphrase,
    'Content-Type': 'application/json',
  }
}

// Get current nonce for a wallet
async function getNonce(address: string): Promise<number> {
  try {
    const headers = generateL2Headers('GET', `/nonce?address=${address.toLowerCase()}`)
    const res = await fetch(`${CLOB_API_BASE}/nonce?address=${address.toLowerCase()}`, {
      method: 'GET',
      headers,
    })
    
    if (!res.ok) {
      return 0
    }
    
    const data = await res.json()
    return parseInt(data.nonce || '0')
  } catch {
    return 0
  }
}

// Generate random salt for order
function generateSalt(): string {
  return BigInt('0x' + crypto.randomBytes(16).toString('hex')).toString()
}

// Build order struct for signing
function buildOrderStruct(
  maker: string,
  signer: string,
  order: CopyTradeOrder,
  nonce: number
): Record<string, unknown> {
  const salt = generateSalt()
  const expiration = order.expiration || Math.floor(Date.now() / 1000) + 86400 // 24h default
  
  // Calculate amounts based on side
  // For BUY: makerAmount = USDC amount, takerAmount = shares
  // For SELL: makerAmount = shares, takerAmount = USDC amount
  const shareAmount = BigInt(Math.floor(order.size * 1e6)) // Shares in 6 decimals
  const usdcAmount = BigInt(Math.floor(order.size * order.price * 1e6)) // USDC in 6 decimals
  
  const makerAmount = order.side === 'BUY' ? usdcAmount : shareAmount
  const takerAmount = order.side === 'BUY' ? shareAmount : usdcAmount
  
  return {
    salt,
    maker: maker.toLowerCase(),
    signer: signer.toLowerCase(),
    taker: '0x0000000000000000000000000000000000000000',
    tokenId: order.tokenId,
    makerAmount: makerAmount.toString(),
    takerAmount: takerAmount.toString(),
    expiration: expiration.toString(),
    nonce: nonce.toString(),
    feeRateBps: (order.feeRateBps || 0).toString(),
    side: order.side === 'BUY' ? 0 : 1,
    signatureType: 0, // EOA signature
  }
}

// Sign order with EIP-712
async function signOrder(
  wallet: Wallet,
  orderStruct: Record<string, unknown>,
  isNegRisk: boolean
): Promise<string> {
  const domain = {
    ...EIP712_DOMAIN,
    verifyingContract: isNegRisk ? NEG_RISK_CTF_EXCHANGE : CTF_EXCHANGE,
  }
  
  const signature = await wallet.signTypedData(domain, ORDER_TYPES, orderStruct)
  return signature
}

// Approve USDC spending for exchange (if needed)
async function approveUSDCIfNeeded(
  wallet: Wallet,
  amount: bigint,
  isNegRisk: boolean
): Promise<boolean> {
  try {
    const spender = isNegRisk ? NEG_RISK_CTF_EXCHANGE : CTF_EXCHANGE
    
    const usdcAbi = [
      'function allowance(address owner, address spender) view returns (uint256)',
      'function approve(address spender, uint256 amount) returns (bool)',
    ]
    
    const usdc = new ethers.Contract(USDC_ADDRESS, usdcAbi, wallet)
    
    // Check current allowance
    const currentAllowance = await usdc.allowance(wallet.address, spender)
    
    if (currentAllowance >= amount) {
      return true // Already approved
    }
    
    // Approve max uint256
    const tx = await usdc.approve(spender, ethers.MaxUint256)
    await tx.wait()
    
    return true
  } catch (error) {
    console.error('Error approving USDC:', error)
    return false
  }
}

// Submit order to Polymarket CLOB
async function submitOrder(
  orderStruct: Record<string, unknown>,
  signature: string,
  owner: string
): Promise<CopyTradeResult> {
  try {
    const orderPayload = {
      order: {
        ...orderStruct,
        signature,
      },
      owner: owner.toLowerCase(),
      orderType: 'GTC', // Good Till Cancelled
    }
    
    const body = JSON.stringify(orderPayload)
    const path = '/order'
    const headers = generateL2Headers('POST', path, body)
    
    const res = await fetch(`${CLOB_API_BASE}${path}`, {
      method: 'POST',
      headers,
      body,
    })
    
    const data = await res.json()
    
    if (!res.ok) {
      return {
        success: false,
        error: data.message || data.error || `Order failed: ${res.status}`,
      }
    }
    
    return {
      success: true,
      orderId: data.orderID || data.id,
      filledSize: parseFloat(data.matched || '0'),
      avgPrice: parseFloat(data.averagePrice || '0'),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit order',
    }
  }
}

// Main function to execute a copy trade
export async function executeCopyTrade(
  encryptedPrivateKey: string,
  tokenId: string,
  side: 'BUY' | 'SELL',
  usdcAmount: number, // Amount in USDC to spend
  maxSlippage: number = 0.02, // 2% default slippage
  isNegRisk: boolean = false
): Promise<CopyTradeResult> {
  try {
    // Decrypt private key
    const privateKey = decryptPrivateKey(encryptedPrivateKey)
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC)
    const wallet = new Wallet(privateKey, provider)
    
    // Get current market price
    const priceRes = await fetch(`${CLOB_API_BASE}/price?token_id=${tokenId}&side=${side}`)
    if (!priceRes.ok) {
      return { success: false, error: 'Failed to fetch market price' }
    }
    const priceData = await priceRes.json()
    const marketPrice = parseFloat(priceData.price)
    
    if (marketPrice <= 0 || marketPrice >= 1) {
      return { success: false, error: 'Invalid market price' }
    }
    
    // Calculate order price with slippage
    const orderPrice = side === 'BUY' 
      ? Math.min(marketPrice * (1 + maxSlippage), 0.99)
      : Math.max(marketPrice * (1 - maxSlippage), 0.01)
    
    // Calculate share size from USDC amount
    const shareSize = usdcAmount / orderPrice
    
    // For BUY orders, ensure we have enough USDC approved
    if (side === 'BUY') {
      const usdcAmountWei = BigInt(Math.floor(usdcAmount * 1e6))
      const approved = await approveUSDCIfNeeded(wallet, usdcAmountWei, isNegRisk)
      if (!approved) {
        return { success: false, error: 'Failed to approve USDC' }
      }
    }
    
    // Get nonce
    const nonce = await getNonce(wallet.address)
    
    // Build order
    const order: CopyTradeOrder = {
      tokenId,
      side,
      size: shareSize,
      price: orderPrice,
      feeRateBps: 0,
      nonce,
    }
    
    // Build order struct
    const orderStruct = buildOrderStruct(wallet.address, wallet.address, order, nonce)
    
    // Sign order
    const signature = await signOrder(wallet, orderStruct, isNegRisk)
    
    // Submit order
    const result = await submitOrder(orderStruct, signature, wallet.address)
    
    return result
  } catch (error) {
    console.error('Copy trade execution error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Copy trade failed',
    }
  }
}

// Get token ID for an outcome from market data
export async function getTokenIdForOutcome(
  conditionId: string,
  outcome: string
): Promise<string | null> {
  try {
    // Fetch market data to get token IDs
    const res = await fetch(`https://gamma-api.polymarket.com/markets?condition_id=${conditionId}`)
    if (!res.ok) return null
    
    const markets = await res.json()
    if (!markets || markets.length === 0) return null
    
    const market = markets[0]
    const outcomes = JSON.parse(market.outcomes || '["Yes","No"]')
    const tokenIds = JSON.parse(market.clobTokenIds || '[]')
    
    const outcomeIndex = outcomes.findIndex(
      (o: string) => o.toLowerCase() === outcome.toLowerCase()
    )
    
    if (outcomeIndex === -1 || !tokenIds[outcomeIndex]) {
      return null
    }
    
    return tokenIds[outcomeIndex]
  } catch (error) {
    console.error('Error getting token ID:', error)
    return null
  }
}

// Process copy trade for all subscribers
export async function processCopyTradesForTrade(
  trade: {
    conditionId: string
    outcome: string
    side: string
    price: number
    size: number
  },
  subscriptions: Array<{
    telegram_user_id: string
    encrypted_private_key: string
    trade_size: number
    max_slippage: number
    mode: string
  }>
): Promise<Array<{ userId: string; result: CopyTradeResult }>> {
  const results: Array<{ userId: string; result: CopyTradeResult }> = []
  
  // Get token ID for the outcome
  const tokenId = await getTokenIdForOutcome(trade.conditionId, trade.outcome)
  if (!tokenId) {
    return subscriptions.map(sub => ({
      userId: sub.telegram_user_id,
      result: { success: false, error: 'Could not find token ID for market' },
    }))
  }
  
  // Process each subscription
  for (const sub of subscriptions) {
    // Only process if mode is 'auto'
    if (sub.mode !== 'auto') {
      results.push({
        userId: sub.telegram_user_id,
        result: { success: false, error: 'Copy trade not in auto mode' },
      })
      continue
    }
    
    // Execute the copy trade
    const result = await executeCopyTrade(
      sub.encrypted_private_key,
      tokenId,
      trade.side.toUpperCase() as 'BUY' | 'SELL',
      sub.trade_size,
      sub.max_slippage
    )
    
    results.push({
      userId: sub.telegram_user_id,
      result,
    })
  }
  
  return results
}
