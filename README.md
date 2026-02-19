<p align="center">
  <img src="public/vantake-main-logo.png" alt="Vantake" width="80" height="80" />
</p>

<h1 align="center">Vantake</h1>

<p align="center">
  <strong>Advanced Polymarket Trader Analytics Platform</strong>
</p>

<p align="center">
  Real-time leaderboard, wallet tracking, market analytics, and insider signals for Polymarket prediction markets.
</p>

<p align="center">
  <a href="https://vercel.com/lawbot1-1228s-projects/v0-polymarket-tec-app"><img src="https://img.shields.io/badge/Deployed%20on-Vercel-000?style=flat-square&logo=vercel" alt="Vercel" /></a>
  <img src="https://img.shields.io/badge/Next.js-16-000?style=flat-square&logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=000" alt="React 19" />
  <img src="https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3ECF8E?style=flat-square&logo=supabase&logoColor=fff" alt="Supabase" />
  <img src="https://img.shields.io/badge/TailwindCSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=fff" alt="Tailwind CSS 4" />
</p>

---

## About

Vantake is a full-stack analytics platform built on top of [Polymarket](https://polymarket.com) prediction markets. It aggregates real-time data from the Polymarket Data API and Gamma API to provide traders with deep insights into market activity, top performer rankings, and wallet-level analytics.

The platform enables users to track any Polymarket wallet, follow top traders, monitor insider signals, and manage their own portfolio -- all backed by Supabase for persistent user data and authentication.

## Features

### Trader Leaderboard
- Real-time ranking of top Polymarket traders by PnL, volume, and performance
- Filterable by timeframe: 24H, 7D, 30D, All-time
- Grid and card views with sparkline PnL charts
- One-click follow and wallet tracking

### Wallet Tracker
- Track any Polymarket wallet by address
- Live PnL, volume, and position data per wallet
- Toggle alerts per tracked wallet
- Persistent storage tied to user account (Supabase)

### Market Explorer
- Browse all active Polymarket prediction markets
- Sorted by volume (most popular first)
- Category filtering and search
- Individual market pages with order book depth, price history charts, and top holders

### Insider Signals
- Smart money flow detection
- Large trade alerts and whale movements
- Category-based signal filtering

### User Dashboard
- Link your Polymarket wallet to see personal KPI metrics
- Track your own PnL, volume, win rate, and global rank
- Monthly activity chart and category strength breakdown

### Settings
- Profile management (display name, email, Telegram handle)
- Notification preferences (trade alerts, portfolio updates, daily digests)
- All settings persisted in Supabase

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router, RSC, Turbopack) |
| **Language** | [TypeScript](https://typescriptlang.org) |
| **UI** | [React 19](https://react.dev) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com) |
| **Components** | [shadcn/ui](https://ui.shadcn.com) + [Radix UI](https://radix-ui.com) primitives |
| **Charts** | [Recharts](https://recharts.org) |
| **Auth** | [Supabase Auth](https://supabase.com/auth) (email + password) |
| **Database** | [Supabase](https://supabase.com) (PostgreSQL with Row Level Security) |
| **Data Fetching** | [SWR](https://swr.vercel.app) for client-side caching and revalidation |
| **External APIs** | Polymarket Data API, Polymarket Gamma API |
| **Deployment** | [Vercel](https://vercel.com) |
| **Analytics** | [Vercel Analytics](https://vercel.com/analytics) |
| **Fonts** | Space Grotesk (headings), JetBrains Mono (monospace/data) |

## Architecture

```
vantake/
├── app/
│   ├── api/polymarket/         # Proxy API routes to Polymarket
│   │   ├── leaderboard/        # Trader rankings
│   │   ├── markets/            # Market listings (sorted by volume)
│   │   ├── events/             # Events and predictions
│   │   ├── positions/          # Wallet positions
│   │   ├── trades/             # Trade history
│   │   ├── profile/[address]/  # Trader profiles
│   │   ├── prices-history/     # Historical price data
│   │   ├── book/               # Order book depth
│   │   ├── holders/            # Top token holders
│   │   ├── search/             # Market search
│   │   └── tags/               # Market categories
│   ├── auth/                   # Supabase auth pages
│   │   ├── login/              # Email + password login
│   │   ├── sign-up/            # User registration
│   │   ├── callback/           # OAuth callback handler
│   │   └── error/              # Auth error page
│   ├── dashboard/              # User portfolio dashboard
│   ├── markets/                # Market explorer
│   │   └── [id]/               # Individual market detail
│   ├── trader/[id]/            # Trader profile page
│   ├── wallet-tracker/         # Wallet tracking interface
│   ├── insider-signals/        # Smart money signals
│   └── settings/               # User settings
├── components/
│   ├── auth/                   # Auth button with user dropdown
│   ├── layout/                 # Header, sidebar, app shell
│   ├── leaderboard/            # Trader cards and table
│   ├── trader/                 # Follow/track button
│   ├── providers/              # SWR provider
│   └── ui/                     # shadcn/ui component library
├── lib/
│   ├── polymarket-api.ts       # Polymarket API client (800+ lines)
│   ├── supabase/               # Supabase client/server/middleware
│   └── utils.ts                # Utility functions
├── scripts/                    # SQL migration scripts
└── middleware.ts                # Supabase session refresh
```

## Database Schema

Four tables with Row Level Security (RLS) -- every user can only access their own data:

| Table | Purpose |
|-------|---------|
| `profiles` | User profile (display name, email, Polymarket wallet, Telegram) |
| `tracked_wallets` | Wallets the user is tracking (address, label, alerts toggle) |
| `followed_traders` | Traders the user follows (address, name) |
| `notification_settings` | Per-user notification preferences |

A database trigger auto-creates `profiles` and `notification_settings` rows on user signup.

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Vercel](https://vercel.com) account (for deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/lawbot1/v0-polymarket-tec-app.git
cd v0-polymarket-tec-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Setup

Run the SQL migrations in order against your Supabase project:

```bash
# 1. Create tables with RLS policies
psql $DATABASE_URL < scripts/001_create_tables.sql

# 2. Create auto-profile trigger
psql $DATABASE_URL < scripts/002_profile_trigger.sql
```

Or execute them directly in the Supabase SQL Editor.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm run start
```

## API Proxy Layer

All Polymarket API calls go through Next.js API routes under `/api/polymarket/` to:

- Avoid CORS issues from the browser
- Cache responses with `next.revalidate` (60s default)
- Add error handling and response normalization
- Keep external API endpoints abstracted from the client

**Data sources:**
- `https://data-api.polymarket.com` -- Leaderboard, rankings
- `https://gamma-api.polymarket.com` -- Markets, events, positions, trades
- `https://clob.polymarket.com` -- Order book data

## Deployment

The project is configured for zero-config deployment on Vercel:

```bash
vercel
```

Or connect the GitHub repository to Vercel for automatic deployments on push.

## License

This project is proprietary. All rights reserved.
