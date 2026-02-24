'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

/**
 * Generates a deterministic gradient avatar from a wallet address.
 * Uses only monochrome tones (black / white / grays) to match the site palette.
 */

const PALETTE = [
  '#ffffff', // white
  '#e5e5e5', // neutral-200
  '#d4d4d4', // neutral-300
  '#a3a3a3', // neutral-400
  '#737373', // neutral-500
  '#525252', // neutral-600
  '#404040', // neutral-700
  '#2a2a2a', // dark gray
  '#1a1a1a', // near-black
  '#0a0a0a', // almost black
  '#171717', // neutral-900
  '#262626', // neutral-800
  '#f5f5f5', // neutral-100
  '#333333', // charcoal
  '#4a4a4a', // mid-dark
  '#8a8a8a', // mid-light
]

function hashWallet(wallet: string): number {
  let hash = 0
  for (let i = 0; i < wallet.length; i++) {
    hash = ((hash << 5) - hash + wallet.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function getGradientColors(wallet: string) {
  const h = hashWallet(wallet)
  const c1 = PALETTE[h % PALETTE.length]
  const c2 = PALETTE[(h >> 4) % PALETTE.length]
  const c3 = PALETTE[(h >> 8) % PALETTE.length]
  const angle = (h % 360)
  return { c1, c2, c3, angle }
}

interface WalletAvatarProps {
  wallet: string
  name?: string | null
  size?: number       // px, default 40
  className?: string
}

// Determines if a hex color is "light" (needs dark text) or "dark" (needs light text)
function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 140
}

export function WalletAvatar({ wallet, size = 40, className }: WalletAvatarProps) {
  const { c1, c2, c3, angle } = useMemo(() => getGradientColors(wallet), [wallet])

  return (
    <div
      className={cn(
        'rounded-full flex-shrink-0 select-none ring-1 ring-white/10',
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(${angle}deg, ${c1}, ${c2}, ${c3})`,
      }}
    />
  )
}
