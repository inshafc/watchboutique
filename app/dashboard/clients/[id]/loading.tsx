import { PageHeaderSkeleton, DetailSkeleton } from '@/components/ui/skeletons'

export default function ClientDetailLoading() {
  return (
    <div className="p-4 md:p-7">
      <PageHeaderSkeleton />
      <DetailSkeleton />
    </div>
  )
}
