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
