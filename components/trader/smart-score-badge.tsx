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
  size?: 'sm' | 'lg'
  className?: string
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

  if (size === 'lg') {
    return (
      <div
        ref={badgeRef}
        className={cn('relative inline-flex', className)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="relative px-4 pt-1.5 pb-0.5 rounded-lg bg-score/10 border border-score/20 flex flex-col items-center cursor-default overflow-visible">
          <div className="text-xs text-muted-foreground tracking-wider text-center leading-none">Smart Score</div>
          <div className="flex items-center gap-0 -mt-0.5">
            <Image
              src="/vantake-logo-white.png"
              alt="Vantake"
              width={44}
              height={44}
              className="opacity-90 flex-shrink-0 -ml-2 -mr-1"
            />
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl font-bold tabular-nums text-score leading-none">{score.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground/50 font-normal leading-none">/100</span>
            </div>
          </div>
        </div>

        {/* Tooltip */}
        {showTooltip && (
          <Tooltip score={score} riskEff={riskEff} profit={profit} anchor="left" />
        )}
      </div>
    )
  }

  // size === 'sm' -- compact badge with overlapping logo
  return (
    <div
      ref={badgeRef}
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="relative px-3 pt-1.5 pb-0.5 rounded-lg bg-score/10 border border-score/20 flex flex-col items-center cursor-default overflow-visible">
        <div className="text-[11px] text-muted-foreground tracking-wider text-center leading-none">Smart Score</div>
        <div className="flex items-center gap-0 -mt-0.5">
          <Image
            src="/vantake-logo-white.png"
            alt="Vantake"
            width={38}
            height={38}
            className="opacity-90 flex-shrink-0 -ml-2 -mr-1"
          />
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl font-bold tabular-nums text-score leading-none">{score.toFixed(1)}</span>
            <span className="text-[10px] text-muted-foreground/50 font-normal leading-none">/100</span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <Tooltip score={score} riskEff={riskEff} profit={profit} anchor="right" />
      )}
    </div>
  )
}

/* Shared tooltip component */
function Tooltip({ score, riskEff, profit, anchor }: { score: number; riskEff: number; profit: number; anchor: 'left' | 'right' }) {
  return (
    <div
      className={cn(
        'absolute z-[60] w-56 bg-card border border-score/20 rounded-xl shadow-2xl shadow-black/60 p-3.5 pointer-events-none',
        'top-full mt-2',
        anchor === 'right' ? 'right-0' : 'left-0',
      )}
    >
      {/* Arrow */}
      <div className={cn(
        'absolute -top-[6px] w-3 h-3 bg-card border-l border-t border-score/20 rotate-45',
        anchor === 'right' ? 'right-5' : 'left-5',
      )} />

      <div className="relative space-y-2.5">
        {/* Header: Smart Score + logo + score */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Smart Score</span>
          <div className="flex items-center gap-1.5">
            <Image src="/vantake-logo-white.png" alt="Vantake" width={14} height={14} className="opacity-70" />
            <span className="text-sm font-bold tabular-nums text-score">{score.toFixed(1)}</span>
            <span className="text-[9px] text-muted-foreground/50 font-normal">/100</span>
          </div>
        </div>

        <div className="h-px bg-border/30" />

        {/* Metrics */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Risk Efficiency</span>
            <span className="text-[11px] font-semibold tabular-nums text-foreground">{riskEff.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Profitability</span>
            <span className="text-[11px] font-semibold tabular-nums text-foreground">{profit.toFixed(2)}</span>
          </div>
        </div>

        <div className="h-px bg-border/30" />

        <p className="text-[9px] text-muted-foreground/60 leading-relaxed">
          Scores are adjusted for recency, profit, and experience
        </p>
      </div>
    </div>
  )
}
