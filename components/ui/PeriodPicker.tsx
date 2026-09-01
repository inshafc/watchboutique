'use client'

import type { DateRange } from '@/lib/analytics'
import { INK, INK_08, INK_50, INK_60 } from '@/lib/design-tokens'

// The period toggle was inline in components/dashboard/DashboardOverview.tsx.
// It now lives here so the Sales list uses the identical control — same option
// set, same open/close behaviour, same visual treatment — instead of a copy.
export type PeriodValue = DateRange | 'all'

export const PERIOD_RANGES: { label: string; value: DateRange }[] = [
  { label: 'This Month',    value: 'this_month' },
  { label: 'Last Month',    value: 'last_month' },
  { label: 'Last 3 Months', value: 'last_3'     },
  { label: 'Last 6 Months', value: 'last_6'     },
  { label: 'This Year',     value: 'this_year'  },
]

// Sales opens on "All Time" so the list is unnarrowed by default; the
// dashboard cards have no such option and always sit inside a real period.
export const PERIOD_RANGES_WITH_ALL: { label: string; value: PeriodValue }[] = [
  { label: 'All Time', value: 'all' },
  ...PERIOD_RANGES,
]

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round">
      <rect x="3" y="4.6" width="14" height="12.4" rx="3" />
      <path d="M3 8.6h14M6.8 3.2v2.8M13.2 3.2v2.8" />
    </svg>
  )
}

// `open` is controlled by the caller so a page with other popovers (the
// dashboard's "add new" menu, the Sales filter menus) can close them together.
export default function PeriodPicker<T extends PeriodValue>({
  value,
  options,
  onChange,
  open,
  onOpenChange,
}: {
  value: T
  options: readonly { label: string; value: T }[]
  onChange: (value: T) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex items-center gap-2 h-[46px] px-4 rounded-full bg-white text-[13.5px] font-semibold whitespace-nowrap"
        style={{ border: `1px solid ${INK_08}`, color: INK }}
      >
        <CalendarIcon />
        {options.find(o => o.value === value)?.label}
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke={INK_50} strokeWidth="1.6" strokeLinecap="round"><path d="m3 4.6 3 3 3-3" /></svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => onOpenChange(false)} />
          <div className="absolute top-[52px] right-0 z-40 min-w-[180px] bg-white rounded-2xl p-1.5 flex flex-col gap-0.5" style={{ border: `1px solid ${INK_08}`, boxShadow: '0 12px 32px rgba(20,20,15,.16)' }}>
            {options.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); onOpenChange(false) }}
                className="text-left border-0 cursor-pointer text-[13px] px-3.5 py-2.5 rounded-xl whitespace-nowrap"
                style={{ fontWeight: o.value === value ? 600 : 500, background: o.value === value ? '#f2f1ed' : 'transparent', color: o.value === value ? INK : INK_60 }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
