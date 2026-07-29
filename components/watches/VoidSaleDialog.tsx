'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'

export default function VoidSaleDialog({
  acting,
  onDuplicate,
  onVoidSale,
  onCancel,
}: {
  acting: boolean
  onDuplicate: () => void
  onVoidSale: () => void
  onCancel: () => void
}) {
  const [confirmingVoid, setConfirmingVoid] = useState(false)

  // Portal straight to <body>: the dashboard layout wraps every page in an
  // .animate-fade-in div whose forwards-filled transform (even translateY(0)
  // at rest) establishes a new containing block for position:fixed
  // descendants, so without this the dialog centers against the full page
  // height instead of the viewport and ends up rendered off-screen.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !acting && onCancel()} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        {!confirmingVoid ? (
          <>
            <h3 className="text-base font-bold text-gray-900 mb-2">Marking this available voids the sale</h3>
            <p className="text-sm text-gray-500 mb-6">What do you want to do?</p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={onDuplicate}
                disabled={acting}
                className="w-full flex flex-col items-start px-4 py-3 rounded-xl border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50 text-left"
              >
                <span className="text-sm font-semibold text-gray-900">Duplicate as New Watch</span>
                <span className="text-xs text-gray-400 mt-0.5">Keep the original Sold with its sale record intact, create a new Available copy.</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmingVoid(true)}
                disabled={acting}
                className="w-full flex flex-col items-start px-4 py-3 rounded-xl border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50 text-left"
              >
                <span className="text-sm font-semibold text-gray-900">Void Sale</span>
                <span className="text-xs text-gray-400 mt-0.5">Mark this watch Available and delete its sale record.</span>
              </button>

              <button
                type="button"
                onClick={onCancel}
                disabled={acting}
                className="w-full px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-base font-bold text-gray-900 mb-2">Void this sale?</h3>
            <p className="text-sm text-gray-500 mb-6">This permanently deletes the sale record — it can&apos;t be undone.</p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={onVoidSale}
                disabled={acting}
                className="w-full text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl px-4 py-3 transition-colors disabled:opacity-50"
              >
                {acting ? 'Voiding…' : 'Yes, void the sale'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingVoid(false)}
                disabled={acting}
                className="w-full px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              >
                Back
              </button>
            </div>
          </>
        )}

        {acting && !confirmingVoid && (
          <div className="mt-3 text-center text-xs text-gray-400">Working…</div>
        )}
      </div>
    </div>,
    document.body
  )
}
