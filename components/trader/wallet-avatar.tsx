'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

/**
 * Generates a deterministic gradient avatar from a wallet address.
 * Colors are drawn from a palette that matches the site's dark theme
 * (greens, limes, yellows, ambers, teals, pinks, reds).
 */

const PALETTE = [
  '#22c55e', // green-500
  '#84cc16', // lime-500
  '#eab308', // yellow-500
  '#f59e0b', // amber-500
  '#14b8a6', // teal-500
  '#10b981', // emerald-500
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#ec4899', // pink-500
  '#a3e635', // lime-400
  '#4ade80', // green-400
  '#facc15', // yellow-400
  '#fb923c', // orange-400
  '#f87171', // red-400
  '#34d399', // emerald-400
  '#2dd4bf', // teal-400
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

export function WalletAvatar({ wallet, name, size = 40, className }: WalletAvatarProps) {
  const { c1, c2, c3, angle } = useMemo(() => getGradientColors(wallet), [wallet])
  const initials = (name || wallet.slice(2, 4)).toUpperCase().slice(0, 2)

  return (
    <div
      className={cn(
        'rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white/90 select-none',
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(${angle}deg, ${c1}, ${c2}, ${c3})`,
        fontSize: size * 0.3,
        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
      }}
    >
      {initials}
    </div>
  )
}
