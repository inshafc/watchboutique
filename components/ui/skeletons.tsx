/**
 * Page-shaped skeletons for the route-level loading.tsx files.
 *
 * These deliberately mirror the real page's layout — column counts, card
 * heights, the filter bar — rather than showing a grey rectangle, so the shell
 * does not visibly reflow when the real content swaps in.
 *
 * Presentational only (no hooks, no 'use client') so Next can render them as
 * the server-side Suspense fallback.
 */

import Skeleton from '@/components/ui/Skeleton'
import { INK_08, CARD_BG, RADII, CARD_PADDING } from '@/lib/design-tokens'

function Card({ children, padding = CARD_PADDING }: { children: React.ReactNode; padding?: number }) {
  return (
    <section className="bg-white rounded-[24px] flex flex-col gap-4" style={{ padding }}>
      {children}
    </section>
  )
}

/** Brand / condition / on-sale / sort pills + search. */
export function FilterBarSkeleton() {
  return (
    <div className="flex flex-col gap-4 mb-5">
      <Skeleton width="100%" height={52} radius={RADII.md} />
      <div className="flex items-center gap-2.5 flex-wrap">
        {[112, 132, 104, 168].map((w, i) => <Skeleton key={i} width={w} height={44} radius={RADII.pill} />)}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {[74, 92, 86, 78, 88].map((w, i) => <Skeleton key={i} width={w} height={34} radius={RADII.pill} />)}
      </div>
    </div>
  )
}

/** Inventory tile grid — 4 columns on desktop, matching the default density. */
export function TileGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white overflow-hidden" style={{ borderRadius: 20, border: `1px solid ${INK_08}` }}>
          <Skeleton width="100%" height={0} radius={0} style={{ aspectRatio: '1 / 1', height: 'auto' }} />
          <div className="flex flex-col gap-2" style={{ padding: '16px 18px 18px' }}>
            <Skeleton width="72%" height={16} />
            <Skeleton width="48%" height={12} />
            <div className="mt-1.5 pt-2.5 flex flex-col gap-2" style={{ borderTop: `1px solid ${INK_08}` }}>
              <div className="flex items-center gap-2">
                <Skeleton width={64} height={12} />
                <div className="ml-auto"><Skeleton width={76} height={22} radius={RADII.pill} /></div>
              </div>
              <Skeleton width={128} height={20} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/** Generic list rows — clients, deals, invoices. */
export function ListRowsSkeleton({ count = 8, thumb = true }: { count?: number; thumb?: boolean }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 bg-white"
          style={{ padding: '14px 22px', borderRadius: 20, border: `1px solid ${INK_08}` }}
        >
          {thumb && <Skeleton width={64} height={64} radius={16} />}
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <Skeleton width="34%" height={14} />
            <Skeleton width="22%" height={11} />
          </div>
          <Skeleton width={92} height={26} radius={RADII.pill} />
          <Skeleton width={104} height={18} />
        </div>
      ))}
    </div>
  )
}

/** Status tabs strip above a list. */
export function TabsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex items-center gap-2 flex-wrap mb-5">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} width={86 + (i % 3) * 18} height={36} radius={RADII.pill} />
      ))}
    </div>
  )
}

export function PageHeaderSkeleton({ withActions = true }: { withActions?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
      <div className="flex flex-col gap-2">
        <Skeleton width={128} height={13} />
        <Skeleton width={248} height={30} />
      </div>
      {withActions && (
        <div className="flex items-center gap-2.5">
          {[46, 46, 46, 46].map((w, i) => <Skeleton key={i} width={w} height={46} radius={RADII.pill} />)}
        </div>
      )}
    </div>
  )
}

/** Watch / deal detail — photo block then fact rows. */
export function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4" style={{ maxWidth: 1120 }}>
      <Card>
        <Skeleton width="100%" height={380} radius={RADII.md} />
        <div className="grid grid-cols-4 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} width="100%" height={100} radius={14} />)}
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-2">
          <Skeleton width={92} height={11} />
          <Skeleton width={212} height={24} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl flex flex-col gap-2" style={{ background: CARD_BG, padding: '14px 16px' }}>
              <Skeleton width="58%" height={10} />
              <Skeleton width="76%" height={16} />
            </div>
          ))}
        </div>
        <Skeleton width="100%" height={54} radius={RADII.md} />
      </Card>

      <Card>
        <Skeleton width={64} height={11} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton width="70%" height={10} />
              <Skeleton width="54%" height={22} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

/** Add / edit form — section cards of labelled field rows. */
export function FormSkeleton({ sections = 3, fieldsPerSection = 4 }: { sections?: number; fieldsPerSection?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: sections }).map((_, s) => (
        <Card key={s}>
          <Skeleton width={104} height={11} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: fieldsPerSection }).map((_, f) => (
              <div key={f} className="flex flex-col gap-2">
                <Skeleton width="42%" height={10} />
                <Skeleton width="100%" height={44} radius={12} />
              </div>
            ))}
          </div>
        </Card>
      ))}
      <Skeleton width="100%" height={54} radius={RADII.md} />
    </div>
  )
}

/** Dashboard / analytics — KPI cards then chart blocks. */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeaderSkeleton withActions={false} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white flex flex-col gap-3" style={{ padding: 22, borderRadius: 20, border: `1px solid ${INK_08}` }}>
            <Skeleton width="56%" height={10} />
            <Skeleton width="74%" height={28} />
            <Skeleton width="40%" height={11} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        <div className="lg:col-span-2"><Card><Skeleton width={128} height={12} /><Skeleton width="100%" height={260} radius={RADII.md} /></Card></div>
        <Card><Skeleton width={96} height={12} /><Skeleton width="100%" height={260} radius={RADII.md} /></Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}><Skeleton width={112} height={12} /><Skeleton width="100%" height={200} radius={RADII.md} /></Card>
        ))}
      </div>
    </div>
  )
}
