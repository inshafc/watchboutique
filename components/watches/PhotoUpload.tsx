'use client'

import { useRef } from 'react'

interface PhotoUploadProps {
  existingUrls: string[]
  newFiles: File[]
  onExistingUrlsChange: (urls: string[]) => void
  onNewFilesChange: (files: File[]) => void
}

export default function PhotoUpload({
  existingUrls,
  newFiles,
  onExistingUrlsChange,
  onNewFilesChange,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const total = existingUrls.length + newFiles.length
  const remaining = 4 - total

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []).slice(0, remaining)
    onNewFilesChange([...newFiles, ...selected])
    if (inputRef.current) inputRef.current.value = ''
  }

  function removeExisting(idx: number) {
    onExistingUrlsChange(existingUrls.filter((_, i) => i !== idx))
  }

  function removeNew(idx: number) {
    onNewFilesChange(newFiles.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-3">
      {/* Preview grid */}
      {total > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {existingUrls.map((url, idx) => (
            <div key={`existing-${idx}`} className="relative aspect-square">
              <img
                src={url}
                alt={`Photo ${idx + 1}`}
                className="w-full h-full object-cover rounded-xl border border-gray-100"
              />
              <button
                type="button"
                onClick={() => removeExisting(idx)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-500 transition-colors"
              >
                ×
              </button>
            </div>
          ))}
          {newFiles.map((file, idx) => (
            <div key={`new-${idx}`} className="relative aspect-square">
              <img
                src={URL.createObjectURL(file)}
                alt={`New photo ${idx + 1}`}
                className="w-full h-full object-cover rounded-xl border border-gray-100"
              />
              <button
                type="button"
                onClick={() => removeNew(idx)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-500 transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {remaining > 0 && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 border border-dashed border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600 rounded-xl px-4 py-3 text-sm transition-colors w-full justify-center"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 3v10M3 8h10" strokeLinecap="round"/>
            </svg>
            Add photo{remaining > 1 ? 's' : ''} ({remaining} remaining)
          </button>
        </>
      )}
      <p className="text-xs text-gray-400">Up to 4 photos. Stored in Supabase Storage.</p>
    </div>
  )
}
