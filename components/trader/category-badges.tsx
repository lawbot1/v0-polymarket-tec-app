'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import {
  Crown,
  Zap,
  Activity,
  Gem,
  Target,
  Flame,
  Shield,
  Trophy,
  Clock,
  TrendingUp,
  Dumbbell,
} from 'lucide-react'

// ============================================
// CATEGORY DEFINITIONS
// ============================================

export interface TraderCategory {
  id: string
  label: string
  description: string
  icon: React.ElementType
  customIcon?: string // path to a custom image icon
  color: string
  borderColor: string
}

export const TRADER_CATEGORIES: Record<string, TraderCategory> = {
  'elite-profit': {
    id: 'elite-profit',
    label: 'Elite Profit',
    description: 'Realized profits exceeding $500K',
    icon: Trophy,
    customIcon: '/icons/elite-profit.png',
    color: 'text-[#fbbf24]',
    borderColor: 'border-[#fbbf24]/30',
  },
  'legendary-profit': {
    id: 'legendary-profit',
    label: 'Legendary Profit',
    description: 'Realized profits exceeding $1M',
    icon: Crown,
    customIcon: '/icons/legendary-profit.png',
    color: 'text-[#f59e0b]',
    borderColor: 'border-[#f59e0b]/30',
  },
  'volume-king': {
    id: 'volume-king',
    label: 'Volume King',
    description: 'Veteran with 1,000+ resolved markets',
    icon: Zap,
    customIcon: '/icons/volume-king.png',
    color: 'text-[#a78bfa]',
    borderColor: 'border-[#a78bfa]/30',
  },
  'crypto': {
    id: 'crypto',
    label: 'Crypto',
    description: 'Top 1% performer in Crypto markets by smart score (smart score > 60)',
    icon: Activity,
    customIcon: '/icons/crypto.png',
    color: 'text-[#60a5fa]',
    borderColor: 'border-[#60a5fa]/30',
  },
  'shark': {
    id: 'shark',
    label: 'Shark',
    description: 'Volume >$10M with portfolio >$100K',
    icon: Gem,
    color: 'text-[#34d399]',
    borderColor: 'border-[#34d399]/30',
  },
  'sports': {
    id: 'sports',
    label: 'Sports',
    description: 'Top 1% performer in Sports markets by smart score (smart score > 60)',
    icon: Dumbbell,
    color: 'text-[#f97316]',
    borderColor: 'border-[#f97316]/30',
  },
  'medium-hold': {
    id: 'medium-hold',
    label: 'Medium Hold Time',
    description: 'Median trade duration is between 15 min and 4 hours',
    icon: Clock,
    color: 'text-[#06b6d4]',
    borderColor: 'border-[#06b6d4]/30',
  },
  'whale': {
    id: 'whale',
    label: 'Whale',
    description: 'Total volume exceeding $1M',
    icon: Crown, // fallback
    customIcon: '/icons/whale.png',
    color: 'text-[#60a5fa]',
    borderColor: 'border-[#60a5fa]/30',
  },
  'high-winrate': {
    id: 'high-winrate',
    label: 'High Win Rate',
    description: 'Win rate above 60% across all resolved positions',
    icon: Target,
    color: 'text-[#22c55e]',
    borderColor: 'border-[#22c55e]/30',
  },
  'rising-star': {
    id: 'rising-star',
    label: 'Rising Star',
    description: 'New trader with exceptional early performance',
    icon: Flame,
    customIcon: '/icons/rising-star.png',
    color: 'text-[#fb923c]',
    borderColor: 'border-[#fb923c]/30',
  },
  'consistent': {
    id: 'consistent',
    label: 'Consistent',
    description: 'Maintains positive PnL across multiple timeframes',
    icon: Shield,
    customIcon: '/icons/consistent.png',
    color: 'text-[#a3e635]',
    borderColor: 'border-[#a3e635]/30',
  },
  'alpha-hunter': {
    id: 'alpha-hunter',
    label: 'Alpha Hunter',
    description: 'Exceptional risk-adjusted returns with PnL >$100K',
    icon: TrendingUp,
    customIcon: '/icons/alpha-hunter.png',
    color: 'text-[#c084fc]',
    borderColor: 'border-[#c084fc]/30',
  },
}

// ============================================
// ASSIGN CATEGORIES BASED ON TRADER STATS
// ============================================

export interface TraderStats {
  pnl: number
  volume: number
  smartScore: number
  winRate?: number
  rank?: number
  tradesCount?: number
  positionsCount?: number
  bestCategory?: string
}

export function getTraderCategories(stats: TraderStats): TraderCategory[] {
  const categories: TraderCategory[] = []

  // Legendary Profit
  if (stats.pnl >= 1_000_000) {
    categories.push(TRADER_CATEGORIES['legendary-profit'])
  }
  // Elite Profit
  else if (stats.pnl >= 500_000) {
    categories.push(TRADER_CATEGORIES['elite-profit'])
  }

  // Shark
  if (stats.volume > 10_000_000 && stats.pnl > 100_000) {
    categories.push(TRADER_CATEGORIES['shark'])
  }

  // Volume King
  if ((stats.positionsCount || 0) >= 1000 || stats.volume >= 5_000_000) {
    categories.push(TRADER_CATEGORIES['volume-king'])
  }

  // Whale
  if (stats.volume >= 1_000_000 && !categories.find(c => c.id === 'shark')) {
    categories.push(TRADER_CATEGORIES['whale'])
  }

  // Crypto (top performer)
  if (stats.smartScore > 60 && stats.bestCategory?.toLowerCase().includes('crypto')) {
    categories.push(TRADER_CATEGORIES['crypto'])
  }

  // Sports (top performer)
  if (stats.smartScore > 60 && stats.bestCategory?.toLowerCase().includes('sport')) {
    categories.push(TRADER_CATEGORIES['sports'])
  }

  // Alpha Hunter
  if (stats.pnl > 100_000 && stats.smartScore > 70) {
    categories.push(TRADER_CATEGORIES['alpha-hunter'])
  }

  // High Win Rate
  if ((stats.winRate || 0) > 60) {
    categories.push(TRADER_CATEGORIES['high-winrate'])
  }

  // Consistent
  if (stats.pnl > 0 && stats.smartScore > 55 && (stats.tradesCount || 0) > 50) {
    categories.push(TRADER_CATEGORIES['consistent'])
  }

  // Rising Star -- genuinely new traders (low volume, few trades) who are already profitable
  if (
    stats.pnl > 10_000 &&
    stats.volume < 500_000 &&
    (stats.tradesCount || 0) < 200 &&
    stats.smartScore > 50
  ) {
    categories.push(TRADER_CATEGORIES['rising-star'])
  }

  // Medium Hold Time (simulated)
  if (stats.volume > 100_000 && stats.smartScore > 50) {
    categories.push(TRADER_CATEGORIES['medium-hold'])
  }

  // ---- Guarantee minimum 3 categories ----
  // If trader has fewer than 3, add fallback categories based on their stats
  if (categories.length < 3) {
    const existingIds = new Set(categories.map(c => c.id))

    // Fallback priority: pick the most relevant ones that haven't been added
    const fallbacks: { id: string; condition: boolean }[] = [
      { id: 'high-winrate', condition: (stats.winRate || 0) > 50 },
      { id: 'consistent', condition: stats.pnl > 0 },
      { id: 'medium-hold', condition: stats.volume > 50_000 },
      { id: 'whale', condition: stats.volume > 500_000 },
      { id: 'crypto', condition: stats.smartScore > 40 },
      { id: 'rising-star', condition: stats.pnl > 0 && (stats.tradesCount || 0) < 500 },
    ]

    for (const fb of fallbacks) {
      if (categories.length >= 3) break
      if (!existingIds.has(fb.id) && fb.condition && TRADER_CATEGORIES[fb.id]) {
        categories.push(TRADER_CATEGORIES[fb.id])
        existingIds.add(fb.id)
      }
    }
  }

  // ---- Top 1% performance: if smartScore > 90, add bestCategory if known ----
  if (stats.smartScore > 90 && stats.bestCategory) {
    const catKey = stats.bestCategory.toLowerCase()
    const existingIds = new Set(categories.map(c => c.id))
    if (catKey.includes('crypto') && !existingIds.has('crypto')) {
      categories.push(TRADER_CATEGORIES['crypto'])
    } else if (catKey.includes('sport') && !existingIds.has('sports')) {
      categories.push(TRADER_CATEGORIES['sports'])
    }
  }

  return categories.slice(0, 6) // Max 6 categories
}

// ============================================
// CATEGORY BADGE COMPONENT WITH TOOLTIP
// ============================================

interface CategoryBadgeProps {
  category: TraderCategory
  size?: 'sm' | 'md'
  className?: string
}

export function CategoryBadge({ category, size = 'sm', className }: CategoryBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const Icon = category.icon

  return (
    <div
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        className={cn(
          'inline-flex items-center gap-1.5 border bg-transparent rounded-full cursor-default transition-all',
          category.borderColor,
          'hover:bg-white/[0.03]',
          size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
        )}
      >
        {category.customIcon ? (
          <Image
            src={category.customIcon}
            alt=""
            width={size === 'sm' ? 20 : 24}
            height={size === 'sm' ? 20 : 24}
            className="opacity-90 flex-shrink-0"
          />
        ) : (
          <Icon className={cn(category.color, size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
        )}
        <span className="font-medium text-foreground/90">{category.label}</span>
      </span>

      {/* Tooltip - opens downward so it stays inside card bounds */}
      {showTooltip && (
        <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 w-52 bg-card border border-border/60 rounded-xl shadow-2xl shadow-black/50 p-3 pointer-events-none">
          {/* Arrow */}
          <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-card border-l border-t border-border/60 rotate-45" />

          <div className="relative">
            <div className="flex items-center gap-1.5 mb-1.5">
              {category.customIcon ? (
                <Image src={category.customIcon} alt="" width={20} height={20} className="opacity-90 flex-shrink-0" />
              ) : (
                <Icon className={cn('h-3.5 w-3.5', category.color)} />
              )}
              <span className={cn('text-xs font-semibold', category.color)}>{category.label}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {category.description}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// CATEGORIES ROW COMPONENT (with +N overflow)
// ============================================

interface CategoriesRowProps {
  categories: TraderCategory[]
  maxVisible?: number
  size?: 'sm' | 'md'
  className?: string
}

export function CategoriesRow({ categories, maxVisible = 3, size = 'sm', className }: CategoriesRowProps) {
  const [showOverflowTooltip, setShowOverflowTooltip] = useState(false)

  if (categories.length === 0) return null

  const visible = categories.slice(0, maxVisible)
  const overflow = categories.slice(maxVisible)

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {visible.map((cat) => (
        <CategoryBadge key={cat.id} category={cat} size={size} />
      ))}
      {overflow.length > 0 && (
        <div
          className="relative inline-flex"
          onMouseEnter={() => setShowOverflowTooltip(true)}
          onMouseLeave={() => setShowOverflowTooltip(false)}
        >
          <span
            className={cn(
              'inline-flex items-center border border-border/40 bg-transparent rounded-full cursor-default transition-all hover:bg-white/[0.03]',
              size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
            )}
          >
            <span className="font-medium text-muted-foreground">+{overflow.length}</span>
          </span>

          {/* Overflow tooltip showing hidden categories - opens downward */}
          {showOverflowTooltip && (
            <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 w-52 bg-card border border-border/60 rounded-xl shadow-2xl shadow-black/50 p-3 pointer-events-none">
              <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-card border-l border-t border-border/60 rotate-45" />
              <div className="relative space-y-2">
                {overflow.map((cat) => {
                  const CatIcon = cat.icon
                  return (
                    <div key={cat.id}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {cat.customIcon ? (
                          <Image src={cat.customIcon} alt="" width={18} height={18} className="opacity-90 flex-shrink-0" />
                        ) : (
                          <CatIcon className={cn('h-3 w-3', cat.color)} />
                        )}
                        <span className={cn('text-[11px] font-semibold', cat.color)}>{cat.label}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/70 leading-relaxed pl-[18px]">
                        {cat.description}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
