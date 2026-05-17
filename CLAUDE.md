# WatchBoutique ERP — CLAUDE.md

## Project Overview

WatchBoutique is an internal ERP (Enterprise Resource Planning) system built for **The Watch Boutique (TWB)**, a watch trading boutique owned by client **Imad**. This is **not** an ecommerce site — it is a private, staff-only management system used to run the business internally.

## Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Framework   | Next.js 14 (App Router, TypeScript) |
| Styling     | Tailwind CSS                        |
| Database    | Supabase (PostgreSQL + Auth + RLS)  |
| Deployment  | Vercel                              |

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase anon/public key
```

## Folder Structure

```
/app          — Next.js App Router pages and layouts
/components   — Reusable UI components
/lib          — Utility functions and service clients (e.g. Supabase)
/types        — Shared TypeScript types and interfaces
```

## Supabase Clients

- `lib/supabase/client.ts` — browser client (Client Components)
- `lib/supabase/server.ts` — server client (Server Components, Route Handlers)

## Current Sprint

**Sprint 0 — Foundation Setup**

Goals:
- [x] Next.js 14 + TypeScript + Tailwind scaffolded
- [x] Supabase client wired up
- [x] Folder structure established
- [ ] Supabase project created and env vars filled in
- [ ] Authentication (login/logout for staff)

## Business Context

TWB buys and sells watches. The ERP will eventually manage:
- Inventory (watch listings, conditions, sourcing)
- Sales and purchase records
- Customer/consignor contacts
- Staff activity and reporting

All data is internal. There are no public-facing pages.
