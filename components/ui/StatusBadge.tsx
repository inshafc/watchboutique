import type { WatchStatus } from '@/types'

const config: Record<WatchStatus, string> = {
  'Available': 'bg-emerald-50  text-emerald-700 ring-emerald-200',
  'On Hold':   'bg-amber-50   text-amber-700  ring-amber-200',
  'Sold':      'bg-sky-50     text-sky-700    ring-sky-200',
  'Consigned': 'bg-purple-50  text-purple-700 ring-purple-200',
}

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${config[status as WatchStatus] ?? 'bg-gray-100 text-gray-600 ring-gray-200'}`}>
      {status}
    </span>
  )
}
