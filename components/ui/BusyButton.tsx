'use client'

import { useEffect, useRef, useState } from 'react'
import Spinner from '@/components/ui/Spinner'
import { useDelayedFlag } from '@/lib/hooks/useDelayedFlag'

/**
 * The app's one busy-button. Replaces the ~30 hand-rolled
 * `disabled={loading}` + `{loading ? 'Saving…' : 'Save'}` pairs.
 *
 * - Disabled for the whole of `pending`, so a double-submit is impossible even
 *   before the spinner is allowed to show.
 * - The spinner itself waits out useDelayedFlag's 300ms, so an instant save
 *   shows nothing at all.
 * - `pendingLabel` keeps the existing wording convention ("Saving…",
 *   "Signing in…", "Uploading…").
 * - `successLabel` shows "✓ Saved" for SUCCESS_MS after pending falls, matching
 *   what MonthlyTargetsSection / KPITargetsSection / InvoiceEditorClient did by
 *   hand. Omit it and the button simply returns to its normal label.
 */
const SUCCESS_MS = 1200

type Props = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  pending:        boolean
  children:       React.ReactNode
  pendingLabel?:  string
  successLabel?:  string
  /** Set false to suppress the success flash for one particular submit. */
  showSuccess?:   boolean
  spinnerColor?:  string
}

export default function BusyButton({
  pending,
  children,
  pendingLabel,
  successLabel,
  showSuccess = true,
  spinnerColor,
  disabled,
  className = '',
  style,
  ...rest
}: Props) {
  const showSpinner = useDelayedFlag(pending)
  const [succeeded, setSucceeded] = useState(false)
  const wasPending = useRef(false)

  useEffect(() => {
    if (wasPending.current && !pending && successLabel && showSuccess) {
      setSucceeded(true)
      const t = setTimeout(() => setSucceeded(false), SUCCESS_MS)
      wasPending.current = pending
      return () => clearTimeout(t)
    }
    wasPending.current = pending
  }, [pending, successLabel, showSuccess])

  const label = pending
    ? (pendingLabel ?? children)
    : succeeded
      ? successLabel
      : children

  return (
    <button
      {...rest}
      disabled={disabled || pending}
      aria-busy={pending}
      className={`inline-flex items-center justify-center gap-2 disabled:opacity-50 ${className}`}
      style={style}
    >
      {showSpinner && <Spinner size={14} color={spinnerColor ?? 'currentColor'} />}
      <span>{label}</span>
    </button>
  )
}
