import { FormSkeleton } from '@/components/ui/skeletons'
import Skeleton from '@/components/ui/Skeleton'

export default function EditWatchLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-8">
      <div className="mb-7 flex flex-col gap-2">
        <Skeleton width={56} height={12} />
        <Skeleton width={188} height={26} />
        <Skeleton width={132} height={12} />
      </div>
      <FormSkeleton sections={3} fieldsPerSection={4} />
    </div>
  )
}
