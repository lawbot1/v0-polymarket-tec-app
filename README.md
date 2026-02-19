# VANTAKE

> Institutional-grade analytics for prediction markets.  
> Track smart money. Measure performance. Identify asymmetric opportunities.

---<img width="600" height="200" alt="image" src="https://github.com/user-attachments/assets/520cd632-2692-4597-b650-39d7a4b3e9e6" />

## Overview

VANTAKE is a high-signal analytics platform built for prediction markets, focused on trader performance intelligence and capital flow analysis.

The platform identifies:

- High-ROI traders  
- Consistent outperformers  
- Early smart money positioning  
- Structural market inefficiencies  

Designed for users who prioritize data, clarity, and execution edge.

---

## Core Capabilities

| Module | Description | Status |
|--------|------------|--------|
| Leaderboard | Ranked traders by ROI, PnL, winrate and volume | Active |
| Trader Profiles | Detailed performance breakdown and history | Active |
| Wallet Tracking | Monitor and analyze specific wallets | In Progress |
| Smart Score | Proprietary trader quality algorithm | In Development |
| Insider Finder | Detection of early high-confidence positioning | Planned |
| Market Intelligence | Capital flow clustering and signal surfacing | Planned |

---

## Platform Architecture

| Layer | Responsibility |
|-------|---------------|
| Frontend | Next.js (App Router), TypeScript, TailwindCSS |
| UI System | Component-based design system |
| Data Layer | Server-side aggregation and normalization |
| Authentication | Secure user authentication |
| Database | Managed relational database |
| Infrastructure | Cloud-native scalable architecture |

---

## Product Philosophy

| Principle | Implementation |
|-----------|---------------|
| Signal over Noise | Strict performance metrics |
| Institutional UX | Clean, premium, data-dense interface |
| Performance | Optimized server-side computation |
| Security | Strict access control and data policies |
| Scalability | Modular, extensible architecture |

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

Create `.env.local` and configure required variables for your environment.

### Run development server

```bash
npm run dev
```

The application will start on:

```
http://localhost:3000
```

---

## Security Model

| Component | Strategy |
|-----------|----------|
| Authentication | Secure session-based auth |
| Database Access | Role-based access policies |
| Secrets | Server-side storage only |
| API Endpoints | Controlled via protected routes |

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
