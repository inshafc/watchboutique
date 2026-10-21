import { FormSkeleton } from '@/components/ui/skeletons'

export default function NewClientLoading() {
  return <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-8"><FormSkeleton sections={3} fieldsPerSection={4} /></div>
}
