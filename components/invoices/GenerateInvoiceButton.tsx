'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface DealSnapshot {
  id:             string
  currency:       string
  sales_manager:  string | null
  payment_method: string | null
  sale_price:     number | null
  client_name:    string | null
  client_phone:   string | null
  client_address: string | null
  watch_name:     string | null
  watch_reference: string | null
  watch_serial:   string | null
  watch_photo:    string | null
}

export default function GenerateInvoiceButton({ deal }: { deal: DealSnapshot }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    // Check if invoice already exists for this deal
    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('deal_id', deal.id)
      .is('deleted_at', null)
      .limit(1)
      .single()

    if (existing) {
      router.push(`/dashboard/invoices/${existing.id}/edit`)
      return
    }

    // Generate next invoice number (count-based, sequential)
    const year   = new Date().getFullYear()
    const prefix = `TWB-${year}-`
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .like('invoice_number', `${prefix}%`)

    const seq            = (count ?? 0) + 1
    const invoice_number = `${prefix}${String(seq).padStart(4, '0')}`

    // Create invoice pre-populated from deal
    const { data: inv, error: invErr } = await supabase
      .from('invoices')
      .insert({
        invoice_number,
        deal_id:        deal.id,
        type:           'sale',
        status:         'draft',
        currency:       deal.currency,
        sales_manager:  deal.sales_manager,
        payment_method: deal.payment_method,
        client_name:    deal.client_name,
        client_phone:   deal.client_phone,
        client_address: deal.client_address,
      })
      .select('id')
      .single()

    if (invErr || !inv) {
      setError(invErr?.message ?? 'Failed to create invoice')
      setLoading(false)
      return
    }

    // Add watch as line item if present
    if (deal.watch_name) {
      await supabase.from('invoice_items').insert({
        invoice_id:    inv.id,
        watch_name:    deal.watch_name,
        reference:     deal.watch_reference,
        serial_number: deal.watch_serial,
        photo_url:     deal.watch_photo,
        amount:        deal.sale_price,
        sort_order:    0,
      })
    }

    router.push(`/dashboard/invoices/${inv.id}/edit`)
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
      >
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
          <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>
        </svg>
        {loading ? 'Creating…' : 'Generate Invoice'}
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
