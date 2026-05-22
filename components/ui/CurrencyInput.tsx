'use client'

import { useState, useRef } from 'react'

function addCommas(s: string): string {
  const parts = s.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.length > 1 ? parts[0] + '.' + parts[1] : parts[0]
}

function fmtBlur(raw: string): string {
  const n = parseFloat(raw.replace(/,/g, ''))
  return isNaN(n) ? raw : n.toLocaleString('en-LK')
}

export default function CurrencyInput({
  value,
  onChange,
  placeholder = '0',
  required,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
}) {
  const [display, setDisplay] = useState(() => value ? addCommas(value.replace(/,/g, '')) : '')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.target
    const curPos = el.selectionStart ?? 0
    const realBefore = el.value.slice(0, curPos).replace(/[^0-9.]/g, '').length
    const raw = el.value.replace(/[^0-9.]/g, '')
    const formatted = raw ? addCommas(raw) : ''

    let realCount = 0
    let newPos = formatted.length
    for (let i = 0; i < formatted.length; i++) {
      if (realCount >= realBefore) { newPos = i; break }
      if (/[0-9.]/.test(formatted[i])) realCount++
    }

    setDisplay(formatted)
    onChange(raw)
    requestAnimationFrame(() => {
      inputRef.current?.setSelectionRange(newPos, newPos)
    })
  }

  function handleBlur() {
    const raw = display.replace(/,/g, '')
    if (!raw) return
    const n = parseFloat(raw)
    if (!isNaN(n)) setDisplay(n.toLocaleString('en-LK'))
  }

  return (
    <div className="flex items-stretch border border-gray-200 rounded-xl overflow-hidden bg-white focus-within:ring-2 focus-within:ring-gray-900 focus-within:border-transparent transition-all">
      <span className="px-3 py-2.5 text-xs font-semibold text-gray-400 bg-gray-50 border-r border-gray-200 flex items-center select-none">LKR</span>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        className="flex-1 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
      />
    </div>
  )
}
