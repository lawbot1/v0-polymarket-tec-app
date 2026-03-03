'use client'

import { Header } from '@/components/layout/header'
import { Copy, Zap, Shield, TrendingUp, Bell } from 'lucide-react'
import Image from 'next/image'

export default function CopytradingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-4xl mx-auto px-4 py-16 sm:py-24">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-score/10 border border-score/30 text-score text-sm font-medium mb-6">
            <Zap className="h-4 w-4" />
            Coming Soon
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4 tracking-tight">
            Copytrading
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Automatically mirror trades from top Polymarket traders. 
            Set your risk parameters and let the best traders work for you.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 gap-4 mb-16">
          <div className="sharp-panel p-6">
            <div className="h-10 w-10 rounded-lg bg-score/10 border border-score/20 flex items-center justify-center mb-4">
              <Copy className="h-5 w-5 text-score" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">One-Click Copy</h3>
            <p className="text-sm text-muted-foreground">
              Follow any trader from the leaderboard and automatically copy their positions in real-time.
            </p>
          </div>

          <div className="sharp-panel p-6">
            <div className="h-10 w-10 rounded-lg bg-score/10 border border-score/20 flex items-center justify-center mb-4">
              <Shield className="h-5 w-5 text-score" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Risk Management</h3>
            <p className="text-sm text-muted-foreground">
              Set maximum position sizes, stop-losses, and daily limits to protect your capital.
            </p>
          </div>

          <div className="sharp-panel p-6">
            <div className="h-10 w-10 rounded-lg bg-score/10 border border-score/20 flex items-center justify-center mb-4">
              <TrendingUp className="h-5 w-5 text-score" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Smart Allocation</h3>
            <p className="text-sm text-muted-foreground">
              Proportional position sizing based on your portfolio and the trader's conviction level.
            </p>
          </div>

          <div className="sharp-panel p-6">
            <div className="h-10 w-10 rounded-lg bg-score/10 border border-score/20 flex items-center justify-center mb-4">
              <Bell className="h-5 w-5 text-score" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Instant Alerts</h3>
            <p className="text-sm text-muted-foreground">
              Get notified on every copied trade via Telegram with full position details.
            </p>
          </div>
        </div>

        {/* Waitlist Section */}
        <div className="sharp-panel p-8 text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Be the first to know</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Join our Telegram for early access and updates on the copytrading launch.
          </p>
          
          <a
            href="https://t.me/vaboratory"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-medium rounded-lg hover:bg-foreground/90 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            Join Telegram
          </a>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Copytrading involves risk. Past performance does not guarantee future results.
        </p>
      </main>
    </div>
  )
}
