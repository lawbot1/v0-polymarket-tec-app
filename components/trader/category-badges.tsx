'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import {
  Crown,
  Zap,
  Activity,
  Gem,
  Flame,
  Shield,
  Trophy,
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
  customIcon?: string   // path to a custom PNG icon (for original categories)
  emoji?: string        // emoji icon (for market/search categories)
  color: string
  borderColor: string
}

export const TRADER_CATEGORIES: Record<string, TraderCategory> = {
  // ========== Original performance categories (with custom PNG icons) ==========
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
  'whale': {
    id: 'whale',
    label: 'Whale',
    description: 'Total volume exceeding $1M',
    icon: Crown,
    customIcon: '/icons/whale.png',
    color: 'text-[#60a5fa]',
    borderColor: 'border-[#60a5fa]/30',
  },
  'shark': {
    id: 'shark',
    label: 'Shark',
    description: 'Volume >$10M with portfolio >$100K',
    icon: Gem,
    customIcon: '/icons/shark.png',
    color: 'text-[#34d399]',
    borderColor: 'border-[#34d399]/30',
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
  // New general categories to fill gaps
  'diamond-hands': {
    id: 'diamond-hands',
    label: 'Diamond Hands',
    description: 'Holds positions through volatility with strong conviction',
    icon: Gem,
    customIcon: '/icons/diamond-hands.png',
    color: 'text-[#67e8f9]',
    borderColor: 'border-[#67e8f9]/30',
  },
  // ========== Market / search categories (with emojis) ==========
  'crypto': {
    id: 'crypto',
    label: 'Crypto',
    description: 'Top 1% performer in Crypto markets',
    icon: Activity,
    customIcon: '/icons/crypto.png',
    color: 'text-[#60a5fa]',
    borderColor: 'border-[#60a5fa]/30',
  },
  'sports': {
    id: 'sports',
    label: 'Sports',
    description: 'Top 1% performer in Sports markets',
    icon: Dumbbell,
    emoji: '\u{26BD}',
    color: 'text-[#f97316]',
    borderColor: 'border-[#f97316]/30',
  },
  'politics': {
    id: 'politics',
    label: 'Politics',
    description: 'Top 1% performer in Politics markets',
    icon: Crown,
    emoji: '\u{1F3DB}\u{FE0F}',
    color: 'text-[#818cf8]',
    borderColor: 'border-[#818cf8]/30',
  },
  'world': {
    id: 'world',
    label: 'World',
    description: 'Top 1% performer in World events markets',
    icon: Activity,
    emoji: '\u{1F30D}',
    color: 'text-[#34d399]',
    borderColor: 'border-[#34d399]/30',
  },
  'elections': {
    id: 'elections',
    label: 'Elections',
    description: 'Top 1% performer in Elections markets',
    icon: Activity,
    emoji: '\u{1F5F3}\u{FE0F}',
    color: 'text-[#f472b6]',
    borderColor: 'border-[#f472b6]/30',
  },
  'tech': {
    id: 'tech',
    label: 'Tech',
    description: 'Top 1% performer in Tech markets',
    icon: Activity,
    emoji: '\u{1F4BB}',
    color: 'text-[#38bdf8]',
    borderColor: 'border-[#38bdf8]/30',
  },
  'geopolitics': {
    id: 'geopolitics',
    label: 'Geopolitics',
    description: 'Top 1% performer in Geopolitics markets',
    icon: Activity,
    emoji: '\u{1F310}',
    color: 'text-[#a78bfa]',
    borderColor: 'border-[#a78bfa]/30',
  },
  'economy': {
    id: 'economy',
    label: 'Economy',
    description: 'Top 1% performer in Economy markets',
    icon: Activity,
    emoji: '\u{1F4CA}',
    color: 'text-[#fbbf24]',
    borderColor: 'border-[#fbbf24]/30',
  },
  'pop-culture': {
    id: 'pop-culture',
    label: 'Pop Culture',
    description: 'Top 1% performer in Pop Culture markets',
    icon: Activity,
    emoji: '\u{1F3AC}',
    color: 'text-[#f472b6]',
    borderColor: 'border-[#f472b6]/30',
  },
  'earnings': {
    id: 'earnings',
    label: 'Earnings',
    description: 'Top 1% performer in Earnings markets',
    icon: Activity,
    emoji: '\u{1F4B9}',
    color: 'text-[#22c55e]',
    borderColor: 'border-[#22c55e]/30',
  },
  'trump': {
    id: 'trump',
    label: 'Trump',
    description: 'Top 1% performer in Trump markets',
    icon: Activity,
    emoji: '\u{1F1FA}\u{1F1F8}',
    color: 'text-[#ef4444]',
    borderColor: 'border-[#ef4444]/30',
  },
}

// Map from UI search category name -> category id
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
  'earnings': 'earnings',
  'trump': 'trump',
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
  activeMarketCategory?: string // currently selected UI market filter
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

  // Diamond Hands -- holds through volatility, large volume relative to trades
  if (stats.volume > 500_000 && (stats.tradesCount || 0) < 100 && stats.pnl > 0) {
    categories.push(TRADER_CATEGORIES['diamond-hands'])
  }

  // ---- Active market category: if user filtered by a market, assign it ----
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

  // ---- Top 1% performance: smartScore > 85 -> add best market category ----
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

  // ---- Guarantee minimum 4 categories ----
  const MIN_CATEGORIES = 4
  if (categories.length < MIN_CATEGORIES) {
    const existingIds = new Set(categories.map(c => c.id))
    const fallbacks: { id: string; condition: boolean }[] = [
      { id: 'consistent', condition: stats.pnl > 0 },
      { id: 'diamond-hands', condition: stats.volume > 200_000 },
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

function CategoryIcon({ category, size }: { category: TraderCategory; size: 'sm' | 'md' }) {
  const imgSize = size === 'sm' ? 20 : 24

  // Emoji -- market categories
  if (category.emoji) {
    return (
      <span className={cn('leading-none flex-shrink-0', size === 'sm' ? 'text-lg' : 'text-xl')}>
        {category.emoji}
      </span>
    )
  }
  // Custom PNG icon
  if (category.customIcon) {
  const isElite = category.id === 'elite-profit'
  const pngSize = isElite ? imgSize * 2 : imgSize
  return (
  <span
    className="inline-flex items-center justify-center flex-shrink-0"
    style={{ width: imgSize, height: imgSize, overflow: 'visible' }}
  >
    <Image
      src={category.customIcon}
      alt=""
      width={pngSize}
      height={pngSize}
      className="opacity-90"
      style={isElite ? { transform: 'scale(2)', transformOrigin: 'center' } : undefined}
    />
  </span>
  )
  }
  // Fallback: Lucide icon
  const Icon = category.icon
  return <Icon className={cn(category.color, size === 'sm' ? 'h-5 w-5' : 'h-6 w-6', 'flex-shrink-0 -my-1')} />
}

export function CategoryBadge({ category, size = 'sm', className }: CategoryBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div
      className={cn('relative inline-flex flex-shrink-0', className)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        className={cn(
          'inline-flex items-center gap-1.5 border bg-transparent rounded-full cursor-default transition-all whitespace-nowrap overflow-visible',
          category.borderColor,
          'hover:bg-white/[0.03]',
          size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
        )}
      >
        <CategoryIcon category={category} size={size} />
        <span className="font-medium text-foreground/90">{category.label}</span>
      </span>

      {showTooltip && (
        <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 w-52 bg-card border border-border/60 rounded-xl shadow-2xl shadow-black/50 p-3 pointer-events-none">
          <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-card border-l border-t border-border/60 rotate-45" />
          <div className="relative">
            <div className="flex items-center gap-1.5 mb-1.5">
              <CategoryIcon category={category} size="md" />
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
// CATEGORIES ROW COMPONENT (single line, no wrap)
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
    <div className={cn('flex items-center gap-1.5 overflow-visible', className)}>
      {visible.map((cat) => (
        <CategoryBadge key={cat.id} category={cat} size={size} />
      ))}
      {overflow.length > 0 && (
        <div
          className="relative inline-flex flex-shrink-0"
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

          {showOverflowTooltip && (
            <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 w-52 bg-card border border-border/60 rounded-xl shadow-2xl shadow-black/50 p-3 pointer-events-none">
              <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-card border-l border-t border-border/60 rotate-45" />
              <div className="relative space-y-2">
                {overflow.map((cat) => (
                  <div key={cat.id}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <CategoryIcon category={cat} size="sm" />
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
