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
        <div className="px-4 py-2.5 rounded-lg bg-foreground flex flex-col justify-between h-[62px] cursor-default">
          <div className="text-xs text-background/60 tracking-wider text-left leading-none">Smart Score</div>
          <div className="flex items-center gap-2">
            <Image
              src="/vantake-logo-dark.png"
              alt="Vantake"
              width={28}
              height={28}
              className="flex-shrink-0"
            />
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl font-semibold tabular-nums text-background leading-none">{score.toFixed(1)}</span>
              <span className="text-xs text-background/40 font-normal leading-none">/100</span>
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

  // size === 'sm' -- exact match of the reference code
  return (
    <div
      ref={badgeRef}
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="px-3 py-2 rounded-lg bg-foreground flex flex-col justify-between h-[52px] cursor-default">
        <div className="text-[11px] text-background/60 tracking-wider text-left leading-none">Smart Score</div>
        <div className="flex items-center gap-1.5">
          <Image
            src="/vantake-logo-dark.png"
            alt="Vantake"
            width={24}
            height={24}
            className="flex-shrink-0"
          />
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg font-semibold tabular-nums text-background leading-none">{score.toFixed(1)}</span>
            <span className="text-[10px] text-background/40 font-normal leading-none">/100</span>
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
        'absolute z-[60] w-56 bg-foreground rounded-xl shadow-2xl shadow-black/60 p-3.5 pointer-events-none',
        'top-full mt-2',
        anchor === 'right' ? 'right-0' : 'left-0',
      )}
    >
      {/* Arrow */}
      <div className={cn(
        'absolute -top-[6px] w-3 h-3 bg-foreground rotate-45',
        anchor === 'right' ? 'right-5' : 'left-5',
      )} />

      <div className="relative space-y-2.5">
        {/* Header: Smart Score + logo + score */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-background/60 uppercase tracking-wider">Smart Score</span>
          <div className="flex items-center gap-1.5">
            <Image src="/vantake-logo-dark.png" alt="Vantake" width={14} height={14} />
            <span className="text-sm font-bold tabular-nums text-background">{score.toFixed(1)}</span>
            <span className="text-[9px] text-background/40 font-normal">/100</span>
          </div>
        </div>

        <div className="h-px bg-background/15" />

        {/* Metrics */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-background/60">Risk Efficiency</span>
            <span className="text-[11px] font-semibold tabular-nums text-background">{riskEff.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-background/60">Profitability</span>
            <span className="text-[11px] font-semibold tabular-nums text-background">{profit.toFixed(2)}</span>
          </div>
        </div>

        <div className="h-px bg-background/15" />

        <p className="text-[9px] text-background/40 leading-relaxed">
          Scores are adjusted for recency, profit, and experience
        </p>
      </div>
    </div>
  )
}
