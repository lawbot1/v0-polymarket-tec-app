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
        dedupingInterval: 60000, // 1 minute deduplication
        keepPreviousData: true, // Keep showing old data while fetching new
        errorRetryCount: 2,
      }}
    >
      {children}
    </SWRConfig>
  )
}
