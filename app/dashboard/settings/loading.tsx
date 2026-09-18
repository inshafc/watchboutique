import { PageHeaderSkeleton, FormSkeleton } from '@/components/ui/skeletons'

export default function SettingsLoading() {
  return (
    <div className="p-4 md:p-7">
      <PageHeaderSkeleton withActions={false} />
      <FormSkeleton sections={4} fieldsPerSection={2} />
    </div>
  )
}
