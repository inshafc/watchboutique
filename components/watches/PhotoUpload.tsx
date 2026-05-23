'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'

export type PhotoItem = { kind: 'url'; url: string } | { kind: 'file'; file: File }

interface PhotoUploadProps {
  items: PhotoItem[]
  onChange: (items: PhotoItem[]) => void
}

function getPreview(item: PhotoItem): string {
  return item.kind === 'url' ? item.url : URL.createObjectURL(item.file)
}

export default function PhotoUpload({ items, onChange }: PhotoUploadProps) {
  const [dragging, setDragging] = useState(false)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const inputRef    = useRef<HTMLInputElement>(null)
  const dragFromIdx = useRef<number | null>(null)
  const remaining   = 4 - items.length

  function addFiles(files: FileList | null) {
    if (!files || remaining <= 0) return
    const toAdd: PhotoItem[] = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .slice(0, remaining)
      .map(f => ({ kind: 'file' as const, file: f }))
    onChange([...items, ...toAdd])
  }

  function handleZoneDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  function removeItem(idx: number) {
    onChange(items.filter((_, i) => i !== idx))
  }

  function onItemDragStart(idx: number) { dragFromIdx.current = idx }

  function onItemDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    e.stopPropagation()
    setDragOverIdx(idx)
  }

  function onItemDrop(e: React.DragEvent, toIdx: number) {
    e.preventDefault()
    e.stopPropagation()
    setDragOverIdx(null)
    const fromIdx = dragFromIdx.current
    dragFromIdx.current = null
    if (fromIdx === null || fromIdx === toIdx) return
    const next = [...items]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {/* Preview row with drag handles */}
      {items.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {items.map((item, idx) => (
            <div
              key={idx}
              draggable
              onDragStart={() => onItemDragStart(idx)}
              onDragOver={e => onItemDragOver(e, idx)}
              onDrop={e => onItemDrop(e, idx)}
              onDragLeave={() => setDragOverIdx(null)}
              onDragEnd={() => setDragOverIdx(null)}
              className={`relative w-20 h-20 rounded-xl overflow-visible cursor-grab transition-all ${
                dragOverIdx === idx ? 'ring-2 ring-gray-900 scale-105' : ''
              }`}
            >
              <Image
                src={getPreview(item)}
                alt={`Photo ${idx + 1}`}
                width={80}
                height={80}
                className="w-full h-full object-cover rounded-xl border border-gray-100"
                draggable={false}
                unoptimized
              />
              {/* Drag handle pip */}
              <div className="absolute top-1 left-1 w-4 h-4 bg-black/30 rounded flex items-center justify-center pointer-events-none">
                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="currentColor">
                  <circle cx="3" cy="3" r="1"/><circle cx="7" cy="3" r="1"/>
                  <circle cx="3" cy="7" r="1"/><circle cx="7" cy="7" r="1"/>
                </svg>
              </div>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-500 transition-colors z-10 leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {remaining > 0 && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => { addFiles(e.target.files); if (inputRef.current) inputRef.current.value = '' }}
          />
          <div
            onClick={() => inputRef.current?.click()}
            onDrop={handleZoneDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDragEnd={() => setDragging(false)}
            className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl px-4 py-8 cursor-pointer transition-colors select-none ${
              dragging
                ? 'border-gray-900 bg-gray-50'
                : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            <svg className="w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round"/>
            </svg>
            <p className="text-sm font-medium text-gray-500">Drag photos here or click to upload</p>
            <p className="text-xs text-gray-400">{remaining} slot{remaining > 1 ? 's' : ''} remaining</p>
          </div>
        </>
      )}
      <p className="text-xs text-gray-400">Up to 4 photos. Stored in cloud.</p>
    </div>
  )
}
