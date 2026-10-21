import { PageHeaderSkeleton, DetailSkeleton } from '@/components/ui/skeletons'

export default function DealDetailLoading() {
  return (
    <div className="p-4 md:p-7">
      <PageHeaderSkeleton />
      <DetailSkeleton />
    </div>
  )
}
