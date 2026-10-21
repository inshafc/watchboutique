import { DashboardSkeleton } from '@/components/ui/skeletons'

/**
 * The dashboard's first load is the heaviest in the app (5 parallel queries,
 * one a 5-level nested select, plus getInvestorStats' 3 more), so it gets the
 * rotating message above its skeleton. No progress bar — there is nothing
 * determinate to measure here.
 */
export default function DashboardLoading() {
  return <div className="p-4 md:p-7"><DashboardSkeleton message /></div>
}
