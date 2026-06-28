'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { DealWithRelations } from '@/types'

function EditIcon()      { return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2.5l2.5 2.5-8 8H3v-2.5l8-8z" strokeLinejoin="round"/></svg> }
function DuplicateIcon() { return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 11V3h8" strokeLinecap="round"/></svg> }
function TrashIcon()     { return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5h10M6 5V3h4v2M5.5 5l.5 8h4l.5-8" strokeLinecap="round" strokeLinejoin="round"/></svg> }

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
        payment_method: deal.payment_method, currency: deal.currency, notes: deal.notes,
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

  const btnCls = 'p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors'

  return (
    <>
      <div className="flex items-center gap-1">
        <a href={`/dashboard/deals/${deal.id}/edit`} className={btnCls} title="Edit">
          <EditIcon />
        </a>
        <button onClick={handleDuplicate} className={btnCls} title="Duplicate">
          <DuplicateIcon />
        </button>
        <button onClick={handleDelete} className="p-2 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
          <TrashIcon />
        </button>
      </div>

      {pendingDelete && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white text-sm px-4 py-3 rounded-2xl shadow-xl">
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
