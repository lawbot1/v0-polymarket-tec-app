'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface SmartScoreTooltipData {
  riskEfficiency: number
  profitability: number
}

interface SmartScoreBadgeProps {
  score: number
  tooltipData?: SmartScoreTooltipData
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-[#22c55e]'
  if (score >= 60) return 'text-[#eab308]'
  if (score >= 40) return 'text-[#f97316]'
  return 'text-[#ef4444]'
}

function getScoreBorderColor(score: number) {
  if (score >= 80) return 'border-[#22c55e]/30'
  if (score >= 60) return 'border-[#eab308]/30'
  if (score >= 40) return 'border-[#f97316]/30'
  return 'border-[#ef4444]/30'
}

export function SmartScoreBadge({ score, tooltipData, size = 'sm', className }: SmartScoreBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const badgeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showTooltip) return
    const handleClick = (e: MouseEvent) => {
      if (badgeRef.current && !badgeRef.current.contains(e.target as Node)) {
        setShowTooltip(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [showTooltip])

  const riskEff = tooltipData?.riskEfficiency ?? 50
  const profit = tooltipData?.profitability ?? 50

  // For card (sm): square box layout
  // For profile (lg): wider horizontal layout
  const isSquare = size === 'sm' || size === 'md'

  return (
    <div
      ref={badgeRef}
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {isSquare ? (
        /* SQUARE BADGE for cards */
        <div className={cn(
          'flex flex-col items-center justify-center border rounded-lg bg-card cursor-default transition-all',
          getScoreBorderColor(score),
          size === 'sm' ? 'w-[82px] h-[72px] gap-0.5' : 'w-[90px] h-[78px] gap-1',
        )}>
          {/* "Smart Score" label */}
          <span className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wider">
            Smart Score
          </span>
          {/* Logo */}
          <div className="flex items-center justify-center h-4 w-4 rounded-[3px] bg-secondary/80 border border-border/40">
            <Image src="/vantake-logo-white.png" alt="V" width={10} height={10} className="object-contain" />
          </div>
          {/* Score */}
          <div className="flex items-baseline gap-0.5">
            <span className={cn('font-bold font-mono tabular-nums text-sm', getScoreColor(score))}>
              {score.toFixed(1)}
            </span>
            <span className="text-[8px] font-mono text-muted-foreground/50">/100</span>
          </div>
        </div>
      ) : (
        /* WIDE BADGE for profile page */
        <div className={cn(
          'inline-flex items-center gap-2.5 border rounded-lg bg-card px-4 py-2.5 cursor-default transition-all',
          getScoreBorderColor(score),
        )}>
          <span className="text-xs font-semibold text-foreground/80 whitespace-nowrap">Smart Score</span>
          <div className="flex items-center justify-center h-6 w-6 rounded bg-secondary border border-border/50">
            <Image src="/vantake-logo-white.png" alt="V" width={16} height={16} className="object-contain" />
          </div>
          <span className={cn('text-xl font-bold font-mono tabular-nums', getScoreColor(score))}>
            {score.toFixed(1)}
          </span>
          <span className="text-xs font-mono text-muted-foreground/60">/100</span>
        </div>
      )}

      {/* Tooltip - always opens downward, stays within card bounds */}
      {showTooltip && (
        <div
          className={cn(
            'absolute z-[60] w-52 bg-card border rounded-xl shadow-2xl shadow-black/60 p-3.5',
            getScoreBorderColor(score),
            'top-full mt-1.5',
            isSquare ? 'right-0' : 'left-0',
          )}
          style={{ pointerEvents: 'none' }}
        >
          {/* Arrow */}
          <div className={cn(
            'absolute -top-[6px] w-3 h-3 bg-card border-l border-t rotate-45',
            getScoreBorderColor(score),
            isSquare ? 'right-5' : 'left-5',
          )} />

          <div className="relative space-y-2">
            {/* Header row: logo + score */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Smart Score</span>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center justify-center h-4 w-4 rounded-[3px] bg-secondary border border-border/50">
                  <Image src="/vantake-logo-white.png" alt="V" width={10} height={10} className="object-contain" />
                </div>
                <span className={cn('text-sm font-bold font-mono', getScoreColor(score))}>
                  {score.toFixed(1)}
                </span>
                <span className="text-[9px] text-muted-foreground/50 font-mono">/100</span>
              </div>
            </div>

            <div className="h-px bg-border/30" />

            {/* Metrics */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Risk Efficiency</span>
                <span className="text-[11px] font-semibold font-mono text-foreground">{riskEff.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Profitability</span>
                <span className="text-[11px] font-semibold font-mono text-foreground">{profit.toFixed(2)}</span>
              </div>
            </div>

            <div className="h-px bg-border/30" />

            <p className="text-[9px] text-muted-foreground/50 leading-relaxed">
              Scores are adjusted for recency, profit, and experience
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
