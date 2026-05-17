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

**Sprint 2 — Client CRM Module**

Goals:
- [x] `clients`, `wishlists`, `contact_log` tables (see `supabase/sprint2.sql`)
- [x] `/dashboard/clients` — list with search + VIP / Club TWB filters
- [x] `/dashboard/clients/new` — add client form
- [x] `/dashboard/clients/[id]` — detail with inline wishlist + contact log
- [x] `/dashboard/clients/[id]/edit` — edit client
- [x] Clients added to sidebar navigation
- [ ] Run `supabase/sprint2.sql` in Supabase SQL editor

**Sprint 1 — Watch Inventory Module** ✓

**Sprint 0 — Foundation Setup** ✓

## Key Conventions

- All money is in **LKR** (currency field is fixed, never shown as editable)
- `date_on_card` is stored as a full `date`; only the year is displayed in the inventory table
- Investor percentages must total exactly 100% per watch — validated in `AddWatchForm`
- Photos are stored as `text[]` (max 4 URLs), uploaded externally

## Business Context

TWB buys and sells watches. The ERP will eventually manage:
- Inventory (watch listings, conditions, sourcing) ← Sprint 1
- Sales and purchase records
- Customer/consignor contacts
- Staff activity and reporting

All data is internal. There are no public-facing pages.
