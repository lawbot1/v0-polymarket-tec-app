'use client'

// Price ticker component - displays crypto prices
// Uses a safe fetch with error handling to prevent crashes

import { useState, useEffect } from 'react'

interface PriceData {
  symbol: string
  price: string
  change: number
}

export function PriceTicker() {
  const [prices, setPrices] = useState<PriceData[]>([
    { symbol: 'BTC', price: '$—', change: 0 },
    { symbol: 'ETH', price: '$—', change: 0 },
    { symbol: 'MATIC', price: '$—', change: 0 },
  ])

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,matic-network&vs_currencies=usd&include_24hr_change=true',
          { signal: AbortSignal.timeout(5000) }
        )
        if (!res.ok) return
        const data = await res.json()

        setPrices([
          {
            symbol: 'BTC',
            price: `$${(data.bitcoin?.usd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            change: data.bitcoin?.usd_24h_change ?? 0,
          },
          {
            symbol: 'ETH',
            price: `$${(data.ethereum?.usd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            change: data.ethereum?.usd_24h_change ?? 0,
          },
          {
            symbol: 'MATIC',
            price: `$${(data['matic-network']?.usd ?? 0).toFixed(3)}`,
            change: data['matic-network']?.usd_24h_change ?? 0,
          },
        ])
      } catch {
        // Silently fail - show default dash values
      }
    }

    fetchPrices()
    const interval = setInterval(fetchPrices, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-4 text-xs">
      {prices.map((p) => (
        <div key={p.symbol} className="flex items-center gap-1.5">
          <span className="font-medium text-muted-foreground">{p.symbol}</span>
          <span className="text-foreground">{p.price}</span>
          <span className={p.change >= 0 ? 'text-green-500' : 'text-red-500'}>
            {p.change >= 0 ? '+' : ''}{p.change.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  )
}
