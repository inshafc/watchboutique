import { PageHeaderSkeleton, TabsSkeleton, ListRowsSkeleton } from '@/components/ui/skeletons'

export default function ClientsLoading() {
  return (
    <div className="p-4 md:p-7">
      <PageHeaderSkeleton />
      <TabsSkeleton count={5} />
      <ListRowsSkeleton count={8} />
    </div>
  )
}
