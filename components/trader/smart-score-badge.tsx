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
  if (score >= 80) return 'border-[#22c55e]/40'
  if (score >= 60) return 'border-[#eab308]/40'
  if (score >= 40) return 'border-[#f97316]/40'
  return 'border-[#ef4444]/40'
}

function getScoreBgColor(score: number) {
  if (score >= 80) return 'bg-[#22c55e]/8'
  if (score >= 60) return 'bg-[#eab308]/8'
  if (score >= 40) return 'bg-[#f97316]/8'
  return 'bg-[#ef4444]/8'
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

  const logoBoxSize = size === 'lg' ? 'h-6 w-6' : size === 'md' ? 'h-5 w-5' : 'h-[18px] w-[18px]'
  const logoImgSize = size === 'lg' ? 16 : size === 'md' ? 14 : 12

  return (
    <div
      ref={badgeRef}
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Badge */}
      <div
        className={cn(
          'inline-flex items-center border rounded-lg cursor-default transition-all',
          getScoreBgColor(score),
          getScoreBorderColor(score),
          size === 'sm' && 'gap-1.5 px-2.5 py-1.5',
          size === 'md' && 'gap-2 px-3 py-2',
          size === 'lg' && 'gap-2.5 px-4 py-2.5',
        )}
      >
        {/* "Smart Score" label */}
        <span className={cn(
          'font-semibold text-foreground/80 whitespace-nowrap',
          size === 'sm' ? 'text-[10px]' : size === 'md' ? 'text-[11px]' : 'text-xs',
        )}>
          Smart Score
        </span>

        {/* Logo in dark square */}
        <div className={cn(
          'flex items-center justify-center rounded bg-card border border-border/50 flex-shrink-0',
          logoBoxSize,
        )}>
          <Image
            src="/vantake-logo-white.png"
            alt="V"
            width={logoImgSize}
            height={logoImgSize}
            className="object-contain"
          />
        </div>

        {/* Score */}
        <span className={cn(
          'font-bold font-mono tabular-nums',
          getScoreColor(score),
          size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-xl',
        )}>
          {score.toFixed(1)}
        </span>
        <span className={cn(
          'font-mono text-muted-foreground/60',
          size === 'sm' ? 'text-[9px]' : size === 'md' ? 'text-[10px]' : 'text-xs',
        )}>
          /100
        </span>
      </div>

      {/* Tooltip - positioned to stay inside the card */}
      {showTooltip && (
        <div
          className={cn(
            'absolute z-[60] w-56 bg-card border rounded-xl shadow-2xl shadow-black/60 p-4',
            getScoreBorderColor(score),
            // For sm/md (cards): open downward, anchored to the right edge
            size !== 'lg' && 'top-full right-0 mt-2',
            // For lg (profile): open downward, anchored to the left edge
            size === 'lg' && 'top-full left-0 mt-2',
          )}
          style={{ pointerEvents: 'none' }}
        >
          {/* Arrow */}
          <div className={cn(
            'absolute -top-[6px] w-3 h-3 bg-card border-l border-t rotate-45',
            getScoreBorderColor(score),
            size === 'lg' ? 'left-6' : 'right-6',
          )} />

          <div className="relative space-y-2.5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground">Smart Score</span>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center justify-center h-5 w-5 rounded bg-secondary border border-border/50">
                  <Image
                    src="/vantake-logo-white.png"
                    alt="V"
                    width={14}
                    height={14}
                    className="object-contain"
                  />
                </div>
                <span className={cn('text-base font-bold font-mono', getScoreColor(score))}>
                  {score.toFixed(1)}
                </span>
                <span className="text-[10px] text-muted-foreground/60 font-mono">/100</span>
              </div>
            </div>

            <div className="h-px bg-border/40" />

            {/* Metrics */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Risk Efficiency</span>
                <span className="text-xs font-semibold font-mono text-foreground">{riskEff.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Profitability</span>
                <span className="text-xs font-semibold font-mono text-foreground">{profit.toFixed(2)}</span>
              </div>
            </div>

            <div className="h-px bg-border/40" />

            <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
              Scores are adjusted for recency, profit, and experience
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
