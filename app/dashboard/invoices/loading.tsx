import { PageHeaderSkeleton, TabsSkeleton, ListRowsSkeleton } from '@/components/ui/skeletons'

export default function InvoicesLoading() {
  return (
    <div className="p-4 md:p-7">
      <PageHeaderSkeleton />
      <TabsSkeleton count={4} />
      <ListRowsSkeleton count={8} thumb={false} />
    </div>
  )
}
