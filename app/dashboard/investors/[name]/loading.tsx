import { PageHeaderSkeleton, ListRowsSkeleton } from '@/components/ui/skeletons'

export default function InvestorDetailLoading() {
  return (
    <div className="p-4 md:p-7">
      <PageHeaderSkeleton withActions={false} />
      <ListRowsSkeleton count={6} thumb={false} />
    </div>
  )
}
