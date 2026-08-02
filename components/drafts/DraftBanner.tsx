'use client'

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins === 1) return '1 minute ago'
  if (mins < 60) return `${mins} minutes ago`
  const hours = Math.round(mins / 60)
  if (hours === 1) return '1 hour ago'
  if (hours < 24) return `${hours} hours ago`
  return new Date(iso).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

export default function DraftBanner({
  updatedAt,
  onRestore,
  onDiscard,
}: {
  updatedAt: string | null
  onRestore: () => void
  onDiscard: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
      <span className="text-amber-800">
        Unsaved draft from {updatedAt ? timeAgo(updatedAt) : 'earlier'}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onDiscard}
          className="text-amber-600 hover:text-amber-800 font-medium px-2.5 py-1 rounded-lg transition-colors"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={onRestore}
          className="bg-amber-600 hover:bg-amber-700 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          Restore
        </button>
      </div>
    </div>
  )
}
