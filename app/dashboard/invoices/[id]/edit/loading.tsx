import { FormSkeleton } from '@/components/ui/skeletons'

export default function InvoiceEditorLoading() {
  return <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8"><FormSkeleton sections={4} fieldsPerSection={4} /></div>
}
