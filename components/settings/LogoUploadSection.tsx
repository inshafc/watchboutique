'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LogoUploadSection({ initialLogoUrl }: { initialLogoUrl: string | null }) {
  const [logoUrl,   setLogoUrl]   = useState(initialLogoUrl)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)

    const supabase = createClient()
    const ext  = file.name.split('.').pop() ?? 'png'
    const path = `logo/logo_${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage.from('invoice-assets').upload(path, file)
    if (upErr) { setError(upErr.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('invoice-assets').getPublicUrl(path)

    await supabase
      .from('app_settings')
      .upsert({ key: 'invoice_logo_url', value: publicUrl }, { onConflict: 'key' })

    setLogoUrl(publicUrl)
    setUploading(false)
    // Reset input so the same file can be re-selected
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleRemove() {
    if (!confirm('Remove the invoice logo?')) return
    const supabase = createClient()
    await supabase.from('app_settings').delete().eq('key', 'invoice_logo_url')
    setLogoUrl(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Invoice Logo</h2>
          <p className="text-sm text-gray-400 mt-0.5">Displayed in the top-right of all invoices</p>
        </div>
        <div className="flex items-center gap-2">
          {logoUrl && (
            <button
              onClick={handleRemove}
              className="text-sm text-gray-500 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              Remove
            </button>
          )}
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-black disabled:opacity-50 transition-colors"
          >
            {uploading ? 'Uploading…' : logoUrl ? 'Replace Logo' : 'Upload Logo'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {logoUrl ? (
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 flex justify-center items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="Invoice logo" className="max-h-24 max-w-xs object-contain" />
        </div>
      ) : (
        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-12 text-center">
          <svg className="w-8 h-8 text-gray-200 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/><path d="m3 15 5-5 4 4 3-3 4 4"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
          </svg>
          <p className="text-sm text-gray-400">No logo uploaded</p>
          <p className="text-xs text-gray-300 mt-1">PNG, JPG, WebP, or SVG — displayed next to invoice header</p>
        </div>
      )}
    </div>
  )
}
