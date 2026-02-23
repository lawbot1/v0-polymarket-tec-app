'use client'

import { PrivyProvider as Privy } from '@privy-io/react-auth'
import { Component, type ReactNode, type ErrorInfo } from 'react'

// Error boundary to catch Privy iframe failures (e.g., in v0 preview)
class PrivyErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[Privy] Error boundary caught:', error.message, info)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

export function PrivyProvider({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID

  if (!appId) {
    return <>{children}</>
  }

  // Detect if we're in an iframe (v0 preview) -- Privy iframe won't work there
  // Still render Privy but wrap in error boundary so app doesn't crash
  return (
    <PrivyErrorBoundary fallback={<>{children}</>}>
      <Privy
        appId={appId}
        config={{
          appearance: {
            theme: 'dark',
            accentColor: '#22c55e',
            logo: '/vantake-main-logo.png',
          },
        }}
      >
        {children}
      </Privy>
    </PrivyErrorBoundary>
  )
}
