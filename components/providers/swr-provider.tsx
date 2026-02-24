'use client'

import { SWRConfig } from 'swr'
import type { ReactNode } from 'react'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        revalidateIfStale: false,
        revalidateOnReconnect: false,
        dedupingInterval: 120000, // 2 minute deduplication -- prevents refetch on tab switch
        keepPreviousData: true, // Keep showing old data while fetching new (instant display)
        errorRetryCount: 2,
        errorRetryInterval: 3000,
        focusThrottleInterval: 120000, // Throttle focus revalidation to 2 min
      }}
    >
      {children}
    </SWRConfig>
  )
}
