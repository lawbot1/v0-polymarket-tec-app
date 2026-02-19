'use client'

import React from "react"
import { Header } from './header'

interface AppShellProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export function AppShell({ children, title, subtitle }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background grid-background">
      <Header title={title} subtitle={subtitle} />
      <main className="p-4 lg:p-6">{children}</main>
    </div>
  )
}
