'use client'

import type { DraftSaveStatus } from '@/lib/hooks/useAutosaveDraft'

export default function DraftSaveIndicator({ status }: { status: DraftSaveStatus }) {
  if (status === 'idle') return null
  return (
    <span className="text-xs text-gray-400 inline-flex items-center gap-1">
      {status === 'saving' ? 'Saving…' : 'Saved'}
    </span>
  )
}
