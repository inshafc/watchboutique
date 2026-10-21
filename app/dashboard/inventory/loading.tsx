import { FilterBarSkeleton, TileGridSkeleton, PageHeaderSkeleton } from '@/components/ui/skeletons'
import SkeletonMessage from '@/components/ui/SkeletonMessage'

/**
 * Inventory renders every non-deleted watch at once (204 tiles, unpaginated),
 * so it is one of the three pages slow enough to earn the rotating message.
 */
export default function InventoryLoading() {
  return (
    <div className="p-4 md:p-7">
      <SkeletonMessage className="pb-3" />
      <PageHeaderSkeleton />
      <FilterBarSkeleton />
      <TileGridSkeleton count={12} />
    </div>
  )
}
