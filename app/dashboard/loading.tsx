import { DashboardSkeleton } from '@/components/ui/skeletons'
import LongTaskProgress from '@/components/ui/LongTaskProgress'

/**
 * The dashboard's first load is the heaviest in the app (5 parallel queries,
 * one of them a 5-level nested select, plus getInvestorStats' 3 more), so it
 * gets the LONG-task bar above the page-shaped skeleton rather than the
 * skeleton alone.
 */
export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-7 flex flex-col gap-5">
      <div style={{ maxWidth: 340 }}><LongTaskProgress active /></div>
      <DashboardSkeleton />
    </div>
  )
}
