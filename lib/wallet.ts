import { Wallet, ethers } from 'ethers'
import crypto from 'crypto'

// Encryption key from env (must be 32 bytes for AES-256)
function getEncryptionKey(): Buffer {
  const key = process.env.WALLET_ENCRYPTION_KEY
  if (!key) throw new Error('Missing WALLET_ENCRYPTION_KEY')
  // Hash the key to ensure it's exactly 32 bytes
  return crypto.createHash('sha256').update(key).digest()
}

// Encrypt private key before storing
export function encryptPrivateKey(privateKey: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(privateKey, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

// Decrypt private key when needed
export function decryptPrivateKey(encryptedData: string): string {
  const key = getEncryptionKey()
  const [ivHex, encrypted] = encryptedData.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

// Generate a new Ethereum wallet
export function generateWallet(): { address: string; privateKey: string } {
  const wallet = Wallet.createRandom()
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  }
}

// Format address for display (0x1234...5678)
export function formatWalletAddress(address: string): string {
  if (!address || address.length < 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Polygon RPC for balance checks
const POLYGON_RPC = 'https://polygon-rpc.com'

// Get USDC balance on Polygon
export async function getUSDCBalance(address: string): Promise<string> {
  try {
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC)
    // USDC contract on Polygon
    const usdcAddress = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
    const usdcAbi = ['function balanceOf(address) view returns (uint256)']
    const usdcContract = new ethers.Contract(usdcAddress, usdcAbi, provider)
    const balance = await usdcContract.balanceOf(address)
    // USDC has 6 decimals
    return (Number(balance) / 1e6).toFixed(2)
  } catch (error) {
    console.error('Error fetching USDC balance:', error)
    return '0.00'
  }
}

// Get POL (MATIC) balance on Polygon
export async function getPOLBalance(address: string): Promise<string> {
  try {
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC)
    const balance = await provider.getBalance(address)
    return ethers.formatEther(balance)
  } catch (error) {
    console.error('Error fetching POL balance:', error)
    return '0.000000'
  }
}

// Send USDC to another address
export async function sendUSDC(
  fromPrivateKey: string,
  toAddress: string,
  amount: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC)
    const wallet = new Wallet(fromPrivateKey, provider)
    
    // USDC contract on Polygon
    const usdcAddress = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
    const usdcAbi = [
      'function balanceOf(address) view returns (uint256)',
      'function transfer(address to, uint256 amount) returns (bool)',
    ]
    const usdcContract = new ethers.Contract(usdcAddress, usdcAbi, wallet)
    
    // Convert amount to USDC units (6 decimals)
    const amountInUnits = BigInt(Math.floor(parseFloat(amount) * 1e6))
    
    // Check balance
    const balance = await usdcContract.balanceOf(wallet.address)
    if (balance < amountInUnits) {
      return { success: false, error: 'Insufficient USDC balance' }
    }
    
    // Send transaction
    const tx = await usdcContract.transfer(toAddress, amountInUnits)
    await tx.wait()
    
    return { success: true, txHash: tx.hash }
  } catch (error) {
    console.error('Error sending USDC:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Transaction failed' }
  }
}

// Get trader stats from Polymarket
export async function getTraderStats(address: string): Promise<{
  pnl: number
  volume: number
  numTrades: number
  positions: PolymarketPosition[]
}> {
  try {
    const [profileRes, positions] = await Promise.all([
      fetch(`https://clob.polymarket.com/profile?user=${address.toLowerCase()}`),
      getPolymarketPositions(address),
    ])
    
    let pnl = 0
    let volume = 0
    let numTrades = 0
    
    if (profileRes.ok) {
      const profile = await profileRes.json()
      pnl = parseFloat(profile.totalPnl || profile.pnl || '0')
      volume = parseFloat(profile.totalVolume || profile.volume || '0')
      numTrades = parseInt(profile.numTrades || profile.tradesCount || '0')
    }
    
    return { pnl, volume, numTrades, positions }
  } catch (error) {
    console.error('Error fetching trader stats:', error)
    return { pnl: 0, volume: 0, numTrades: 0, positions: [] }
  }
}

// Position type from Polymarket
export interface PolymarketPosition {
  market: string
  outcome: string
  size: number
  avgPrice: number
  currentPrice: number
  pnl: number
}

// Get Polymarket positions for a wallet
export async function getPolymarketPositions(address: string): Promise<PolymarketPosition[]> {
  try {
    // Fetch from Polymarket API
    const res = await fetch(`https://clob.polymarket.com/positions?user=${address.toLowerCase()}`, {
      headers: { 'Accept': 'application/json' },
    })
    
    if (!res.ok) {
      console.error('Polymarket API error:', res.status)
      return []
    }
    
    const data = await res.json()
    
    if (!Array.isArray(data) || data.length === 0) {
      return []
    }
    
    // Transform positions to our format
    const positions: PolymarketPosition[] = []
    
    for (const pos of data) {
      if (pos.size && parseFloat(pos.size) > 0) {
        positions.push({
          market: pos.market?.question || pos.asset?.name || 'Unknown Market',
          outcome: pos.outcome || pos.side || 'Yes',
          size: parseFloat(pos.size) || 0,
          avgPrice: parseFloat(pos.avgPrice) || 0,
          currentPrice: parseFloat(pos.price) || 0,
          pnl: parseFloat(pos.realizedPnl) || 0,
        })
      }
    }
    
    return positions.slice(0, 10) // Limit to 10 positions
  } catch (error) {
    console.error('Error fetching Polymarket positions:', error)
    return []
  }
}
