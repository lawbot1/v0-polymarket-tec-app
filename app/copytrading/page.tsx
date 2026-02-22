'use client'

import Image from 'next/image'
import { Copy, Zap, Shield, TrendingUp, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppShell } from '@/components/layout/app-shell'
import { useState } from 'react'

const upcomingFeatures = [
  {
    icon: Copy,
    title: 'Auto-Copy Trades',
    description: 'Automatically mirror positions from top-performing traders in real time.',
  },
  {
    icon: Zap,
    title: 'Instant Execution',
    description: 'Trades are executed within seconds of the original, minimizing slippage.',
  },
  {
    icon: Shield,
    title: 'Risk Controls',
    description: 'Set max position sizes, daily loss limits, and auto-stop rules to protect your capital.',
  },
  {
    icon: TrendingUp,
    title: 'Performance Analytics',
    description: 'Track how your copied trades perform with detailed P&L breakdowns and metrics.',
  },
]

export default function CopytradingPage() {
  const [notifyEmail, setNotifyEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <AppShell>
    <div className="flex flex-col items-center px-4 py-10">
      {/* Logo */}
      <div className="mb-6">
        <Image
          src="/vantake-logo-white.png"
          alt="Vantake"
          width={56}
          height={56}
          className="h-14 w-14 object-contain opacity-60"
        />
      </div>

      {/* Badge */}
      <div className="inline-flex items-center gap-2 bg-secondary/60 border border-border rounded-full px-4 py-1.5 mb-6">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
        </span>
        <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">In Development</span>
      </div>

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-center text-balance mb-3">
        Copytrading
      </h1>
      <p className="text-base text-muted-foreground text-center max-w-md mb-12 text-pretty">
        Follow the best traders on Polymarket and automatically copy their positions. Set it, forget it, profit.
      </p>

      {/* Feature cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl w-full mb-12">
        {upcomingFeatures.map((feature) => (
          <div
            key={feature.title}
            className="bg-card border border-border rounded-xl p-5 group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center bg-secondary rounded-lg">
                <feature.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{feature.title}</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Notify form */}
      {!submitted ? (
        <form onSubmit={handleNotify} className="flex flex-col items-center gap-3 w-full max-w-sm">
          <p className="text-xs text-muted-foreground mb-1 text-center">
            Want to be the first to know when Copytrading launches?
          </p>
          <div className="flex items-center gap-2 w-full">
            <input
              type="email"
              required
              placeholder="Enter your email"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              className="flex-1 h-10 rounded-lg border border-border bg-secondary/40 px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/30"
            />
            <Button type="submit" className="h-10 rounded-lg px-5 gap-2">
              <Bell className="h-3.5 w-3.5" />
              Notify Me
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-6 py-4">
          <p className="text-sm font-medium text-emerald-400">You're on the list!</p>
          <p className="text-xs text-muted-foreground text-center">
            We'll send you an email as soon as Copytrading is ready to go.
          </p>
        </div>
      )}

      {/* Timeline hint */}
      <div className="mt-16 flex items-center gap-6 text-xs text-muted-foreground/50">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>Research</span>
        </div>
        <div className="h-px w-8 bg-border" />
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span>Development</span>
        </div>
        <div className="h-px w-8 bg-border" />
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
          <span>Launch</span>
        </div>
      </div>
    </div>
    </AppShell>
  )
}
