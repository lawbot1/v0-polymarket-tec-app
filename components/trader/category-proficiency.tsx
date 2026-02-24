'use client'

import React, { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
// Custom SVG radar -- no recharts dependency for this chart

// ---- Polymarket market categories with emojis ----
const MARKET_CATEGORIES = [
  { key: 'Crypto', emoji: '\u20BF' },
  { key: 'Pop Culture', emoji: '\uD83C\uDFAC' },
  { key: 'World', emoji: '\uD83C\uDF0D' },
  { key: 'Trump', emoji: '\uD83C\uDDFA\uD83C\uDDF8' },
  { key: 'Tech', emoji: '\uD83D\uDCBB' },
  { key: 'Sports', emoji: '\u26BD' },
  { key: 'Politics', emoji: '\uD83C\uDFDB\uFE0F' },
  { key: 'Earnings', emoji: '\uD83D\uDCC8' },
  { key: 'Economy', emoji: '\uD83D\uDCCA' },
  { key: 'Geopolitics', emoji: '\uD83C\uDF10' },
  { key: 'Elections', emoji: '\uD83D\uDDF3\uFE0F' },
] as const

interface CategoryStats {
  name: string
  emoji: string
  smartScore: number
  riskEfficiency: number
  profitability: number
  pnl: number
  winRate: number
  volume: number
  sharpe: number
  sortino: number
  trades: number
}

interface CategoryProficiencyProps {
  positions: Array<{
    eventSlug?: string
    cashPnl?: number
    currentValue?: number
    size?: number
    avgPrice?: number
    curPrice?: number
    outcome?: string
  }>
  trades: Array<{
    timestamp: string | number
    side: string
    size: number
    price: number
    eventSlug?: string
    conditionId?: string
  }>
  profile: {
    pnl: number
    vol: number
  } | null
  slugToCategory: Record<string, string>
}

// ---- Custom SVG Radar Polygon (no library) ----
function CustomRadar({ data }: { data: { category: string; score: number }[] }) {
  const size = 340
  const cx = size / 2
  const cy = size / 2
  const maxRadius = size * 0.42 // outer edge -- almost touching labels
  const minRadius = 8 // minimum so zero scores still show a tiny bump
  const labelPad = 14 // gap between max vertex and label
  const n = data.length

  // Compute vertex positions for each data point
  const vertices = data.map((d, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2 // start from top
    const r = minRadius + ((d.score / 100) * (maxRadius - minRadius))
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      labelX: cx + (maxRadius + labelPad) * Math.cos(angle),
      labelY: cy + (maxRadius + labelPad) * Math.sin(angle),
      label: d.category,
      score: d.score,
    }
  })

  const polygonPoints = vertices.map(v => `${v.x},${v.y}`).join(' ')

  return (
    <div className="flex items-center justify-center" style={{ height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Polygon filled area */}
        <polygon
          points={polygonPoints}
          fill="rgba(163, 230, 53, 0.18)"
          stroke="rgba(163, 230, 53, 0.7)"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />

        {/* Dots at each vertex */}
        {vertices.map((v, i) => (
          <circle
            key={i}
            cx={v.x}
            cy={v.y}
            r={v.score > 0 ? 4.5 : 2.5}
            fill={v.score > 0 ? 'rgba(163, 230, 53, 0.9)' : 'rgba(255,255,255,0.15)'}
            stroke={v.score > 0 ? 'rgba(163, 230, 53, 1)' : 'rgba(255,255,255,0.1)'}
            strokeWidth={1}
          />
        ))}

        {/* Category labels around the polygon */}
        {vertices.map((v, i) => (
          <text
            key={i}
            x={v.labelX}
            y={v.labelY}
            textAnchor="middle"
            dominantBaseline="central"
            fill={v.score > 0 ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.2)'}
            fontSize={10}
            fontWeight={500}
          >
            {v.label}
          </text>
        ))}
      </svg>
    </div>
  )
}

export function CategoryProficiency({ positions, trades, profile, slugToCategory }: CategoryProficiencyProps) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null)

  // Compute per-category stats from positions and trades
  const categoryStats = useMemo<CategoryStats[]>(() => {
    if (!profile) return []

    const catPositions = new Map<string, typeof positions>()
    const catTrades = new Map<string, typeof trades>()

    positions.forEach(p => {
      const slug = p.eventSlug?.split('-')[0]?.toLowerCase() || 'other'
      const cat = slugToCategory[slug] || slug.charAt(0).toUpperCase() + slug.slice(1)
      if (!catPositions.has(cat)) catPositions.set(cat, [])
      catPositions.get(cat)!.push(p)
    })

    trades.forEach(t => {
      const slug = t.eventSlug?.split('-')[0] || t.conditionId?.slice(0, 6) || 'other'
      const cat = slugToCategory[slug.toLowerCase()] || slug.charAt(0).toUpperCase() + slug.slice(1)
      if (!catTrades.has(cat)) catTrades.set(cat, [])
      catTrades.get(cat)!.push(t)
    })

    return MARKET_CATEGORIES.map(mc => {
      const pos = catPositions.get(mc.key) || []
      const tds = catTrades.get(mc.key) || []

      const pnl = pos.reduce((s, p) => s + (p.cashPnl || 0), 0)
      const volume = tds.reduce((s, t) => s + t.size * t.price, 0)

      const wins = pos.filter(p => (p.cashPnl || 0) > 0).length
      const resolved = pos.filter(p => p.cashPnl !== undefined && p.cashPnl !== 0).length
      const winRate = resolved > 0 ? (wins / resolved) * 100 : 0

      const returnsByDate = new Map<string, number>()
      tds.forEach(t => {
        const date = new Date(typeof t.timestamp === 'number' ? t.timestamp * 1000 : t.timestamp).toISOString().slice(0, 10)
        const ret = t.side === 'SELL' ? t.size * t.price : -t.size * t.price
        returnsByDate.set(date, (returnsByDate.get(date) || 0) + ret)
      })
      const dailyRets = Array.from(returnsByDate.values())
      const avg = dailyRets.length > 0 ? dailyRets.reduce((s, r) => s + r, 0) / dailyRets.length : 0
      const std = dailyRets.length > 1
        ? Math.sqrt(dailyRets.reduce((s, r) => s + Math.pow(r - avg, 2), 0) / (dailyRets.length - 1))
        : 1
      const dside = dailyRets.length > 1
        ? Math.sqrt(dailyRets.filter(r => r < 0).reduce((s, r) => s + r * r, 0) / Math.max(dailyRets.filter(r => r < 0).length, 1))
        : 1
      const sharpe = std > 0 ? avg / std : 0
      const sortino = dside > 0 ? avg / dside : 0

      const riskEfficiency = Math.min(99.99, Math.max(0, 50 + sharpe * 15))
      const profitabilityScore = volume > 0
        ? Math.min(99.99, Math.max(0, 50 + (pnl / volume) * 500))
        : 0

      let score = 0
      if (pos.length > 0 || tds.length > 0) {
        score = 50
        if (pnl > 0 && volume > 0) {
          score += Math.min(30, (pnl / volume) * 300)
        } else if (pnl < 0 && volume > 0) {
          score -= Math.min(20, Math.abs(pnl / volume) * 200)
        }
        score += (winRate / 100) * 20
        score += Math.min(10, pos.length * 0.5)
        score = Math.max(0, Math.min(100, score))
      }

      return {
        name: mc.key,
        emoji: mc.emoji,
        smartScore: score,
        riskEfficiency,
        profitability: profitabilityScore,
        pnl,
        winRate,
        volume,
        sharpe,
        sortino,
        trades: tds.length,
      }
    }).sort((a, b) => b.smartScore - a.smartScore)
  }, [positions, trades, profile, slugToCategory])

  // Radar data -- keep original order (not sorted)
  const radarData = useMemo(() => {
    return MARKET_CATEGORIES.map(mc => {
      const stat = categoryStats.find(c => c.name === mc.key)
      return {
        category: mc.key,
        score: stat?.smartScore || 0,
      }
    })
  }, [categoryStats])

  const formatVal = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}K`
    return `$${v.toFixed(0)}`
  }

  if (categoryStats.length === 0) return null

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {/* LEFT: Custom SVG Radar Polygon */}
      <div className="sharp-panel p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1">Category Proficiency</h3>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-4">
          Smart scores across market categories
        </p>
        <CustomRadar data={radarData} />
      </div>

      {/* RIGHT: Category Details Accordion */}
      <div className="sharp-panel p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1">Category Details</h3>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-4">
          Performance metrics by category
        </p>
        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
          {categoryStats.map((cat) => {
            const isExpanded = expandedCat === cat.name
            const barWidth = Math.max(2, cat.smartScore)
            const hasActivity = cat.trades > 0 || cat.pnl !== 0

            return (
              <div
                key={cat.name}
                className={cn(
                  'border rounded-lg transition-all',
                  isExpanded ? 'border-[#a3e635]/30' : 'border-border',
                  !hasActivity && 'opacity-40 pointer-events-none'
                )}
              >
                {/* Header row */}
                <button
                  onClick={() => hasActivity && setExpandedCat(isExpanded ? null : cat.name)}
                  disabled={!hasActivity}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors disabled:cursor-default"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base leading-none">{cat.emoji}</span>
                    <span className="text-sm font-medium text-foreground">{cat.name}</span>
                  </div>
                  {hasActivity && (
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-muted-foreground transition-transform',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  )}
                </button>

                {/* Smart Score bar -- always visible */}
                <div className="px-4 pb-3">
                  <div className="rounded-md overflow-hidden bg-[#a3e635]/10 relative">
                    <div
                      className="h-10 bg-[#a3e635]/15 transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                    <div className="absolute inset-0 flex items-center px-3">
                      <div>
                        <div className="text-[9px] text-[#a3e635]/60 leading-none mb-0.5 font-medium">Smart Score</div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-base font-bold text-[#a3e635] tabular-nums leading-none">{cat.smartScore.toFixed(2)}</span>
                          <span className="text-[9px] text-muted-foreground/50">/100</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && hasActivity && (
                  <div className="px-4 pb-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    {/* Risk Efficiency & Profitability */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Risk Efficiency</span>
                        <span className="text-xs font-mono font-semibold text-foreground tabular-nums">{cat.riskEfficiency.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Profitability</span>
                        <span className="text-xs font-mono font-semibold text-foreground tabular-nums">{cat.profitability.toFixed(2)}</span>
                      </div>
                    </div>

                    <p className="text-[9px] text-muted-foreground/50 italic">
                      Scores are adjusted for recency, profit, and experience
                    </p>

                    {/* Divider */}
                    <div className="h-px bg-border/50" />

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{'P&L'}</span>
                        <span className={cn('text-xs font-mono font-semibold tabular-nums', cat.pnl >= 0 ? 'text-[#a3e635]' : 'text-destructive')}>
                          {formatVal(cat.pnl)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Sharpe</span>
                        <span className="text-xs font-mono font-semibold text-foreground tabular-nums">{cat.sharpe.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Win Rate</span>
                        <span className="text-xs font-mono font-semibold text-foreground tabular-nums">{cat.winRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Sortino</span>
                        <span className="text-xs font-mono font-semibold text-foreground tabular-nums">{cat.sortino.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Volume</span>
                        <span className="text-xs font-mono font-semibold text-foreground tabular-nums">{formatVal(cat.volume)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
