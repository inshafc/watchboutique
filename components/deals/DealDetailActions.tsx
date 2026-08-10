'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { INK, RED } from '@/lib/design-tokens'
import type { DealWithRelations } from '@/types'

function EditIcon()      { return <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13.2 3.9 16.1 6.8 7.4 15.5l-3.5.6.6-3.5z"/></svg> }
function DuplicateIcon() { return <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="7" width="9" height="9" rx="2.2"/><path d="M13 4.6H6.2A1.6 1.6 0 0 0 4.6 6.2V13" strokeLinecap="round"/></svg> }
function TrashIcon()     { return <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke={RED} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4.6 5.8h10.8M8.2 5.8V4.2h3.6v1.6M6 5.8l.7 10h6.6l.7-10"/></svg> }

const UNDO_DELAY = 5000

export default function DealDetailActions({ deal }: { deal: DealWithRelations }) {
  const router = useRouter()
  const [pendingDelete, setPendingDelete] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  async function handleDuplicate() {
    const supabase = createClient()
    const { data } = await supabase
      .from('deals')
      .insert({
        watch_id: deal.watch_id, client_id: deal.client_id, deal_type: deal.deal_type,
        stage: 'Inquiry', offered_price: deal.offered_price, sale_price: deal.sale_price,
        payment_method: deal.payment_method, currency: deal.currency, exchange_rate: deal.exchange_rate, notes: deal.notes,
        sales_manager: deal.sales_manager, other_costs: deal.other_costs ?? false,
        other_costs_amount: deal.other_costs_amount, commission_payable: deal.commission_payable ?? false,
        commission_amount: deal.commission_amount, new_client: deal.new_client ?? false,
      })
      .select('id')
      .single()
    if (data) router.push(`/dashboard/deals/${data.id}`)
  }

  function handleDelete() {
    setPendingDelete(true)
    timerRef.current = setTimeout(async () => {
      const supabase = createClient()
      await supabase.from('deals').update({ deleted_at: new Date().toISOString() }).eq('id', deal.id)
      router.push('/dashboard/deals')
    }, UNDO_DELAY)
  }

  function handleUndo() {
    clearTimeout(timerRef.current)
    setPendingDelete(false)
  }

  const btnCls = 'flex items-center justify-center transition-colors hover:bg-[#f7f6f3]'
  const btnStyle: React.CSSProperties = { width: 46, height: 46, borderRadius: '50%', border: '1px solid rgba(20,20,15,.1)', background: '#fff' }

  return (
    <>
      <div className="flex items-center gap-2.5">
        <a href={`/dashboard/deals/${deal.id}/edit`} className={btnCls} style={btnStyle} title="Edit">
          <EditIcon />
        </a>
        <button onClick={handleDuplicate} className={btnCls} style={btnStyle} title="Duplicate">
          <DuplicateIcon />
        </button>
        <button
          onClick={handleDelete}
          className="flex items-center justify-center transition-colors hover:bg-[rgba(178,58,44,.07)]"
          style={{ ...btnStyle, border: '1px solid rgba(178,58,44,.25)' }}
          title="Delete"
        >
          <TrashIcon />
        </button>
      </div>

      {pendingDelete && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 text-white text-sm px-4 py-3 rounded-2xl shadow-xl" style={{ background: INK }}>
          <span>Sale moved to deleted</span>
          <div className="w-20 h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full"
              style={{ animation: `countdown-shrink ${UNDO_DELAY}ms linear forwards`, width: '100%' }}
            />
          </div>
          <button
            onClick={handleUndo}
            className="font-semibold text-white underline underline-offset-2 hover:no-underline"
          >
            Undo
          </button>
          <style>{`
            @keyframes countdown-shrink {
              from { width: 100%; }
              to   { width: 0%; }
            }
          `}</style>
        </div>
      )}
    </>
  )
}
