'use client'

import { useState } from 'react'

function fmt(raw: string): string {
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
  const [display, setDisplay] = useState(() => (value ? fmt(value) : ''))

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9.]/g, '')
    setDisplay(raw)
    onChange(raw)
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
