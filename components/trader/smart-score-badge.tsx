'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { BarChart3 } from 'lucide-react'

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

function getScoreBgColor(score: number) {
  if (score >= 80) return 'bg-[#22c55e]/15 border-[#22c55e]/40'
  if (score >= 60) return 'bg-[#eab308]/15 border-[#eab308]/40'
  if (score >= 40) return 'bg-[#f97316]/15 border-[#f97316]/40'
  return 'bg-[#ef4444]/15 border-[#ef4444]/40'
}

export function SmartScoreBadge({ score, tooltipData, size = 'sm', className }: SmartScoreBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const badgeRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

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

  return (
    <div
      ref={badgeRef}
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={cn(
          'inline-flex items-center gap-1.5 border rounded-md cursor-default transition-all',
          getScoreBgColor(score),
          size === 'sm' && 'px-2 py-0.5 text-[10px]',
          size === 'md' && 'px-2.5 py-1 text-xs',
          size === 'lg' && 'px-3 py-1.5 text-sm',
        )}
      >
        <span className={cn('font-medium text-muted-foreground', size === 'sm' ? 'text-[9px]' : 'text-[10px]')}>Smart Score</span>
        <BarChart3 className={cn(
          getScoreColor(score),
          size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-3.5 w-3.5' : 'h-4 w-4',
        )} />
        <span className={cn('font-bold font-mono', getScoreColor(score))}>
          {score.toFixed(1)}
        </span>
        <span className="text-muted-foreground font-mono">/100</span>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          ref={tooltipRef}
          className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-card border border-border rounded-lg shadow-xl p-3 pointer-events-none"
        >
          {/* Arrow */}
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-card border-l border-t border-border rotate-45" />
          
          <div className="relative space-y-2.5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-foreground">Smart Score</span>
              <div className="flex items-center gap-1">
                <BarChart3 className={cn('h-3.5 w-3.5', getScoreColor(score))} />
                <span className={cn('text-lg font-bold font-mono', getScoreColor(score))}>{score.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground font-mono">/100</span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-border" />

            {/* Metrics */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Risk Efficiency</span>
                <span className="text-xs font-semibold font-mono text-foreground">{riskEff.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Profitability</span>
                <span className="text-xs font-semibold font-mono text-foreground">{profit.toFixed(2)}</span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-border" />

            {/* Description */}
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Scores are adjusted for recency, profit, and experience
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
