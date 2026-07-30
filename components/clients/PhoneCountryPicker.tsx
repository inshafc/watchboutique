'use client'

import { useEffect, useRef, useState } from 'react'
import { COUNTRIES, flagEmoji, type Country } from '@/lib/countries'

export default function PhoneCountryPicker({
  value,
  onChange,
}: {
  value: Country
  onChange: (c: Country) => void
}) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 0)
  }, [open])

  const q = query.trim().toLowerCase()
  const filtered = q
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.code.includes(q) ||
        c.id.toLowerCase() === q
      )
    : COUNTRIES

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 h-full"
      >
        <span className="text-base leading-none">{flagEmoji(value.id)}</span>
        {value.id !== 'LK' && (
          <span className="text-gray-600 text-xs font-medium">{value.code}</span>
        )}
        <svg className="w-3 h-3 text-gray-400" viewBox="0 0 16 16" fill="currentColor">
          <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-64 flex flex-col">
          <div className="p-2 border-b border-gray-100">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search country or code…"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-3.5 py-3 text-sm text-gray-400">No matches</p>
            )}
            {filtered.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => { onChange(c); setOpen(false); setQuery('') }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-gray-50 transition-colors text-left ${value.id === c.id ? 'bg-gray-50' : ''}`}
              >
                <span className="text-base">{flagEmoji(c.id)}</span>
                <span className="text-gray-400 text-xs w-12 shrink-0">{c.code}</span>
                <span className="text-gray-700 truncate">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
