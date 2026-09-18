import { FilterBarSkeleton, TileGridSkeleton, PageHeaderSkeleton } from '@/components/ui/skeletons'

export default function InventoryLoading() {
  return (
    <div className="p-4 md:p-7">
      <PageHeaderSkeleton />
      <FilterBarSkeleton />
      <TileGridSkeleton count={12} />
    </div>
  )
}
