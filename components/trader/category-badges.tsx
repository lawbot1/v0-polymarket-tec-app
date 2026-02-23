'use client'

import { useState, useRef, useEffect } from 'react'
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
    emoji: '\u{1F4B0}',
    color: 'text-[#fbbf24]',
    borderColor: 'border-[#fbbf24]/30',
  },
  'legendary-profit': {
    id: 'legendary-profit',
    label: 'Legendary Profit',
    description: 'Realized profits exceeding $1M',
    emoji: '\u{1F451}',
    color: 'text-[#f59e0b]',
    borderColor: 'border-[#f59e0b]/30',
  },
  'volume-king': {
    id: 'volume-king',
    label: 'Volume King',
    description: 'Veteran with 1,000+ resolved markets',
    emoji: '\u{1F3CB}\uFE0F',
    color: 'text-[#a78bfa]',
    borderColor: 'border-[#a78bfa]/30',
  },
  'shark': {
    id: 'shark',
    label: 'Shark',
    description: 'Volume >$10M with portfolio >$100K',
    emoji: '\u{1F988}',
    color: 'text-[#34d399]',
    borderColor: 'border-[#34d399]/30',
  },
  'whale': {
    id: 'whale',
    label: 'Whale',
    description: 'Volume >$10M with portfolio >$1M',
    emoji: '\u{1F40B}',
    color: 'text-[#60a5fa]',
    borderColor: 'border-[#60a5fa]/30',
  },
  'low-hold': {
    id: 'low-hold',
    label: 'Low Hold Time',
    description: 'Median trade duration is less than 15 minutes',
    emoji: '\u26A1',
    color: 'text-[#facc15]',
    borderColor: 'border-[#facc15]/30',
  },
  'medium-hold': {
    id: 'medium-hold',
    label: 'Medium Hold Time',
    description: 'Median trade duration is between 15 min and 4 hours',
    emoji: '\u23F1\uFE0F',
    color: 'text-[#06b6d4]',
    borderColor: 'border-[#06b6d4]/30',
  },
  'high-hold': {
    id: 'high-hold',
    label: 'High Hold Time',
    description: 'Median trade duration is greater than 4 hours',
    emoji: '\u{1F9CA}',
    color: 'text-[#8b5cf6]',
    borderColor: 'border-[#8b5cf6]/30',
  },

  // --- Market top 1% categories ---
  'crypto': {
    id: 'crypto',
    label: 'Crypto',
    description: 'Top 1% performer in Crypto markets by smart score',
    emoji: '\u20BF',
    color: 'text-[#f7931a]',
    borderColor: 'border-[#f7931a]/30',
  },
  'sports': {
    id: 'sports',
    label: 'Sports',
    description: 'Top 1% performer in Sports markets by smart score',
    emoji: '\u26BD',
    color: 'text-[#f97316]',
    borderColor: 'border-[#f97316]/30',
  },
  'politics': {
    id: 'politics',
    label: 'Politics',
    description: 'Top 1% performer in Politics markets by smart score',
    emoji: '\u{1F3DB}\uFE0F',
    color: 'text-[#818cf8]',
    borderColor: 'border-[#818cf8]/30',
  },
  'world': {
    id: 'world',
    label: 'World',
    description: 'Top 1% performer in World event markets by smart score',
    emoji: '\u{1F30D}',
    color: 'text-[#38bdf8]',
    borderColor: 'border-[#38bdf8]/30',
  },
  'elections': {
    id: 'elections',
    label: 'Elections',
    description: 'Top 1% performer in Elections markets by smart score',
    emoji: '\u{1F5F3}\uFE0F',
    color: 'text-[#a78bfa]',
    borderColor: 'border-[#a78bfa]/30',
  },
  'tech': {
    id: 'tech',
    label: 'Tech',
    description: 'Top 1% performer in Tech markets by smart score',
    emoji: '\u{1F4BB}',
    color: 'text-[#22d3ee]',
    borderColor: 'border-[#22d3ee]/30',
  },
  'geopolitics': {
    id: 'geopolitics',
    label: 'Geopolitics',
    description: 'Top 1% performer in Geopolitics markets by smart score',
    emoji: '\u{1F310}',
    color: 'text-[#f472b6]',
    borderColor: 'border-[#f472b6]/30',
  },
  'economy': {
    id: 'economy',
    label: 'Economy',
    description: 'Top 1% performer in Economy markets by smart score',
    emoji: '\u{1F4CA}',
    color: 'text-[#4ade80]',
    borderColor: 'border-[#4ade80]/30',
  },
  'pop-culture': {
    id: 'pop-culture',
    label: 'Pop Culture',
    description: 'Top 1% performer in Pop Culture markets by smart score',
    emoji: '\u{1F3AC}',
    color: 'text-[#fb7185]',
    borderColor: 'border-[#fb7185]/30',
  },
  'earnings': {
    id: 'earnings',
    label: 'Earnings',
    description: 'Top 1% performer in Earnings/Finance markets by smart score',
    emoji: '\u{1F4B9}',
    color: 'text-[#34d399]',
    borderColor: 'border-[#34d399]/30',
  },
  'trump': {
    id: 'trump',
    label: 'Trump',
    description: 'Top 1% performer in Trump-related markets by smart score',
    emoji: '\u{1F1FA}\u{1F1F8}',
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
  activeMarketCategory?: string
}

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

  // Legendary Profit (PnL >= $1M)
  if (stats.pnl >= 1_000_000) {
    categories.push(TRADER_CATEGORIES['legendary-profit'])
  }
  // Elite Profit (PnL >= $500K)
  else if (stats.pnl >= 500_000) {
    categories.push(TRADER_CATEGORIES['elite-profit'])
  }

  // Shark (Volume >$10M + PnL >$100K)
  if (stats.volume > 10_000_000 && stats.pnl > 100_000) {
    categories.push(TRADER_CATEGORIES['shark'])
  }

  // Whale (Volume >$10M + PnL >$1M) -- separate tier from Shark
  if (stats.volume > 10_000_000 && stats.pnl > 1_000_000) {
    if (!categories.find(c => c.id === 'whale')) {
      categories.push(TRADER_CATEGORIES['whale'])
    }
  }

  // Volume King (1000+ positions or volume >= $5M)
  if ((stats.positionsCount || 0) >= 1000 || stats.volume >= 5_000_000) {
    categories.push(TRADER_CATEGORIES['volume-king'])
  }

  // Hold Time categories -- simulate based on volume and trade patterns
  const trades = stats.tradesCount || 0
  const avgTradeSize = trades > 0 ? stats.volume / trades : 0
  if (trades > 50) {
    if (avgTradeSize < 500) {
      // Small rapid trades = Low Hold Time (scalper)
      categories.push(TRADER_CATEGORIES['low-hold'])
    } else if (avgTradeSize >= 500 && avgTradeSize < 5000) {
      // Medium trades = Medium Hold Time
      categories.push(TRADER_CATEGORIES['medium-hold'])
    } else {
      // Large trades = High Hold Time (patient holder)
      categories.push(TRADER_CATEGORIES['high-hold'])
    }
  }

  // ---- Active market category: if user filtered by a market, assign that badge ----
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

  // Top-ranked traders likely excel in crypto
  if (stats.rank && stats.rank <= 10) {
    const existingIds = new Set(categories.map(c => c.id))
    if (!existingIds.has('crypto') && stats.smartScore > 70) {
      categories.push(TRADER_CATEGORIES['crypto'])
    }
  }

  // ---- Guarantee minimum 3 categories ----
  const MIN_CATEGORIES = 3
  if (categories.length < MIN_CATEGORIES) {
    const existingIds = new Set(categories.map(c => c.id))

    const fallbacks: { id: string; condition: boolean }[] = [
      { id: 'medium-hold', condition: trades > 20 },
      { id: 'whale', condition: stats.volume > 500_000 },
      { id: 'crypto', condition: stats.smartScore > 35 },
      { id: 'volume-king', condition: stats.volume > 1_000_000 },
      { id: 'low-hold', condition: trades > 100 },
      { id: 'elite-profit', condition: stats.pnl > 200_000 },
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
// CATEGORY BADGE WITH TOOLTIP INSIDE PARENT
// ============================================

interface CategoryBadgeProps {
  category: TraderCategory
  size?: 'sm' | 'md'
  className?: string
}

export function CategoryBadge({ category, size = 'sm', className }: CategoryBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const badgeRef = useRef<HTMLDivElement>(null)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    if (!showTooltip || !badgeRef.current) return

    const badge = badgeRef.current
    // Find the closest card parent to keep tooltip inside it
    const card = badge.closest('[data-trader-card]') as HTMLElement | null
    if (!card) return

    const badgeRect = badge.getBoundingClientRect()
    const cardRect = card.getBoundingClientRect()

    // Position tooltip above the badge by default
    let top = badgeRect.top - cardRect.top - 8
    let left = badgeRect.left - cardRect.left + badgeRect.width / 2 - 104 // 104 = half of w-52 (208px)
    let positionBelow = false

    // If tooltip would go above the card, show below
    if (top < 60) {
      top = badgeRect.bottom - cardRect.top + 8
      positionBelow = true
    }

    // Clamp horizontal position
    if (left < 4) left = 4
    if (left + 208 > cardRect.width - 4) left = cardRect.width - 212

    setTooltipStyle({
      position: 'absolute',
      top: positionBelow ? top : 'auto',
      bottom: positionBelow ? 'auto' : cardRect.height - top,
      left,
      zIndex: 50,
    })
  }, [showTooltip])

  return (
    <div
      ref={badgeRef}
      className={cn('relative inline-flex flex-shrink-0', className)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        className={cn(
          'inline-flex items-center gap-1.5 border bg-transparent rounded-full cursor-default transition-all whitespace-nowrap',
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

      {/* Tooltip -- positioned inside trader card */}
      {showTooltip && (
        <div
          style={tooltipStyle}
          className="w-52 bg-card border border-border/60 rounded-xl shadow-2xl shadow-black/50 p-3 pointer-events-none"
        >
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
// CATEGORIES ROW (with +N overflow)
// ============================================

interface CategoriesRowProps {
  categories: TraderCategory[]
  maxVisible?: number
  size?: 'sm' | 'md'
  className?: string
}

export function CategoriesRow({ categories, maxVisible = 3, size = 'sm', className }: CategoriesRowProps) {
  const [showOverflowTooltip, setShowOverflowTooltip] = useState(false)
  const overflowRef = useRef<HTMLDivElement>(null)
  const [overflowStyle, setOverflowStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    if (!showOverflowTooltip || !overflowRef.current) return

    const el = overflowRef.current
    const card = el.closest('[data-trader-card]') as HTMLElement | null
    if (!card) return

    const elRect = el.getBoundingClientRect()
    const cardRect = card.getBoundingClientRect()

    let top = elRect.top - cardRect.top - 8
    let left = elRect.left - cardRect.left + elRect.width / 2 - 104
    let positionBelow = false

    if (top < 60) {
      top = elRect.bottom - cardRect.top + 8
      positionBelow = true
    }

    if (left < 4) left = 4
    if (left + 208 > cardRect.width - 4) left = cardRect.width - 212

    setOverflowStyle({
      position: 'absolute',
      top: positionBelow ? top : 'auto',
      bottom: positionBelow ? 'auto' : cardRect.height - top,
      left,
      zIndex: 50,
    })
  }, [showOverflowTooltip])

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
          ref={overflowRef}
          className="relative inline-flex flex-shrink-0"
          onMouseEnter={() => setShowOverflowTooltip(true)}
          onMouseLeave={() => setShowOverflowTooltip(false)}
        >
          <span
            className={cn(
              'inline-flex items-center border border-border/40 bg-transparent rounded-full cursor-default transition-all hover:bg-white/[0.03] whitespace-nowrap',
              size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
            )}
          >
            <span className="font-medium text-muted-foreground">+{overflow.length}</span>
          </span>

          {/* Overflow tooltip -- positioned inside trader card */}
          {showOverflowTooltip && (
            <div
              style={overflowStyle}
              className="w-52 bg-card border border-border/60 rounded-xl shadow-2xl shadow-black/50 p-3 pointer-events-none"
            >
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
