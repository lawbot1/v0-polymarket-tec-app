import React from "react"
import type { Metadata } from 'next'
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SWRProvider } from '@/components/providers/swr-provider'
import './globals.css'

const spaceGrotesk = Space_Grotesk({ 
  subsets: ["latin"],
  variable: '--font-sans'
});
const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: '--font-mono'
});

export const metadata: Metadata = {
  title: 'Vantake - Polymarket Trader Analytics',
  description: 'Advanced analytics dashboard for Polymarket traders',
  generator: 'v0.app',
  icons: {
    icon: '/vantake-main-logo.png',
    apple: '/vantake-main-logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <SWRProvider>
          {children}
        </SWRProvider>
        <Analytics />
      </body>
    </html>
  )
}
