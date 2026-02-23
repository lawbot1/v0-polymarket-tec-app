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
  if (score >= 80) return 'border-[#22c55e]/50'
  if (score >= 60) return 'border-[#eab308]/50'
  if (score >= 40) return 'border-[#f97316]/50'
  return 'border-[#ef4444]/50'
}

export function SmartScoreBadge({ score, tooltipData, size = 'sm', className }: SmartScoreBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const badgeRef = useRef<HTMLDivElement>(null)

  // Close tooltip on click outside
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

  const logoSize = size === 'lg' ? 20 : size === 'md' ? 16 : 14

  return (
    <div
      ref={badgeRef}
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Badge - matches screenshot: dark bg, border, "Smart Score" label + logo + green number */}
      <div
        className={cn(
          'inline-flex items-center border rounded-lg cursor-default transition-all',
          'bg-[#0a1a0a] hover:bg-[#0d1f0d]',
          getScoreBorderColor(score),
          size === 'sm' && 'gap-1.5 px-2.5 py-1.5',
          size === 'md' && 'gap-2 px-3 py-2',
          size === 'lg' && 'gap-2.5 px-4 py-2.5',
        )}
      >
        {/* "Smart Score" label */}
        <span className={cn(
          'font-medium text-muted-foreground whitespace-nowrap',
          size === 'sm' ? 'text-[10px]' : size === 'md' ? 'text-[11px]' : 'text-xs',
        )}>
          Smart Score
        </span>

        {/* Vantake Logo */}
        <Image
          src="/vantake-logo-white.jpg"
          alt="Vantake"
          width={logoSize}
          height={logoSize}
          className={cn(
            'object-contain rounded-sm flex-shrink-0',
            size === 'sm' ? 'h-3.5 w-3.5' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5',
          )}
        />

        {/* Score value */}
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

      {/* Tooltip */}
      {showTooltip && (
        <div
          className={cn(
            'absolute z-50 w-60 bg-[#0f1f0f] border rounded-xl shadow-2xl shadow-black/50 p-4 pointer-events-none',
            getScoreBorderColor(score),
            size === 'lg'
              ? 'top-full left-0 mt-2'
              : 'top-full right-0 mt-2',
          )}
        >
          {/* Arrow */}
          <div className={cn(
            'absolute -top-1.5 w-3 h-3 bg-[#0f1f0f] border-l border-t rotate-45',
            getScoreBorderColor(score),
            size === 'lg' ? 'left-6' : 'right-6',
          )} />

          <div className="relative space-y-3">
            {/* Header with logo and score */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Smart Score</span>
              <div className="flex items-center gap-1.5">
                <Image
                  src="/vantake-logo-white.jpg"
                  alt="Vantake"
                  width={16}
                  height={16}
                  className="h-4 w-4 object-contain rounded-sm"
                />
                <span className={cn('text-lg font-bold font-mono', getScoreColor(score))}>
                  {score.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground/60 font-mono">/100</span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-border/50" />

            {/* Metrics */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Risk Efficiency</span>
                <span className="text-sm font-semibold font-mono text-foreground">{riskEff.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Profitability</span>
                <span className="text-sm font-semibold font-mono text-foreground">{profit.toFixed(2)}</span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-border/50" />

            {/* Description */}
            <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
              Scores are adjusted for recency, profit, and experience
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
