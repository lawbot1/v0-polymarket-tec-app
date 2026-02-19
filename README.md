# VANTAKE

> Institutional-grade analytics for prediction markets.  
> Track smart money. Measure performance. Identify asymmetric opportunities.

---<img width="400" height="400" alt="image" src="https://github.com/user-attachments/assets/02ffa8d7-4c16-4f00-ae66-b5d37b6708b9" />
<img width="400" height="400" alt="image" src="https://github.com/user-attachments/assets/02ffa8d7-4c16-4f00-ae66-b5d37b6708b9" />


## Overview

VANTAKE is a high-signal analytics layer built for prediction markets, focused on trader performance intelligence and capital flow analysis.

The platform surfaces:

- High-ROI traders  
- Consistent outperformers  
- Early smart money positioning  
- Market inefficiencies  

Built for users who value data over noise.

---

## Core Capabilities

| Module | Description | Status |
|--------|------------|--------|
| Leaderboard | Ranked traders by ROI, PnL, winrate and volume | Active |
| Trader Profiles | Deep performance breakdown and historical analytics | Active |
| Wallet Tracking | Monitor and analyze specific wallets | In Progress |
| Smart Score | Proprietary ranking algorithm for trader quality | In Development |
| Insider Finder | Detection of early high-confidence positioning | Planned |
| Market Intelligence | Capital flow clustering and signal surfacing | Planned |

---

## Platform Architecture

| Layer | Responsibility |
|-------|---------------|
| Frontend | Next.js (App Router), TypeScript, TailwindCSS |
| UI System | shadcn/ui + custom design tokens |
| Data Layer | Server routes with normalized adapters |
| Auth & Database | Supabase |
| Infrastructure | Vercel + Cloudflare |
| CI/CD | GitHub + Vercel auto deployments |

---

## Product Philosophy

| Principle | Implementation |
|-----------|---------------|
| Signal over Noise | Strict performance metrics |
| Institutional UX | Dark premium interface |
| Speed | Server-side aggregation and caching |
| Security | RLS policies + server-only keys |
| Scalability | Modular and extensible architecture |

---

## Repository Structure

| Directory | Purpose |
|-----------|--------|
| app | Routing and application pages |
| components | UI and feature components |
| lib | Data layer, adapters and utilities |
| styles | Global styles and design tokens |
| public | Static assets |

---

## Local Development

### Install dependencies

```bash
npm install
```

### Setup environment variables

Create `.env.local` and add:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Do not commit production secrets.

### Run development server

```bash
npm run dev
```

App runs at:

```
http://localhost:3000
```

---

## Production Deployment

| Environment | Platform |
|-------------|----------|
| Production | Vercel |
| Preview | Vercel Preview Deployments |
| Database | Supabase |
| DNS | Cloudflare |

Each push to `main` triggers automatic deployment.

---

## Security Model

| Component | Strategy |
|-----------|----------|
| Authentication | Supabase Auth |
| Database Access | Row Level Security |
| Secrets | Stored server-side only |
| API Endpoints | Controlled via server routes |

---

## Roadmap

### Phase 1 — Performance Layer
- Trader ranking system  
- Profile analytics  
- Wallet watchlists  

### Phase 2 — Intelligence Layer
- Smart Score v1  
- Capital flow clustering  
- Signal alerts  

### Phase 3 — Institutional Tools
- Public API  
- Strategy comparison engine  
- Portfolio simulation  

---

## Vision

VANTAKE aims to become the analytics backbone for prediction markets.

Not a dashboard.  
An intelligence engine.

---

## License

Proprietary – All rights reserved.
