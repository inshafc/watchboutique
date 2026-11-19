'use client'

import { useEffect, useRef, useState } from 'react'

// Tap-to-open on mobile (no hover), hover-to-open on desktop. A document
// click listener closes it on outside tap since mobile has no hover-out.
export default function InfoTooltip({ text, className = '' }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [open])

  return (
    <div
      ref={ref}
      className={`relative inline-flex group align-middle ${className}`}
      onClick={e => { e.stopPropagation(); e.preventDefault(); setOpen(v => !v) }}
    >
      <button
        type="button"
        aria-label="What is this?"
        className="w-[14px] h-[14px] rounded-full flex items-center justify-center flex-none cursor-help select-none"
        style={{ background: 'rgba(20,20,15,.1)', color: 'rgba(20,20,15,.5)', fontSize: 9.5, fontWeight: 700, lineHeight: 1, WebkitTapHighlightColor: 'transparent' }}
      >
        i
      </button>
      <div
        role="tooltip"
        className={`absolute z-50 left-1/2 -translate-x-1/2 top-[150%] w-[210px] rounded-xl p-2.5 text-[11.5px] leading-snug transition-opacity duration-150 pointer-events-none ${open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        style={{ background: '#14140f', color: '#fff', boxShadow: '0 8px 24px rgba(20,20,15,.25)' }}
      >
        {text}
      </div>
    </div>
  )
}
