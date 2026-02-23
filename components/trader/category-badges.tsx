'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
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
  BarChart3,
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
  color: string
  bgColor: string
  borderColor: string
}

export const TRADER_CATEGORIES: Record<string, TraderCategory> = {
  'elite-profit': {
    id: 'elite-profit',
    label: 'Elite Profit',
    description: 'Realized profits exceeding $500K',
    icon: Trophy,
    color: 'text-[#fbbf24]',
    bgColor: 'bg-[#fbbf24]/10',
    borderColor: 'border-[#fbbf24]/30',
  },
  'legendary-profit': {
    id: 'legendary-profit',
    label: 'Legendary Profit',
    description: 'Realized profits exceeding $1M',
    icon: Crown,
    color: 'text-[#f59e0b]',
    bgColor: 'bg-[#f59e0b]/10',
    borderColor: 'border-[#f59e0b]/30',
  },
  'volume-king': {
    id: 'volume-king',
    label: 'Volume King',
    description: 'Veteran with 1,000+ resolved markets',
    icon: Zap,
    color: 'text-[#a78bfa]',
    bgColor: 'bg-[#a78bfa]/10',
    borderColor: 'border-[#a78bfa]/30',
  },
  'crypto': {
    id: 'crypto',
    label: 'Crypto',
    description: 'Top 1% performer in Crypto markets by smart score (smart score > 60)',
    icon: Activity,
    color: 'text-[#60a5fa]',
    bgColor: 'bg-[#60a5fa]/10',
    borderColor: 'border-[#60a5fa]/30',
  },
  'shark': {
    id: 'shark',
    label: 'Shark',
    description: 'Volume >$10M with portfolio >$100K',
    icon: Gem,
    color: 'text-[#34d399]',
    bgColor: 'bg-[#34d399]/10',
    borderColor: 'border-[#34d399]/30',
  },
  'sports': {
    id: 'sports',
    label: 'Sports',
    description: 'Top 1% performer in Sports markets by smart score (smart score > 60)',
    icon: Dumbbell,
    color: 'text-[#f97316]',
    bgColor: 'bg-[#f97316]/10',
    borderColor: 'border-[#f97316]/30',
  },
  'medium-hold': {
    id: 'medium-hold',
    label: 'Medium Hold Time',
    description: 'Median trade duration is between 15 min and 4 hours',
    icon: Clock,
    color: 'text-[#06b6d4]',
    bgColor: 'bg-[#06b6d4]/10',
    borderColor: 'border-[#06b6d4]/30',
  },
  'whale': {
    id: 'whale',
    label: 'Whale',
    description: 'Total volume exceeding $1M',
    icon: Crown,
    color: 'text-[#60a5fa]',
    bgColor: 'bg-[#60a5fa]/10',
    borderColor: 'border-[#60a5fa]/30',
  },
  'high-winrate': {
    id: 'high-winrate',
    label: 'High Win Rate',
    description: 'Win rate above 60% across all resolved positions',
    icon: Target,
    color: 'text-[#22c55e]',
    bgColor: 'bg-[#22c55e]/10',
    borderColor: 'border-[#22c55e]/30',
  },
  'rising-star': {
    id: 'rising-star',
    label: 'Rising Star',
    description: 'New trader with exceptional early performance',
    icon: Flame,
    color: 'text-[#fb923c]',
    bgColor: 'bg-[#fb923c]/10',
    borderColor: 'border-[#fb923c]/30',
  },
  'consistent': {
    id: 'consistent',
    label: 'Consistent',
    description: 'Maintains positive PnL across multiple timeframes',
    icon: Shield,
    color: 'text-[#a3e635]',
    bgColor: 'bg-[#a3e635]/10',
    borderColor: 'border-[#a3e635]/30',
  },
  'alpha-hunter': {
    id: 'alpha-hunter',
    label: 'Alpha Hunter',
    description: 'Exceptional risk-adjusted returns with PnL >$100K',
    icon: TrendingUp,
    color: 'text-[#c084fc]',
    bgColor: 'bg-[#c084fc]/10',
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

  // Rising Star
  if (stats.rank && stats.rank <= 50 && (stats.tradesCount || 0) < 100 && stats.pnl > 0) {
    categories.push(TRADER_CATEGORIES['rising-star'])
  }

  return categories.slice(0, 4) // Max 4 categories
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
          'inline-flex items-center gap-1 border rounded-md cursor-default transition-all',
          category.bgColor,
          category.borderColor,
          size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]',
        )}
      >
        <Icon className={cn(category.color, size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
        <span className={cn('font-medium', category.color)}>{category.label}</span>
      </span>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-card border border-border rounded-lg shadow-xl p-2.5 pointer-events-none">
          {/* Arrow */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-card border-r border-b border-border rotate-45" />
          
          <div className="relative">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className={cn('h-3.5 w-3.5', category.color)} />
              <span className={cn('text-xs font-semibold', category.color)}>{category.label}</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {category.description}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// CATEGORIES ROW COMPONENT
// ============================================

interface CategoriesRowProps {
  categories: TraderCategory[]
  size?: 'sm' | 'md'
  className?: string
}

export function CategoriesRow({ categories, size = 'sm', className }: CategoriesRowProps) {
  if (categories.length === 0) return null
  
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {categories.map((cat) => (
        <CategoryBadge key={cat.id} category={cat} size={size} />
      ))}
    </div>
  )
}
