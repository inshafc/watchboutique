'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'

export type DraftModule = 'inventory' | 'sale' | 'invoice'
export type DraftStatus = 'checking' | 'prompt' | 'ready'
export type DraftSaveStatus = 'idle' | 'saving' | 'saved'

const DEBOUNCE_MS = 3000
const SAVED_INDICATOR_MS = 2000

// Shared autosave-draft hook for the three new-entry forms. Stores raw form
// state as jsonb in the `drafts` table (one row per user per module) and
// never touches any real business table — currency conversion and the
// actual record insert/update happen only in each form's own, unchanged
// submit logic.
export function useAutosaveDraft<T>(module: DraftModule, state: T) {
  const { user } = useAuth()
  const supabaseRef = useRef(createClient())

  const [status, setStatus] = useState<DraftStatus>('checking')
  const [pendingDraft, setPendingDraft] = useState<T | null>(null)
  const [pendingDraftUpdatedAt, setPendingDraftUpdatedAt] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>('idle')

  const baselineRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  // Look for an existing draft once, on mount.
  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      const { data } = await supabaseRef.current
        .from('drafts')
        .select('draft_data, updated_at')
        .eq('user_id', user!.id)
        .eq('module', module)
        .maybeSingle()
      if (cancelled) return
      if (data) {
        setPendingDraft(data.draft_data as T)
        setPendingDraftUpdatedAt(data.updated_at as string)
        setStatus('prompt')
      } else {
        baselineRef.current = JSON.stringify(stateRef.current)
        setStatus('ready')
      }
    }
    void load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, module])

  const saveNow = useCallback(async () => {
    if (!user || status !== 'ready') return
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    setSaveStatus('saving')
    await supabaseRef.current.from('drafts').upsert(
      { user_id: user.id, module, draft_data: stateRef.current as unknown, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,module' }
    )
    baselineRef.current = JSON.stringify(stateRef.current)
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus(s => (s === 'saved' ? 'idle' : s)), SAVED_INDICATOR_MS)
  }, [user, module, status])

  // Debounced autosave whenever state actually changes from the baseline.
  useEffect(() => {
    if (status !== 'ready' || !user) return
    const snapshot = JSON.stringify(state)
    if (snapshot === baselineRef.current) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { void saveNow() }, DEBOUNCE_MS)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, status, user])

  const restore = useCallback((): T | null => {
    const draft = pendingDraft
    if (draft != null) baselineRef.current = JSON.stringify(draft)
    setStatus('ready')
    setPendingDraft(null)
    setPendingDraftUpdatedAt(null)
    return draft
  }, [pendingDraft])

  const discard = useCallback(async () => {
    if (user) {
      await supabaseRef.current.from('drafts').delete().eq('user_id', user.id).eq('module', module)
    }
    baselineRef.current = JSON.stringify(stateRef.current)
    setStatus('ready')
    setPendingDraft(null)
    setPendingDraftUpdatedAt(null)
  }, [user, module])

  // Call after a successful submit — the draft is no longer needed.
  const clearDraft = useCallback(async () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    if (!user) return
    await supabaseRef.current.from('drafts').delete().eq('user_id', user.id).eq('module', module)
    baselineRef.current = JSON.stringify(stateRef.current)
    setSaveStatus('idle')
  }, [user, module])

  return { status, pendingDraft, pendingDraftUpdatedAt, saveStatus, restore, discard, clearDraft, saveNow }
}
