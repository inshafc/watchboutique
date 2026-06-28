import type { WatchStatus } from '@/types'

const config: Record<string, string> = {
  'Available': 'bg-[#DCFCE7] text-[#16A34A]',
  'On Hold':   'bg-[#FEF3C7] text-[#D97706]',
  'Sold':      'bg-[#F3F2EF] text-[#6B6B6B]',
  'Consigned': 'bg-[#EDE9FE] text-[#7C3AED]',
  'Draft':     'bg-[#F3F2EF] text-[#9CA3AF]',
}

export default function StatusBadge({ status }: { status: string }) {
  const cls = config[status as WatchStatus] ?? 'bg-[#F3F2EF] text-[#6B6B6B]'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.05em] ${cls}`}>
      {status}
    </span>
  )
}
