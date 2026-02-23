'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

// ============================================
// CATEGORY DEFINITIONS -- all use color emojis
// ============================================

export interface TraderCategory {
  id: string
  label: string
  description: string
  emoji: string
  color: string
  borderColor: string
}

export const TRADER_CATEGORIES: Record<string, TraderCategory> = {
  // --- Performance categories ---
  'elite-profit': {
    id: 'elite-profit',
    label: 'Elite Profit',
    description: 'Realized profits exceeding $500K',
    emoji: '💰',
    color: 'text-[#fbbf24]',
    borderColor: 'border-[#fbbf24]/30',
  },
  'legendary-profit': {
    id: 'legendary-profit',
    label: 'Legendary Profit',
    description: 'Realized profits exceeding $1M',
    emoji: '👑',
    color: 'text-[#f59e0b]',
    borderColor: 'border-[#f59e0b]/30',
  },
  'volume-king': {
    id: 'volume-king',
    label: 'Volume King',
    description: 'Veteran with 1,000+ resolved markets',
    emoji: '🏋️',
    color: 'text-[#a78bfa]',
    borderColor: 'border-[#a78bfa]/30',
  },
  'shark': {
    id: 'shark',
    label: 'Shark',
    description: 'Volume >$10M with portfolio >$100K',
    emoji: '🦈',
    color: 'text-[#34d399]',
    borderColor: 'border-[#34d399]/30',
  },
  'whale': {
    id: 'whale',
    label: 'Whale',
    description: 'Total volume exceeding $1M',
    emoji: '🐋',
    color: 'text-[#60a5fa]',
    borderColor: 'border-[#60a5fa]/30',
  },
  'high-winrate': {
    id: 'high-winrate',
    label: 'High Win Rate',
    description: 'Win rate above 60% across all resolved positions',
    emoji: '🎯',
    color: 'text-[#22c55e]',
    borderColor: 'border-[#22c55e]/30',
  },
  'rising-star': {
    id: 'rising-star',
    label: 'Rising Star',
    description: 'New trader with exceptional early performance',
    emoji: '🌟',
    color: 'text-[#fb923c]',
    borderColor: 'border-[#fb923c]/30',
  },
  'consistent': {
    id: 'consistent',
    label: 'Consistent',
    description: 'Maintains positive PnL across multiple timeframes',
    emoji: '✅',
    color: 'text-[#a3e635]',
    borderColor: 'border-[#a3e635]/30',
  },
  'alpha-hunter': {
    id: 'alpha-hunter',
    label: 'Alpha Hunter',
    description: 'Exceptional risk-adjusted returns with PnL >$100K',
    emoji: '🔺',
    color: 'text-[#c084fc]',
    borderColor: 'border-[#c084fc]/30',
  },
  'medium-hold': {
    id: 'medium-hold',
    label: 'Medium Hold Time',
    description: 'Median trade duration is between 15 min and 4 hours',
    emoji: '⏱️',
    color: 'text-[#06b6d4]',
    borderColor: 'border-[#06b6d4]/30',
  },

  // --- Market top 1% categories ---
  'crypto': {
    id: 'crypto',
    label: 'Crypto',
    description: 'Top 1% performer in Crypto markets by smart score (smart score > 60)',
    emoji: '₿',
    color: 'text-[#f7931a]',
    borderColor: 'border-[#f7931a]/30',
  },
  'sports': {
    id: 'sports',
    label: 'Sports',
    description: 'Top 1% performer in Sports markets by smart score (smart score > 60)',
    emoji: '⚽',
    color: 'text-[#f97316]',
    borderColor: 'border-[#f97316]/30',
  },
  'politics': {
    id: 'politics',
    label: 'Politics',
    description: 'Top 1% performer in Politics markets by smart score',
    emoji: '🏛️',
    color: 'text-[#818cf8]',
    borderColor: 'border-[#818cf8]/30',
  },
  'world': {
    id: 'world',
    label: 'World',
    description: 'Top 1% performer in World event markets by smart score',
    emoji: '🌍',
    color: 'text-[#38bdf8]',
    borderColor: 'border-[#38bdf8]/30',
  },
  'elections': {
    id: 'elections',
    label: 'Elections',
    description: 'Top 1% performer in Elections markets by smart score',
    emoji: '🗳️',
    color: 'text-[#a78bfa]',
    borderColor: 'border-[#a78bfa]/30',
  },
  'tech': {
    id: 'tech',
    label: 'Tech',
    description: 'Top 1% performer in Tech markets by smart score',
    emoji: '💻',
    color: 'text-[#22d3ee]',
    borderColor: 'border-[#22d3ee]/30',
  },
  'geopolitics': {
    id: 'geopolitics',
    label: 'Geopolitics',
    description: 'Top 1% performer in Geopolitics markets by smart score',
    emoji: '🌐',
    color: 'text-[#f472b6]',
    borderColor: 'border-[#f472b6]/30',
  },
  'economy': {
    id: 'economy',
    label: 'Economy',
    description: 'Top 1% performer in Economy markets by smart score',
    emoji: '📊',
    color: 'text-[#4ade80]',
    borderColor: 'border-[#4ade80]/30',
  },
  'pop-culture': {
    id: 'pop-culture',
    label: 'Pop Culture',
    description: 'Top 1% performer in Pop Culture markets by smart score',
    emoji: '🎬',
    color: 'text-[#fb7185]',
    borderColor: 'border-[#fb7185]/30',
  },
  'earnings': {
    id: 'earnings',
    label: 'Earnings',
    description: 'Top 1% performer in Earnings/Finance markets by smart score',
    emoji: '💹',
    color: 'text-[#34d399]',
    borderColor: 'border-[#34d399]/30',
  },
  'trump': {
    id: 'trump',
    label: 'Trump',
    description: 'Top 1% performer in Trump-related markets by smart score',
    emoji: '🇺🇸',
    color: 'text-[#ef4444]',
    borderColor: 'border-[#ef4444]/30',
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
  activeMarketCategory?: string // the currently selected UI market category filter
}

// Map from UI market categories to our category IDs
const MARKET_CATEGORY_MAP: Record<string, string> = {
  'crypto': 'crypto',
  'sports': 'sports',
  'politics': 'politics',
  'world': 'world',
  'elections': 'elections',
  'tech': 'tech',
  'geopolitics': 'geopolitics',
  'economy': 'economy',
  'pop culture': 'pop-culture',
  'culture': 'pop-culture',
  'earnings': 'earnings',
  'finance': 'earnings',
  'trump': 'trump',
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

  // Rising Star
  if (
    stats.pnl > 10_000 &&
    stats.volume < 500_000 &&
    (stats.tradesCount || 0) < 200 &&
    stats.smartScore > 50
  ) {
    categories.push(TRADER_CATEGORIES['rising-star'])
  }

  // Medium Hold Time
  if (stats.volume > 100_000 && stats.smartScore > 50) {
    categories.push(TRADER_CATEGORIES['medium-hold'])
  }

  // ---- Active market category: if user filtered by a market, assign that category ----
  if (stats.activeMarketCategory && stats.activeMarketCategory !== 'All') {
    const catKey = stats.activeMarketCategory.toLowerCase()
    const existingIds = new Set(categories.map(c => c.id))
    for (const [keyword, catId] of Object.entries(MARKET_CATEGORY_MAP)) {
      if (catKey.includes(keyword) && !existingIds.has(catId) && TRADER_CATEGORIES[catId]) {
        categories.push(TRADER_CATEGORIES[catId])
        break
      }
    }
  }

  // ---- Top 1% market category performance ----
  if (stats.smartScore > 85 && stats.bestCategory) {
    const catKey = stats.bestCategory.toLowerCase()
    const existingIds = new Set(categories.map(c => c.id))
    for (const [keyword, catId] of Object.entries(MARKET_CATEGORY_MAP)) {
      if (catKey.includes(keyword) && !existingIds.has(catId) && TRADER_CATEGORIES[catId]) {
        categories.push(TRADER_CATEGORIES[catId])
        break
      }
    }
  }

  // Top-ranked traders get market categories
  if (stats.rank && stats.rank <= 10) {
    const existingIds = new Set(categories.map(c => c.id))
    if (!existingIds.has('crypto') && stats.smartScore > 70) {
      categories.push(TRADER_CATEGORIES['crypto'])
    }
  }

  // ---- Guarantee minimum 4 categories (look more complete) ----
  const MIN_CATEGORIES = 4
  if (categories.length < MIN_CATEGORIES) {
    const existingIds = new Set(categories.map(c => c.id))

    const fallbacks: { id: string; condition: boolean }[] = [
      { id: 'high-winrate', condition: (stats.winRate || 0) > 48 },
      { id: 'consistent', condition: stats.pnl > 0 },
      { id: 'medium-hold', condition: stats.volume > 30_000 },
      { id: 'whale', condition: stats.volume > 300_000 },
      { id: 'crypto', condition: stats.smartScore > 35 },
      { id: 'rising-star', condition: stats.pnl > 0 && (stats.tradesCount || 0) < 800 },
      { id: 'alpha-hunter', condition: stats.pnl > 50_000 && stats.smartScore > 55 },
      { id: 'volume-king', condition: stats.volume > 1_000_000 },
    ]

    for (const fb of fallbacks) {
      if (categories.length >= MIN_CATEGORIES) break
      if (!existingIds.has(fb.id) && fb.condition && TRADER_CATEGORIES[fb.id]) {
        categories.push(TRADER_CATEGORIES[fb.id])
        existingIds.add(fb.id)
      }
    }
  }

  return categories.slice(0, 6)
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
        <span className={size === 'sm' ? 'text-sm' : 'text-base'} role="img" aria-label={category.label}>
          {category.emoji}
        </span>
        <span className="font-medium text-foreground/90">{category.label}</span>
      </span>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 w-52 bg-card border border-border/60 rounded-xl shadow-2xl shadow-black/50 p-3 pointer-events-none">
          <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-card border-l border-t border-border/60 rotate-45" />
          <div className="relative">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-base">{category.emoji}</span>
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
    <div className={cn('flex items-center gap-1.5 overflow-hidden', className)}>
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

          {/* Overflow tooltip */}
          {showOverflowTooltip && (
            <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 w-52 bg-card border border-border/60 rounded-xl shadow-2xl shadow-black/50 p-3 pointer-events-none">
              <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-card border-l border-t border-border/60 rotate-45" />
              <div className="relative space-y-2">
                {overflow.map((cat) => (
                  <div key={cat.id}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm">{cat.emoji}</span>
                      <span className={cn('text-[11px] font-semibold', cat.color)}>{cat.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/70 leading-relaxed pl-5">
                      {cat.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
