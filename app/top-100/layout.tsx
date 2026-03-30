import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vantake Top 100 | Best Traders on Polymarket',
  description: 'The top 100 traders on Polymarket ranked by performance. Discover the best human traders with proven track records.',
  openGraph: {
    title: 'Vantake Top 100',
    description: 'The top 100 traders on Polymarket ranked by performance',
    url: 'https://app.vantake.trade/top-100',
    siteName: 'Vantake',
    images: [
      {
        url: 'https://app.vantake.trade/og-top-100.jpg',
        width: 1200,
        height: 630,
        alt: 'Vantake Top 100 - Best Traders on Polymarket',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vantake Top 100',
    description: 'The top 100 traders on Polymarket ranked by performance',
    images: ['https://app.vantake.trade/og-top-100.jpg'],
    creator: '@vantake_trade',
  },
}

export default function Top100Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
