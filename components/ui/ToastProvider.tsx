'use client'

/**
 * The app's single toast system. Replaces seven independent implementations
 * (WatchDetailActions, WatchStatusButtons, WatchInventory, dashboard/layout,
 * InvoiceEditorClient) and the four copy-pasted showUndo() helpers in
 * ClientList / DealList / InvoiceList / WatchInventory.
 *
 * Toasts STACK — they are laid out in a flex column, so two at once can never
 * render on top of each other the way the old independent fixed-position
 * implementations could. Beyond MAX_VISIBLE the rest queue and promote as
 * earlier ones expire.
 *
 * Rendered through a portal to document.body so no ancestor's stacking or
 * containing-block behaviour can displace them.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Spinner from '@/components/ui/Spinner'
import { INK, RED, RADII } from '@/lib/design-tokens'

export type ToastVariant = 'success' | 'error' | 'undo'

const DURATIONS: Record<ToastVariant, number> = {
  success: 3000,
  error:   3000,
  undo:    5000,
}

const MAX_VISIBLE = 3

type Toast = {
  id:       number
  variant:  ToastVariant
  message:  string
  /** undo only — awaited when the user hits Undo. */
  onUndo?:  () => Promise<void> | void
  duration: number
}

type ToastApi = {
  toast:   (message: string, variant?: ToastVariant) => void
  success: (message: string) => void
  error:   (message: string) => void
  undo:    (message: string, onUndo: () => Promise<void> | void) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastApi>({
  toast: () => {}, success: () => {}, error: () => {}, undo: () => {}, dismiss: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

function CheckIcon() {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
function AlertIcon() {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 4.6v4M8 11.2h.01" strokeLinecap="round"/><circle cx="8" cy="8" r="6.4"/></svg>
}

function ToastRow({ t, onDismiss }: { t: Toast; onDismiss: (id: number) => void }) {
  const [undoing, setUndoing] = useState(false)

  async function handleUndo() {
    if (!t.onUndo || undoing) return
    setUndoing(true)
    try { await t.onUndo() } finally { onDismiss(t.id) }
  }

  const background = t.variant === 'error' ? RED : INK

  return (
    <div
      role={t.variant === 'error' ? 'alert' : 'status'}
      className="feedback-in flex items-center gap-2.5 text-white select-none pointer-events-auto"
      style={{
        background,
        borderRadius: RADII.sm,
        boxShadow: '0 10px 30px rgba(20,20,15,.28)',
        padding: t.variant === 'undo' ? '10px 10px 10px 16px' : '12px 18px',
        maxWidth: 'min(92vw, 420px)',
      }}
    >
      {t.variant === 'success' && <span style={{ color: '#7ee2a8' }}><CheckIcon /></span>}
      {t.variant === 'error'   && <AlertIcon />}
      <span className="text-[13.5px] font-medium leading-snug">{t.message}</span>

      {t.variant === 'undo' && (
        <button
          type="button"
          onClick={handleUndo}
          disabled={undoing}
          className="ml-2 shrink-0 inline-flex items-center gap-1.5 transition-colors disabled:opacity-60"
          style={{ height: 30, padding: '0 12px', borderRadius: RADII.pill, border: 0, background: 'rgba(255,255,255,.14)', color: '#fff', fontSize: 12.5, fontWeight: 600 }}
        >
          {undoing && <Spinner size={12} color="#fff" />}
          Undo
        </button>
      )}
    </div>
  )
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<Toast[]>([])
  const [mounted, setMounted] = useState(false)
  const nextId = useRef(1)

  useEffect(() => { setMounted(true) }, [])

  const dismiss = useCallback((id: number) => {
    setQueue(q => q.filter(t => t.id !== id))
  }, [])

  const push = useCallback((message: string, variant: ToastVariant, onUndo?: () => Promise<void> | void) => {
    setQueue(q => [...q, { id: nextId.current++, variant, message, onUndo, duration: DURATIONS[variant] }])
  }, [])

  const api = useMemo<ToastApi>(() => ({
    toast:   (m, v = 'success') => push(m, v),
    success: (m) => push(m, 'success'),
    error:   (m) => push(m, 'error'),
    undo:    (m, onUndo) => push(m, 'undo', onUndo),
    dismiss,
  }), [push, dismiss])

  // Only the visible slice runs a timer — a queued toast starts its own clock
  // when it is promoted, so it is never dismissed before anyone has seen it.
  const visible = queue.slice(0, MAX_VISIBLE)

  useEffect(() => {
    if (visible.length === 0) return
    const timers = visible.map(t => setTimeout(() => dismiss(t.id), t.duration))
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible.map(t => t.id).join(','), dismiss])

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mounted && createPortal(
        <div
          className="fixed bottom-6 left-1/2 z-[300] flex flex-col items-center gap-2 pointer-events-none"
          style={{ transform: 'translateX(-50%)' }}
        >
          {visible.map(t => <ToastRow key={t.id} t={t} onDismiss={dismiss} />)}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}
