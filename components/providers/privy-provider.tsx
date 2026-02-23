'use client'

import { PrivyProvider as Privy } from '@privy-io/react-auth'
import type { ReactNode } from 'react'

export function PrivyProvider({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID

  if (!appId) {
    // Graceful fallback if env var is missing
    return <>{children}</>
  }

  return (
    <Privy
      appId={appId}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#22c55e',
          logo: '/vantake-main-logo.png',
          showWalletLoginFirst: false,
          walletChainType: 'ethereum-only',
        },
        loginMethods: ['email', 'wallet'],
        supportedChains: undefined,
        walletConnectCloudProjectId: undefined,
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        externalWallets: {
          metamask: { connectionOptions: { shouldAutoConnect: false } },
          phantom: { connectionOptions: { shouldAutoConnect: false } },
          coinbaseWallet: { connectionOptions: { shouldAutoConnect: false } },
        },
      }}
    >
      {children}
    </Privy>
  )
}
