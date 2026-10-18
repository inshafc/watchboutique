'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/ToastProvider'
import { logActivity } from '@/lib/activityLog'
import { useAuth } from '@/context/AuthContext'
import { generateInvoiceHTML } from '@/lib/generateInvoiceHTML'
import { avatarColor, getInitials } from '@/lib/client-utils'
// invoice-photos bucket must exist in Supabase storage with public access
import InvoicePrintLayout from './InvoicePrintLayout'
import { useAutosaveDraft } from '@/lib/hooks/useAutosaveDraft'
import { useIdleLock } from '@/lib/hooks/useIdleLock'
import DraftBanner from '@/components/drafts/DraftBanner'
import DraftSaveIndicator from '@/components/drafts/DraftSaveIndicator'
import IdleLockOverlay from '@/components/drafts/IdleLockOverlay'
import type { InvoiceWithItems, InvoiceType, InvoiceItemFieldVisibility, SavedBank, SalesManager } from '@/types'
import BusyButton from '@/components/ui/BusyButton'

const inp      = 'w-full bg-white border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all'
const inpLocked = 'w-full bg-gray-50 border border-gray-100 text-gray-500 rounded-xl px-3.5 py-2.5 text-sm'
const lbl      = 'block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5'
const card     = 'bg-white border border-gray-100 rounded-2xl p-5'
const cardHead = 'text-xs font-semibold text-gray-400 uppercase tracking-wider'

const CURRENCIES  = ['LKR', 'USD', 'AED', 'AUD', 'HKD', 'SGD'] as const
const PAY_METHODS = ['Cash', 'Bank Transfer', 'Cash + Bank', 'Installment', 'Card', 'Crypto']
const CONDITIONS  = ['Unworn', 'Pre-Owned']
const TYPES: InvoiceType[] = ['general', 'sale', 'sourcing']
const TYPE_LABEL: Record<InvoiceType, string> = { general: 'General', sale: 'Sale', sourcing: 'Sourcing' }

const STATUS_LABEL: Record<string, { label: string; bg: string; fg: string }> = {
  draft:           { label: 'Draft',           bg: '#f3f4f6', fg: '#6b7280' },
  issued:          { label: 'Issued',          bg: 'rgba(63,95,138,.12)', fg: '#3f5f8a' },
  partially_paid:  { label: 'Partially Paid',  bg: 'rgba(181,118,26,.14)', fg: '#b5761a' },
  paid:            { label: 'Paid',             bg: 'rgba(31,111,67,.12)', fg: '#1f6f43' },
  cancelled:       { label: 'Cancelled',        fg: '#6b7280', bg: '#f3f4f6' },
}

function fmtAmt(amount: number, currency: string): string {
  const opts: Intl.NumberFormatOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  if (currency === 'LKR') return 'LKR ' + amount.toLocaleString('en-LK', opts)
  if (currency === 'USD') return '$ '   + amount.toLocaleString('en-US', opts)
  if (currency === 'AED') return 'AED ' + amount.toLocaleString('en-US', opts)
  if (currency === 'AUD') return 'A$ '  + amount.toLocaleString('en-US', opts)
  return currency + ' ' + amount.toLocaleString('en-US', opts)
}

function fmtDate(d: string): string {
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return d }
}

interface WatchForInvoice {
  id:            string
  watch_name:    string
  reference:     string | null
  serial_number: string | null
  date_on_card:  string | null
  condition:     string | null
  set_details:   string | null
  photos:        string[] | null
  selling_price: number | null
}

interface ClientForInvoice {
  id:           string
  name:         string
  phone:        string | null
  address:      string | null
  email?:       string | null
  club_twb:     boolean
  avatar_color: string | null
}

interface LineItem {
  _key:             string
  watch_id:         string
  description:      string
  reference:        string
  serial_number:    string
  year:             string
  condition:        string
  set_details:      string
  photo_url:        string
  amount:           string
  field_visibility: InvoiceItemFieldVisibility
}

const DEFAULT_ITEM_VISIBILITY: InvoiceItemFieldVisibility = {
  reference: true, serial_number: true, year: true, set_details: true,
}

function emptyItem(): LineItem {
  return {
    _key:          Math.random().toString(36).slice(2),
    watch_id:      '',
    description:   '',
    reference:     '',
    serial_number: '',
    year:          '',
    condition:     '',
    set_details:   '',
    photo_url:     '',
    amount:        '',
    field_visibility: { ...DEFAULT_ITEM_VISIBILITY },
  }
}

function EyeIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
      <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z" />
      <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
      <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z" />
      <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z" />
      <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg className="w-3 h-3 shrink-0" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
    </svg>
  )
}

function EyeToggle({ on, onClick, label }: { on: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label ? label + ' — ' : ''}${on ? 'Hide from invoice' : 'Show on invoice'}`}
      title={on ? 'Hide from invoice' : 'Show on invoice'}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wider transition-colors ${on ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}
    >
      {on ? <EyeIcon /> : <EyeOffIcon />}
      {label ?? (on ? 'On invoice' : 'Hidden')}
    </button>
  )
}

function PillGroup<T extends string>({
  options, value, onChange, labels,
}: {
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  labels?: Partial<Record<T, string>>
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            value === opt ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-400'
          }`}
        >
          {labels?.[opt] ?? opt}
        </button>
      ))}
    </div>
  )
}

// ── Step icons ────────────────────────────────────────────────
function DocStepIcon() { return <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5.5 3.5h6l3 3v10h-9z" strokeLinejoin="round"/><path d="M8 10.5h4M8 13h4" strokeLinecap="round"/></svg> }
function PersonStepIcon() { return <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="7" r="3"/><path d="M4.5 16c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5" strokeLinecap="round"/></svg> }
function ClockStepIcon() { return <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="7"/><path d="M10 6v4l2.5 2" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function CardStepIcon() { return <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="5" width="14" height="10" rx="1.6"/><path d="M3 8.5h14" strokeLinecap="round"/></svg> }
function PencilStepIcon() { return <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13.3 3.7 16.3 6.7 7 16H4v-3z" strokeLinejoin="round"/></svg> }

const STEPS = [
  { key: 'details', label: 'Details',       Icon: DocStepIcon },
  { key: 'client',  label: 'Client',        Icon: PersonStepIcon },
  { key: 'items',   label: 'Line items',    Icon: ClockStepIcon },
  { key: 'payment', label: 'Payment',       Icon: CardStepIcon },
  { key: 'notes',   label: 'Notes & terms', Icon: PencilStepIcon },
] as const

export default function InvoiceEditorClient({
  invoice,
  salesManagers = [],
  banks = [],
  watches = [],
  clients = [],
  logoUrl = null,
}: {
  invoice:         InvoiceWithItems
  salesManagers?:  SalesManager[]
  banks?:          SavedBank[]
  watches?:        WatchForInvoice[]
  clients?:        ClientForInvoice[]
  logoUrl?:        string | null
}) {
  const { profile, setInactivityLogoutSuspended } = useAuth()
  const isViewer = profile?.role === 'viewer'
  const router = useRouter()

  const isDraft = invoice.status === 'draft'

  const [savedOnce, setSavedOnce] = useState(invoice.invoice_items.length > 0 || !isDraft)

  const [fieldVisibility, setFieldVisibility] = useState<Record<string, boolean>>(() => {
    const fv = (invoice as unknown as Record<string, unknown>).field_visibility as Record<string, boolean> | null ?? {}
    return {
      phone:         fv.phone         ?? true,
      address:       fv.address       ?? true,
      sales_manager: fv.sales_manager ?? true,
      notes:         fv.notes         ?? true,
      terms:         fv.terms         ?? true,
      signatures:    fv.signatures    ?? (invoice.show_signatures ?? false),
    }
  })

  const [form, setForm] = useState({
    date:                 invoice.date                   ?? new Date().toISOString().split('T')[0],
    currency:             (invoice.currency ?? 'LKR') as typeof CURRENCIES[number],
    exchange_rate:        invoice.exchange_rate?.toString() ?? '',
    type:                 invoice.type                   as InvoiceType,
    client_id:            invoice.client_id              ?? '',
    bill_to_name:         invoice.bill_to_name            ?? '',
    bill_to_address:      invoice.bill_to_address         ?? '',
    bill_to_phone:        invoice.bill_to_phone           ?? '',
    bill_to_email:        invoice.bill_to_email           ?? '',
    sales_manager:        invoice.sales_manager          ?? '',
    payment_method:       invoice.payment_method         ?? '',
    bank_id:              invoice.bank_id                ?? '',
    show_bank_details:    invoice.show_bank_details      ?? false,
    discount:             invoice.discount?.toString()      ?? '',
    notes:                invoice.notes                     ?? '',
    terms_and_conditions: invoice.terms_and_conditions       ?? '',
  })

  const [items, setItems] = useState<LineItem[]>(() => {
    if (invoice.invoice_items.length > 0) {
      return invoice.invoice_items
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(it => ({
          _key:          it.id,
          watch_id:      it.watch_id ?? '',
          description:   it.description   ?? '',
          reference:     it.reference     ?? '',
          serial_number: it.serial_number ?? '',
          year:          it.year          ?? '',
          condition:     it.condition     ?? '',
          set_details:   it.set_details   ?? '',
          photo_url:     it.photo_url     ?? '',
          amount:        it.line_total?.toString() ?? '',
          field_visibility: it.field_visibility ?? { ...DEFAULT_ITEM_VISIBILITY },
        }))
    }
    return [emptyItem()]
  })

  // ── Wizard step navigation (draft only) ──────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0)
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]))

  function goToStep(i: number) {
    setCurrentStep(i)
    setVisitedSteps(prev => new Set(prev).add(i))
  }

  const [invoiceNumberPreview, setInvoiceNumberPreview] = useState<string | null>(null)
  useEffect(() => {
    if (!isDraft || invoice.invoice_number) return
    const supabase = createClient()
    supabase.rpc('peek_next_invoice_number', { p_doc_type: invoice.doc_type })
      .then(({ data }) => { if (typeof data === 'string') setInvoiceNumberPreview(data) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDraft, invoice.id])

  // Scratch value only — the real payment is recorded via record_invoice_payment()
  // once the invoice is issued (payments can't exist against a draft). Entering
  // an amount here just previews the resulting status and, if non-zero, gets
  // recorded automatically in the same action as Issue.
  const [initialPaymentAmount, setInitialPaymentAmount] = useState('')

  // ── Draft autosave + idle lock (draft invoices only) ────────────────────
  const draftState = useMemo(() => ({
    invoiceId: invoice.id, form, items, fieldVisibility,
  }), [invoice.id, form, items, fieldVisibility])

  const draft = useAutosaveDraft('invoice', draftState)
  const isStaleDraft = draft.status === 'prompt' && draft.pendingDraft?.invoiceId !== invoice.id

  useEffect(() => {
    if (isStaleDraft) void draft.discard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaleDraft])

  useEffect(() => {
    setInactivityLogoutSuspended(true)
    return () => setInactivityLogoutSuspended(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { locked, resume } = useIdleLock(4 * 60 * 1000, () => { void draft.saveNow() })

  function applyDraft(d: typeof draftState) {
    setForm(d.form)
    setItems(d.items)
    setFieldVisibility(d.fieldVisibility)
  }

  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [saved,        setSaved]        = useState(false)
  const [uploadingIdx,      setUploadingIdx]      = useState<number | null>(null)
  const [photoDialogIdx,    setPhotoDialogIdx]    = useState<number | null>(null)
  const [dialogWatchPhotos, setDialogWatchPhotos] = useState<string[]>([])
  const [loadingPhotos,     setLoadingPhotos]     = useState(false)
  const [sourcingPromptOpen, setSourcingPromptOpen] = useState(false)
  const [sourcingAdding,     setSourcingAdding]     = useState(false)
  const toast = useToast()
  const sourcingPromptedRef = useRef(false)

  // ── Issue / payments / credit note ───────────────────────────────────────
  const [issueConfirmOpen,  setIssueConfirmOpen]  = useState(false)
  const [issuing,           setIssuing]           = useState(false)
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false)
  const [recordingPayment,  setRecordingPayment]  = useState(false)
  const [creatingCreditNote, setCreatingCreditNote] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount: '', currency: invoice.currency ?? 'LKR', exchange_rate: invoice.exchange_rate?.toString() ?? '1',
    method: '', reference: '', paid_at: new Date().toISOString().split('T')[0], notes: '',
  })

  // Client dropdown
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)
  const [clientSearch,       setClientSearch]       = useState('')
  const [extraClients,       setExtraClients]       = useState<ClientForInvoice[]>([])
  const [newClientOpen,      setNewClientOpen]      = useState(false)
  const [newClientForm,      setNewClientForm]      = useState({ name: '', phone: '', address: '' })
  const [newClientSaving,    setNewClientSaving]    = useState(false)
  const clientDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (photoDialogIdx === null) { setDialogWatchPhotos([]); return }
    const watchId = items[photoDialogIdx]?.watch_id
    if (!watchId) { setDialogWatchPhotos([]); return }
    setLoadingPhotos(true)
    const supabase = createClient()
    supabase
      .from('watches')
      .select('photos')
      .eq('id', watchId)
      .single()
      .then(({ data }) => {
        setDialogWatchPhotos((data?.photos as string[] | null) ?? [])
        setLoadingPhotos(false)
      })
  }, [photoDialogIdx, items])

  async function handlePhotoReplace(itemKey: string, idx: number, file: File) {
    setUploadingIdx(idx)
    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${invoice.id}/${itemKey}.${ext}`
    const { data, error: upErr } = await supabase.storage
      .from('invoice-photos')
      .upload(path, file, { upsert: true })
    if (!upErr && data) {
      const { data: urlData } = supabase.storage.from('invoice-photos').getPublicUrl(data.path)
      updateItem(idx, 'photo_url', urlData.publicUrl)
    }
    setUploadingIdx(null)
  }

  function toggleVisibility(key: string) {
    setFieldVisibility(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function toggleItemVisibility(idx: number, key: keyof InvoiceItemFieldVisibility) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, field_visibility: { ...it.field_visibility, [key]: !it.field_visibility[key] } } : it))
  }

  function f(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  function updateItem(idx: number, key: keyof Omit<LineItem, '_key' | 'field_visibility'>, value: string) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: value } : it))
  }

  function selectWatch(idx: number, watchId: string) {
    const w = watches.find(w => w.id === watchId)
    if (!w) {
      updateItem(idx, 'watch_id', '')
      return
    }
    const year = w.date_on_card ? new Date(w.date_on_card + 'T00:00:00').getFullYear().toString() : ''
    setItems(prev => prev.map((it, i) => i === idx ? {
      ...it,
      watch_id:      w.id,
      description:   w.watch_name,
      reference:     w.reference     ?? '',
      serial_number: w.serial_number ?? '',
      year,
      condition:     w.condition     ?? '',
      set_details:   w.set_details   ?? '',
      photo_url:     w.photos?.[0]   ?? '',
      amount:        w.selling_price != null ? String(w.selling_price) : it.amount,
    } : it))
  }

  const selectedBank   = banks.find(b => b.id === form.bank_id) ?? null
  const showBankPicker = form.payment_method === 'Bank Transfer' || form.payment_method === 'Cash + Bank'

  const allClients = useMemo(() => [...extraClients, ...clients], [clients, extraClients])
  const selectedClient = allClients.find(c => c.id === form.client_id) ?? null

  const filteredClients = useMemo(() => {
    const q = clientSearch.toLowerCase()
    if (!q) return allClients
    return allClients.filter(c =>
      c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q)
    )
  }, [allClients, clientSearch])

  function selectClient(c: ClientForInvoice | null) {
    setForm(prev => ({
      ...prev,
      client_id:       c?.id      ?? '',
      bill_to_name:    c?.name    ?? '',
      bill_to_phone:   c?.phone   ?? '',
      bill_to_address: c?.address ?? '',
      bill_to_email:   c?.email   ?? '',
    }))
    setClientDropdownOpen(false)
    setClientSearch('')
  }

  useEffect(() => {
    if (!clientDropdownOpen) return
    function onMouseDown(e: MouseEvent) {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setClientDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [clientDropdownOpen])

  async function handleCreateNewClient() {
    if (!newClientForm.name.trim()) return
    setNewClientSaving(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('clients')
      .insert({ name: newClientForm.name.trim(), phone: newClientForm.phone.trim() || null, address: newClientForm.address.trim() || null })
      .select('id, name, phone, address, club_twb, avatar_color')
      .single()
    if (data) {
      const newC = data as ClientForInvoice
      setExtraClients(prev => [newC, ...prev])
      selectClient(newC)
    }
    setNewClientSaving(false)
    setNewClientOpen(false)
    setNewClientForm({ name: '', phone: '', address: '' })
  }

  const num = (s: string) => { const v = parseFloat(s.replace(/,/g, '')); return isNaN(v) ? null : v }

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)
    const supabase = createClient()

    const validItems = items.filter(it => it.description.trim())

    const { error: invErr } = await supabase
      .from('invoices')
      .update({
        date:                 form.date,
        currency:             form.currency,
        exchange_rate:        num(form.exchange_rate),
        type:                 form.type,
        bill_to_name:         form.bill_to_name.trim()    || null,
        bill_to_address:      form.bill_to_address.trim() || null,
        bill_to_phone:        form.bill_to_phone.trim()   || null,
        bill_to_email:        form.bill_to_email.trim()   || null,
        client_id:            form.client_id   || null,
        sales_manager:        form.sales_manager.trim()  || null,
        payment_method:       form.payment_method        || null,
        bank_id:              showBankPicker && form.bank_id ? form.bank_id : null,
        show_bank_details:    form.show_bank_details,
        show_signatures:      fieldVisibility.signatures,
        discount:             num(form.discount) ?? 0,
        notes:                form.notes.trim()                 || null,
        terms_and_conditions: form.terms_and_conditions.trim() || null,
        field_visibility:     fieldVisibility,
      })
      .eq('id', invoice.id)

    if (invErr) { setError(invErr.message); setSaving(false); return }

    // Line items are relational — replace the set on every save, same
    // delete+reinsert pattern this editor already used for the old mirror
    // table. RLS only allows this while the invoice is still 'draft'.
    await supabase.from('invoice_items').delete().eq('invoice_id', invoice.id)
    if (validItems.length > 0) {
      await supabase.from('invoice_items').insert(
        validItems.map((it, i) => ({
          invoice_id:    invoice.id,
          watch_id:      it.watch_id || null,
          description:   it.description.trim(),
          reference:     it.reference.trim()     || null,
          serial_number: it.serial_number.trim() || null,
          year:          it.year.trim()           || null,
          condition:     it.condition             || null,
          set_details:   it.set_details.trim()   || null,
          photo_url:     it.photo_url.trim()      || null,
          quantity:      1,
          unit_price:    num(it.amount),
          line_total:    num(it.amount),
          sort_order:    i,
          field_visibility: it.field_visibility,
        }))
      )
    }

    void logActivity({ actionType: 'invoice_updated', entityType: 'invoice', entityId: invoice.id, entityLabel: invoice.invoice_number ?? 'Draft' })
    await draft.clearDraft()
    setSaving(false)
    setSaved(true)
    setSavedOnce(true)
    setTimeout(() => setSaved(false), 2000)
    if (form.type === 'sourcing' && !sourcingPromptedRef.current) {
      sourcingPromptedRef.current = true
      setSourcingPromptOpen(true)
    }
    router.refresh()
  }, [form, items, invoice.id, invoice.invoice_number, showBankPicker, fieldVisibility, draft, router])

  const handleAddToSourcedOrders = useCallback(async () => {
    setSourcingAdding(true)
    const supabase = createClient()
    const firstItem = items.find(it => it.description.trim())
    const parseAmt = (s: string) => { const v = parseFloat(s.replace(/,/g, '')); return isNaN(v) ? null : v }
    const year = firstItem?.year.trim()
    const dateOnCard = year && /^\d{4}$/.test(year) ? `${year}-01-01` : null
    const { data: watchData } = await supabase.from('watches').insert({
      watch_name:    firstItem?.description.trim() || 'Unknown',
      reference:     firstItem?.reference.trim()     || null,
      serial_number: firstItem?.serial_number.trim() || null,
      date_on_card:  dateOnCard,
      condition:     firstItem?.condition            || 'Good',
      set_details:   'Watch Only',
      purchase_cost: firstItem ? parseAmt(firstItem.amount) : null,
      currency:      'LKR',
      status:        'Available',
      watch_status:  'sourced',
      photos:        [],
      is_draft:      true,
    }).select('id').single()
    if (watchData) {
      await supabase.from('invoices').update({ sourced_watch_id: watchData.id }).eq('id', invoice.id)
    }
    setSourcingAdding(false)
    setSourcingPromptOpen(false)
    toast.success('Watch added to sourced inventory')
  }, [invoice.id, items, toast])

  const handleIssue = useCallback(async () => {
    setIssuing(true)
    const supabase = createClient()
    const { data, error: issueErr } = await supabase.rpc('issue_invoice', { p_invoice_id: invoice.id })
    if (issueErr) { setIssuing(false); toast.error(issueErr.message); return }

    const initialAmt = num(initialPaymentAmount)
    if (initialAmt && initialAmt > 0) {
      const { error: payErr } = await supabase.rpc('record_invoice_payment', {
        p_invoice_id:    invoice.id,
        p_amount:        initialAmt,
        p_currency:      form.currency,
        p_exchange_rate: num(form.exchange_rate) ?? 1,
        p_method:        form.payment_method || null,
        p_reference:     null,
        p_paid_at:       new Date().toISOString().split('T')[0],
        p_notes:         'Recorded at issue',
      })
      if (payErr) toast.error(`Issued as ${data}, but the payment failed to record: ${payErr.message}`)
    }

    setIssuing(false)
    setIssueConfirmOpen(false)
    void logActivity({ actionType: 'invoice_issued', entityType: 'invoice', entityId: invoice.id, entityLabel: data as string })
    toast.success(`Issued as ${data}`)
    router.refresh()
  }, [invoice.id, initialPaymentAmount, form.currency, form.exchange_rate, form.payment_method, router, toast])

  const handleRecordPayment = useCallback(async () => {
    setRecordingPayment(true)
    const supabase = createClient()
    const { error: payErr } = await supabase.rpc('record_invoice_payment', {
      p_invoice_id:    invoice.id,
      p_amount:        num(paymentForm.amount),
      p_currency:      paymentForm.currency,
      p_exchange_rate: num(paymentForm.exchange_rate) ?? 1,
      p_method:        paymentForm.method || null,
      p_reference:     paymentForm.reference || null,
      p_paid_at:       paymentForm.paid_at,
      p_notes:         paymentForm.notes || null,
    })
    setRecordingPayment(false)
    if (payErr) { toast.error(payErr.message); return }
    setRecordPaymentOpen(false)
    void logActivity({ actionType: 'invoice_payment_recorded', entityType: 'invoice', entityId: invoice.id, entityLabel: invoice.invoice_number ?? '' })
    toast.success('Payment recorded')
    router.refresh()
  }, [invoice.id, invoice.invoice_number, paymentForm, router, toast])

  const handleCreateCreditNote = useCallback(async () => {
    setCreatingCreditNote(true)
    const supabase = createClient()
    const { data, error: cnErr } = await supabase.rpc('create_credit_note', { p_related_invoice_id: invoice.id })
    setCreatingCreditNote(false)
    if (cnErr) { toast.error(cnErr.message); return }
    void logActivity({ actionType: 'credit_note_created', entityType: 'invoice', entityId: data as string, entityLabel: `Credit note for ${invoice.invoice_number ?? invoice.id}` })
    router.push(`/dashboard/invoices/${data}/edit`)
  }, [invoice.id, invoice.invoice_number, router, toast])

  const previewItems = items.map(it => ({
    description:   it.description,
    reference:     it.reference     || null,
    serial_number: it.serial_number || null,
    year:          it.year          || null,
    condition:     it.condition     || null,
    set_details:   it.set_details   || null,
    photo_url:     it.photo_url     || null,
    quantity:      1,
    line_total:    num(it.amount),
    field_visibility: it.field_visibility,
  }))

  const invoiceSubtotal = items.reduce((s, it) => s + (num(it.amount) ?? 0), 0)
  const invoiceDiscount = num(form.discount) ?? 0
  const invoiceTotal    = invoiceSubtotal - invoiceDiscount

  const payments  = invoice.invoice_payments ?? []
  const paidTotal = payments.filter(p => p.currency === form.currency).reduce((s, p) => s + p.amount, 0)
  const balanceDue = Math.max(0, (invoice.total ?? invoiceTotal) - paidTotal)

  // Draft-only preview of what status would become if issued right now with
  // the scratch "amount paid" value entered in Step 4 — nothing is written
  // until Issue is actually clicked.
  const previewPaid = num(initialPaymentAmount) ?? 0
  const draftPreviewStatus: 'draft' | 'partially_paid' | 'paid' =
    previewPaid <= 0 ? 'draft' : invoiceTotal > 0 && previewPaid >= invoiceTotal ? 'paid' : 'partially_paid'
  const topBarStatusKey = isDraft ? draftPreviewStatus : invoice.status
  const topBarStatusLabel = isDraft
    ? (draftPreviewStatus === 'draft' ? 'Unpaid' : STATUS_LABEL[draftPreviewStatus].label)
    : STATUS_LABEL[invoice.status].label

  const previewBank = showBankPicker && form.show_bank_details && selectedBank
    ? { bank_name: selectedBank.bank_name, account_name: selectedBank.account_name, account_number: selectedBank.account_number, branch: selectedBank.branch, swift_code: selectedBank.swift_code, address: selectedBank.address }
    : (invoice.bank_snapshot ?? null)

  const handleDownload = () => {
    const html = generateInvoiceHTML({
      invoiceNumber:      invoice.invoice_number,
      docType:            invoice.doc_type,
      date:               form.date,
      currency:           form.currency,
      type:               form.type,
      status:             invoice.status,
      billToName:         form.bill_to_name    || null,
      billToPhone:        form.bill_to_phone   || null,
      billToAddress:      form.bill_to_address || null,
      salesManager:       form.sales_manager  || null,
      paymentMethod:      form.payment_method || null,
      showBankDetails:    form.show_bank_details,
      bank:               previewBank,
      discount:           invoiceDiscount,
      paidTotal:          isDraft ? null : paidTotal,
      notes:              form.notes              || null,
      termsAndConditions: form.terms_and_conditions || null,
      logoUrl:            logoUrl,
      fieldVisibility: {
        phone:         fieldVisibility.phone         ?? true,
        address:       fieldVisibility.address       ?? true,
        sales_manager: fieldVisibility.sales_manager ?? true,
        notes:         fieldVisibility.notes         ?? true,
        terms:         fieldVisibility.terms         ?? true,
        signatures:    fieldVisibility.signatures    ?? false,
      },
      items:              previewItems,
    })
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    // A real download via a temporary <a download> click, not
    // window.open(blobURL) — the latter gets silently popup-blocked in
    // some browsers/contexts, which is why Download used to open a blank
    // tab instead of producing anything.
    const a = document.createElement('a')
    a.href = url
    a.download = `${invoice.invoice_number ?? 'draft-invoice'}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    void logActivity({ actionType: 'invoice_downloaded', entityType: 'invoice', entityId: invoice.id, entityLabel: invoice.invoice_number ?? 'Draft' })
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-full">
      {locked && <IdleLockOverlay onResume={resume} />}

      {/* ── Left panel: form ────────────────────────────────── */}
      <div className="flex-1 min-w-0 lg:overflow-y-auto">
        {/* Toolbar */}
        <div className="border-b border-gray-100 bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between gap-3 px-4 lg:px-6 py-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/dashboard/invoices" className="text-sm text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1.5 shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Invoicing
              </Link>
              <span className="text-gray-200 shrink-0">/</span>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight truncate">
                {isDraft ? 'New Invoice' : (invoice.invoice_number ?? 'Draft')}
              </h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-full px-3 py-1.5 text-[11.5px] font-semibold shrink-0" style={{ background: STATUS_LABEL[topBarStatusKey]?.bg ?? '#f3f4f6', color: STATUS_LABEL[topBarStatusKey]?.fg ?? '#6b7280' }}>
                {topBarStatusLabel}
              </span>
              {savedOnce && (
                <>
                  <Link
                    href={`/dashboard/invoices/${invoice.id}/print`}
                    target="_blank"
                    onClick={() => void logActivity({ actionType: 'invoice_printed', entityType: 'invoice', entityId: invoice.id, entityLabel: invoice.invoice_number ?? 'Draft' })}
                    className="hidden lg:flex text-sm text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M5 1a2 2 0 0 0-2 2v1h10V3a2 2 0 0 0-2-2H5zm6 8H5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1z"/><path d="M0 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2H2a2 2 0 0 1-2-2V7zm2.5 1a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/></svg>
                    Print
                  </Link>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="hidden lg:flex text-sm text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
                    Download
                  </button>
                </>
              )}
              {isDraft && <DraftSaveIndicator status={draft.saveStatus} />}
              {!isViewer && isDraft && (
                <BusyButton
                  type="button"
                  onClick={handleSave}
                  pending={saving}
                  pendingLabel="Saving…"
                  className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                >
                  {saved ? '✓ Saved' : 'Save draft'}
                </BusyButton>
              )}
              {!isViewer && isDraft && (
                <button
                  type="button"
                  onClick={() => setIssueConfirmOpen(true)}
                  disabled={!items.some(it => it.description.trim())}
                  className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-gray-900 hover:bg-black px-4 py-2 rounded-xl transition-colors disabled:opacity-40"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M13.485 1.431a1.473 1.473 0 0 1 2.104 2.062l-7.84 9.801a1.473 1.473 0 0 1-2.12.04L.431 8.138a1.473 1.473 0 0 1 2.084-2.083l4.111 4.112 6.82-8.69a.486.486 0 0 1 .04-.046z"/></svg>
                  Issue invoice
                </button>
              )}
            </div>
          </div>
          {savedOnce && (
            <div className="flex gap-2 px-4 pb-3 lg:hidden">
              <Link
                href={`/dashboard/invoices/${invoice.id}/print`}
                target="_blank"
                onClick={() => void logActivity({ actionType: 'invoice_printed', entityType: 'invoice', entityId: invoice.id, entityLabel: invoice.invoice_number ?? 'Draft' })}
                className="flex-1 text-sm text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M5 1a2 2 0 0 0-2 2v1h10V3a2 2 0 0 0-2-2H5zm6 8H5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1z"/><path d="M0 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2H2a2 2 0 0 1-2-2V7zm2.5 1a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/></svg>
                Print
              </Link>
              <button
                type="button"
                onClick={handleDownload}
                className="flex-1 text-sm text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
                Download
              </button>
            </div>
          )}
        </div>

        {isDraft && draft.status === 'prompt' && !isStaleDraft && (
          <div className="mx-6 mt-4">
            <DraftBanner
              updatedAt={draft.pendingDraftUpdatedAt}
              onRestore={() => { const d = draft.restore(); if (d) applyDraft(d) }}
              onDiscard={() => void draft.discard()}
            />
          </div>
        )}

        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        {!isDraft && (
          <div className="mx-6 mt-4 bg-gray-50 border border-gray-200 text-gray-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
            <LockIcon />
            This {invoice.doc_type === 'credit_note' ? 'credit note' : 'invoice'} has been issued and is read-only. Only payments can be recorded against it.
          </div>
        )}

        <div className="p-6 space-y-4">

          {isDraft ? (
            <>
              {/* ── Step nav ──────────────────────────────────── */}
              <div className={card}>
                <div className="flex items-center justify-between mb-4">
                  <span className={cardHead}>Step {currentStep + 1} of {STEPS.length} — <span className="text-gray-900 normal-case font-semibold">{STEPS[currentStep].label}</span></span>
                  <span className="text-xs text-gray-400">{Math.round(((currentStep + 1) / STEPS.length) * 100)}% complete</span>
                </div>
                <div className="flex items-center gap-2">
                  {STEPS.map((s, i) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => goToStep(i)}
                      aria-label={s.label}
                      title={s.label}
                      className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        i === currentStep
                          ? 'bg-gray-900 text-white'
                          : visitedSteps.has(i)
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                            : 'bg-white border border-gray-200 text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      <s.Icon />
                    </button>
                  ))}
                  <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden ml-1">
                    <div className="h-full bg-gray-900 transition-all" style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }} />
                  </div>
                </div>
              </div>

              {/* ── Step 1: Details ───────────────────────────── */}
              {currentStep === 0 && (
                <div className={card}>
                  <p className={cardHead + ' mb-4'}>Invoice</p>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={lbl}>Invoice Number</label>
                        <div className="w-full bg-gray-50 border border-gray-100 text-gray-500 rounded-xl px-3.5 py-2.5 text-sm font-mono select-all">
                          {invoice.invoice_number ?? invoiceNumberPreview ?? '…'}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">Preview — the real number locks in when you Issue</p>
                      </div>
                      <div>
                        <label className={lbl}>Date</label>
                        <input type="date" value={form.date} onChange={f('date')} className={inp} />
                      </div>
                    </div>
                    <div>
                      <label className={lbl}>Type</label>
                      <PillGroup options={TYPES} value={form.type} onChange={v => setForm(p => ({ ...p, type: v }))} labels={TYPE_LABEL} />
                    </div>
                    <div>
                      <label className={lbl}>Currency</label>
                      <PillGroup options={CURRENCIES} value={form.currency} onChange={v => setForm(p => ({ ...p, currency: v }))} />
                    </div>
                    {form.currency !== 'LKR' && (
                      <div>
                        <label className={lbl}>Exchange Rate (1 {form.currency} = LKR)</label>
                        <input type="number" value={form.exchange_rate} onChange={f('exchange_rate')} placeholder="e.g. 320" className={inp} />
                      </div>
                    )}
                  </div>
                  <div className="pt-5">
                    <button type="button" onClick={() => goToStep(1)} className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-black transition-colors">
                      Next — Client
                      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 2: Client ────────────────────────────── */}
              {currentStep === 1 && (
                <div className={card}>
                  <p className={cardHead + ' mb-4'}>Billing Details</p>
                  <div className="space-y-3">
                    <div ref={clientDropdownRef} className="relative">
                      <label className={lbl}>Existing Client</label>
                      <button
                        type="button"
                        onClick={() => setClientDropdownOpen(o => !o)}
                        className="w-full flex items-center gap-2.5 bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-left hover:border-gray-400 transition-colors"
                      >
                        {selectedClient ? (
                          <>
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold shrink-0 ${avatarColor(selectedClient.name, selectedClient.avatar_color)}`}>
                              {getInitials(selectedClient.name)}
                            </div>
                            <span className="flex-1 font-medium text-gray-900 truncate">{selectedClient.name}</span>
                            {selectedClient.club_twb && (
                              <span className="text-[9px] font-bold bg-violet-100 text-violet-700 rounded px-1.5 py-0.5">Club TWB</span>
                            )}
                          </>
                        ) : (
                          <span className="flex-1 text-gray-400">Select a client…</span>
                        )}
                        <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      {clientDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 overflow-hidden">
                          <div className="p-2 border-b border-gray-100">
                            <input
                              autoFocus
                              type="text"
                              value={clientSearch}
                              onChange={e => setClientSearch(e.target.value)}
                              placeholder="Search clients…"
                              className="w-full text-sm px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 transition-colors"
                            />
                          </div>
                          <div className="max-h-52 overflow-y-auto">
                            {filteredClients.length === 0 && (
                              <p className="text-sm text-gray-400 px-3 py-2.5">No clients found</p>
                            )}
                            {filteredClients.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => selectClient(c)}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                              >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${avatarColor(c.name, c.avatar_color)}`}>
                                  {getInitials(c.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-medium text-gray-900 truncate">{c.name}</span>
                                    {c.club_twb && <span className="text-[9px] font-bold bg-violet-100 text-violet-700 rounded px-1.5 py-0.5 shrink-0">Club TWB</span>}
                                  </div>
                                  {c.phone && <p className="text-xs text-gray-400 truncate">{c.phone}</p>}
                                </div>
                              </button>
                            ))}
                          </div>
                          <div className="border-t border-gray-100">
                            <button
                              type="button"
                              onClick={() => { setClientDropdownOpen(false); setNewClientOpen(true) }}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M8 3v10M3 8h10" strokeLinecap="round"/>
                              </svg>
                              New client
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className={lbl}>Client Name</label>
                      <input type="text" value={form.bill_to_name} onChange={f('bill_to_name')} placeholder="Client name" className={inp} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={lbl} style={{ marginBottom: 0 }}>Phone</span>
                        <EyeToggle on={fieldVisibility.phone} onClick={() => toggleVisibility('phone')} />
                      </div>
                      <input type="text" value={form.bill_to_phone} onChange={f('bill_to_phone')} placeholder="Phone number" className={`${inp} ${!fieldVisibility.phone ? 'opacity-50' : ''}`} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={lbl} style={{ marginBottom: 0 }}>Address</span>
                        <EyeToggle on={fieldVisibility.address} onClick={() => toggleVisibility('address')} />
                      </div>
                      <input type="text" value={form.bill_to_address} onChange={f('bill_to_address')} placeholder="Address" className={`${inp} ${!fieldVisibility.address ? 'opacity-50' : ''}`} />
                    </div>
                    <div>
                      <label className={lbl}>Email</label>
                      <input type="email" value={form.bill_to_email} onChange={f('bill_to_email')} placeholder="client@example.com" className={inp} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={lbl} style={{ marginBottom: 0 }}>Sales Manager</span>
                        <EyeToggle on={fieldVisibility.sales_manager} onClick={() => toggleVisibility('sales_manager')} />
                      </div>
                      <PillGroup
                        options={
                          form.sales_manager && !salesManagers.some(sm => sm.name === form.sales_manager)
                            ? [form.sales_manager, ...salesManagers.map(sm => sm.name)]
                            : salesManagers.map(sm => sm.name)
                        }
                        value={form.sales_manager}
                        onChange={v => setForm(p => ({ ...p, sales_manager: v }))}
                      />
                    </div>
                  </div>
                  <div className="pt-5 flex gap-2">
                    <button type="button" onClick={() => goToStep(0)} className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">Back</button>
                    <button type="button" onClick={() => goToStep(2)} className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-black transition-colors">
                      Next — Line items
                      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 3: Line items ────────────────────────── */}
              {currentStep === 2 && (
                <div className={card}>
                  <p className={cardHead + ' mb-4'}>Line Items</p>
                  <div className="space-y-4">
                    {items.map((item, idx) => (
                      <div key={item._key} className="border border-gray-100 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-gray-500">Item {idx + 1} of {items.length}</p>
                          {items.length > 1 && (
                            <button
                              type="button"
                              aria-label="Remove item"
                              onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          <EyeToggle label="Reference" on={item.field_visibility.reference}     onClick={() => toggleItemVisibility(idx, 'reference')} />
                          <EyeToggle label="Serial"    on={item.field_visibility.serial_number} onClick={() => toggleItemVisibility(idx, 'serial_number')} />
                          <EyeToggle label="Year"      on={item.field_visibility.year}          onClick={() => toggleItemVisibility(idx, 'year')} />
                          <EyeToggle label="Set details" on={item.field_visibility.set_details} onClick={() => toggleItemVisibility(idx, 'set_details')} />
                        </div>

                        {form.type === 'sale' && watches.length > 0 && (
                          <div>
                            <label className={lbl}>Select Watch</label>
                            <select
                              value={item.watch_id}
                              onChange={e => selectWatch(idx, e.target.value)}
                              className={inp}
                            >
                              <option value="">Select watch…</option>
                              {watches.map(w => (
                                <option key={w.id} value={w.id}>
                                  {w.watch_name}{w.reference ? ` · ${w.reference}` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 shrink-0">
                            {item.photo_url ? (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={item.photo_url} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-100" />
                                <button
                                  type="button"
                                  aria-label="Remove photo"
                                  onClick={() => updateItem(idx, 'photo_url', '')}
                                  className="absolute -top-1 -right-1 w-4 h-4 bg-gray-800 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs leading-none transition-colors"
                                  title="Remove photo"
                                >×</button>
                              </>
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                                <svg className="w-5 h-5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <circle cx="12" cy="12" r="7"/><path d="M12 9v3l2 2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9.5 3h5M9.5 21h5" strokeLinecap="round"/>
                                </svg>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setPhotoDialogIdx(idx)}
                            className="text-xs text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors"
                          >
                            {item.photo_url ? 'Replace' : 'Add Photo'}
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={lbl}>Watch Name *</label>
                            <input type="text" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Rolex Submariner" className={inp} />
                          </div>
                          <div>
                            <label className={lbl}>Reference</label>
                            <input type="text" value={item.reference} onChange={e => updateItem(idx, 'reference', e.target.value)} placeholder="126610LN" className={inp} />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className={lbl}>Serial</label>
                            <input type="text" value={item.serial_number} onChange={e => updateItem(idx, 'serial_number', e.target.value)} className={inp} />
                          </div>
                          <div>
                            <label className={lbl}>Year</label>
                            <input type="text" value={item.year} onChange={e => updateItem(idx, 'year', e.target.value)} maxLength={4} placeholder="2023" className={inp} />
                          </div>
                          <div>
                            <label className={lbl}>Condition</label>
                            <select value={item.condition} onChange={e => updateItem(idx, 'condition', e.target.value)} className={inp}>
                              <option value="">—</option>
                              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className={lbl}>Set Details</label>
                          <input type="text" value={item.set_details} onChange={e => updateItem(idx, 'set_details', e.target.value)} placeholder="Box, papers, etc." className={inp} />
                        </div>
                        <div>
                          <label className={lbl}>Amount</label>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-400 shrink-0">{form.currency}</span>
                            <input type="text" value={item.amount} onChange={e => updateItem(idx, 'amount', e.target.value)} placeholder="0" className={inp} />
                          </div>
                        </div>
                      </div>
                    ))}

                    {items.length < 3 && (
                      <button
                        type="button"
                        onClick={() => setItems(prev => [...prev, emptyItem()])}
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 1v10M1 6h10" strokeLinecap="round"/></svg>
                        Add Line Item
                      </button>
                    )}
                    {items.length >= 3 && (
                      <p className="text-xs text-gray-300">Maximum 3 line items</p>
                    )}
                  </div>
                  <div className="pt-5 flex gap-2">
                    <button type="button" onClick={() => goToStep(1)} className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">Back</button>
                    <button type="button" onClick={() => goToStep(3)} className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-black transition-colors">
                      Next — Payment
                      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 4: Payment ───────────────────────────── */}
              {currentStep === 3 && (
                <div className={card}>
                  <p className={cardHead + ' mb-4'}>Payment</p>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className={cardHead}>Line items total</span>
                      <span className="text-sm font-medium text-gray-700 tabular-nums">{fmtAmt(invoiceSubtotal, form.currency)}</span>
                    </div>
                    <div>
                      <label className={lbl}>Discount</label>
                      <input type="text" value={form.discount} onChange={f('discount')} placeholder="0" className={inp} />
                    </div>
                    <div className="flex justify-between items-center bg-gray-900 text-white rounded-xl px-4 py-3">
                      <span className="text-xs font-bold uppercase tracking-widest">Total</span>
                      <span className="text-base font-bold tabular-nums">{fmtAmt(invoiceTotal, form.currency)}</span>
                    </div>

                    <div>
                      <label className={lbl}>Amount Paid</label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-400 shrink-0">{form.currency}</span>
                        <input type="text" value={initialPaymentAmount} onChange={e => setInitialPaymentAmount(e.target.value)} placeholder="0" className={inp} />
                        <button
                          type="button"
                          onClick={() => setInitialPaymentAmount(String(invoiceTotal))}
                          className="shrink-0 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-2.5 rounded-xl transition-colors whitespace-nowrap"
                        >
                          Full amount
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">Recorded as the first payment automatically when you Issue</p>
                    </div>

                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Balance Due</span>
                      <span className="text-sm font-bold text-gray-900 tabular-nums">{fmtAmt(Math.max(0, invoiceTotal - previewPaid), form.currency)}</span>
                    </div>

                    <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                      <span className="text-sm text-gray-500">Status is set automatically</span>
                      <span className="rounded-full px-3 py-1 text-[11.5px] font-semibold" style={{ background: STATUS_LABEL[draftPreviewStatus === 'draft' ? 'draft' : draftPreviewStatus].bg, color: STATUS_LABEL[draftPreviewStatus === 'draft' ? 'draft' : draftPreviewStatus].fg }}>
                        {draftPreviewStatus === 'draft' ? 'Unpaid' : STATUS_LABEL[draftPreviewStatus].label}
                      </span>
                    </div>

                    <div>
                      <label className={lbl}>Method</label>
                      <PillGroup options={PAY_METHODS} value={form.payment_method} onChange={v => setForm(p => ({ ...p, payment_method: v }))} />
                    </div>

                    {showBankPicker && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={lbl} style={{ marginBottom: 0 }}>Receiving Account</span>
                          <button
                            type="button"
                            onClick={() => setForm(p => ({ ...p, show_bank_details: !p.show_bank_details }))}
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wider transition-colors ${form.show_bank_details ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}
                          >
                            {form.show_bank_details ? <EyeIcon /> : <EyeOffIcon />}
                            {form.show_bank_details ? 'On invoice' : 'Hidden'}
                          </button>
                        </div>
                        <div className="space-y-2">
                          {banks.filter(b => b.is_active).map(b => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => setForm(p => ({ ...p, bank_id: b.id }))}
                              className={`w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${form.bank_id === b.id ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900">{b.bank_name}</p>
                                {b.account_number && <p className="text-xs text-gray-400">{b.account_number}{b.branch ? ` · ${b.branch}` : ''}</p>}
                              </div>
                              <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${form.bank_id === b.id ? 'border-gray-900' : 'border-gray-300'}`}>
                                {form.bank_id === b.id && <span className="w-2 h-2 rounded-full bg-gray-900" />}
                              </span>
                            </button>
                          ))}
                          {banks.filter(b => b.is_active).length === 0 && (
                            <p className="text-xs text-gray-400">No saved bank accounts — add one in Settings → Bank Accounts.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="pt-5 flex gap-2">
                    <button type="button" onClick={() => goToStep(2)} className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">Back</button>
                    <button type="button" onClick={() => goToStep(4)} className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-black transition-colors">
                      Next — Notes
                      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 5: Notes & terms ─────────────────────── */}
              {currentStep === 4 && (
                <div className={card}>
                  <p className={cardHead + ' mb-4'}>Notes &amp; Terms</p>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={lbl} style={{ marginBottom: 0 }}>Notes</span>
                        <EyeToggle on={fieldVisibility.notes} onClick={() => toggleVisibility('notes')} />
                      </div>
                      <textarea value={form.notes} onChange={f('notes')} rows={3} placeholder="Optional notes…" className={inp} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={lbl} style={{ marginBottom: 0 }}>Terms &amp; Conditions</span>
                        <EyeToggle on={fieldVisibility.terms} onClick={() => toggleVisibility('terms')} />
                      </div>
                      <textarea value={form.terms_and_conditions} onChange={f('terms_and_conditions')} rows={4} placeholder="e.g. All sales are final. No returns accepted…" className={inp} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Signature blocks</span>
                      <EyeToggle on={fieldVisibility.signatures} onClick={() => toggleVisibility('signatures')} />
                    </div>
                  </div>
                  <div className="pt-5 flex gap-2">
                    <button type="button" onClick={() => goToStep(3)} className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">Back</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* ── Invoice Info (locked) ─────────────────────── */}
              <div className={card}>
                <p className={cardHead + ' mb-4'}>{invoice.doc_type === 'credit_note' ? 'Credit Note' : invoice.doc_type === 'proforma' ? 'Proforma Invoice' : 'Invoice'}</p>
                <div className="space-y-4">
                  <div>
                    <label className={lbl}>Invoice Number</label>
                    <div className="w-full bg-gray-50 border border-gray-100 text-gray-500 rounded-xl px-3.5 py-2.5 text-sm font-mono select-all">
                      {invoice.invoice_number ?? 'Assigned when issued'}
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>Type</label>
                    <div className={inpLocked}>{TYPE_LABEL[form.type]}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Date</label>
                      <div className={inpLocked}>{fmtDate(form.date)}</div>
                    </div>
                    <div>
                      <label className={lbl}>Currency</label>
                      <div className={inpLocked}>{form.currency}</div>
                    </div>
                  </div>
                  {form.currency !== 'LKR' && (
                    <div>
                      <label className={lbl}>Exchange Rate (1 {form.currency} = LKR)</label>
                      <div className={inpLocked}>{form.exchange_rate || '—'}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Billing Details (locked) ──────────────────── */}
              <div className={card}>
                <p className={cardHead + ' mb-4'}>Billing Details</p>
                <div className="space-y-3">
                  <div>
                    <label className={lbl}>Bill To — Name</label>
                    <div className={inpLocked}>{form.bill_to_name || '—'}</div>
                  </div>
                  <div>
                    <label className={lbl}>Phone</label>
                    <div className={inpLocked}>{form.bill_to_phone || '—'}</div>
                  </div>
                  <div>
                    <label className={lbl}>Address</label>
                    <div className={inpLocked}>{form.bill_to_address || '—'}</div>
                  </div>
                  <div>
                    <label className={lbl}>Email</label>
                    <div className={inpLocked}>{form.bill_to_email || '—'}</div>
                  </div>
                </div>
              </div>

              {/* ── Sale Details (locked) ─────────────────────── */}
              <div className={card}>
                <p className={cardHead + ' mb-4'}>Sale Details</p>
                <div>
                  <label className={lbl}>Sales Manager</label>
                  <div className={inpLocked}>{form.sales_manager || '—'}</div>
                </div>
              </div>

              {/* ── Line Items (locked) ───────────────────────── */}
              <div className={card}>
                <p className={cardHead + ' mb-4'}>Line Items</p>
                <div className="space-y-4">
                  {items.map(item => (
                    <div key={item._key} className="border border-gray-100 rounded-xl p-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-gray-400">Description: </span><span className="font-medium text-gray-800">{item.description || '—'}</span></div>
                        <div><span className="text-gray-400">Reference: </span><span className="text-gray-700">{item.reference || '—'}</span></div>
                        <div><span className="text-gray-400">Serial: </span><span className="text-gray-700">{item.serial_number || '—'}</span></div>
                        <div><span className="text-gray-400">Year: </span><span className="text-gray-700">{item.year || '—'}</span></div>
                        <div><span className="text-gray-400">Condition: </span><span className="text-gray-700">{item.condition || '—'}</span></div>
                        <div><span className="text-gray-400">Set Details: </span><span className="text-gray-700">{item.set_details || '—'}</span></div>
                        <div><span className="text-gray-400">Amount: </span><span className="font-semibold text-gray-900">{fmtAmt(num(item.amount) ?? 0, form.currency)}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Payment Summary (locked) ──────────────────── */}
              {items.some(it => it.description.trim()) && (
                <div className={card}>
                  <p className={cardHead + ' mb-4'}>Payment Summary</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className={cardHead}>Subtotal</span>
                      <span className="text-sm font-medium text-gray-700 tabular-nums">{fmtAmt(invoiceSubtotal, form.currency)}</span>
                    </div>
                    {invoiceDiscount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className={cardHead}>Discount</span>
                        <span className="text-sm font-medium text-gray-700 tabular-nums">{fmtAmt(invoiceDiscount, form.currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center bg-gray-900 text-white rounded-xl px-4 py-3">
                      <span className="text-xs font-bold uppercase tracking-widest">Total</span>
                      <span className="text-base font-bold tabular-nums">{fmtAmt(invoiceTotal, form.currency)}</span>
                    </div>

                    {payments.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {payments.map(p => (
                          <div key={p.id} className="flex justify-between items-center text-xs text-gray-500">
                            <span>{fmtDate(p.paid_at)} · {p.method || 'Payment'}{p.reference ? ` · ${p.reference}` : ''}</span>
                            <span className="font-semibold text-gray-700 tabular-nums">{fmtAmt(p.amount, p.currency)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {balanceDue > 0 && (
                      <div className="flex justify-between items-center px-1 pt-1 border-t border-red-100">
                        <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Balance Due</span>
                        <span className="text-sm font-bold text-red-600 tabular-nums">{fmtAmt(balanceDue, form.currency)}</span>
                      </div>
                    )}
                    {invoice.status === 'paid' && (
                      <div className="flex justify-center pt-1">
                        <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1">✓ Paid in Full</span>
                      </div>
                    )}
                    {!isViewer && invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
                      <button
                        type="button"
                        onClick={() => { setPaymentForm(p => ({ ...p, amount: '', currency: form.currency })); setRecordPaymentOpen(true) }}
                        className="w-full bg-gray-900 text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-black transition-colors mt-1"
                      >
                        Record Payment
                      </button>
                    )}
                    {!isViewer && invoice.doc_type !== 'credit_note' && (invoice.status === 'issued' || invoice.status === 'partially_paid' || invoice.status === 'paid') && (
                      <BusyButton
                        type="button"
                        onClick={handleCreateCreditNote}
                        pending={creatingCreditNote}
                        pendingLabel="Creating…"
                        className="w-full bg-white text-gray-700 border border-gray-200 text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        Create Credit Note
                      </BusyButton>
                    )}
                  </div>
                </div>
              )}

              {/* ── Payment (locked) ──────────────────────────── */}
              <div className={card}>
                <p className={cardHead + ' mb-4'}>Payment</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Method</label>
                    <div className={inpLocked}>{form.payment_method || '—'}</div>
                  </div>
                  <div>
                    <label className={lbl}>Status</label>
                    <div className={inpLocked}>{STATUS_LABEL[invoice.status].label}</div>
                  </div>
                </div>
              </div>

              {/* ── Notes (locked) ─────────────────────────────── */}
              <div className={card}>
                <p className={cardHead + ' mb-4'}>Notes</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{form.notes || '—'}</p>
              </div>

              {/* ── Terms & Conditions (locked) ────────────────── */}
              <div className={card}>
                <p className={cardHead + ' mb-4'}>Terms &amp; Conditions</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{form.terms_and_conditions || '—'}</p>
              </div>
            </>
          )}

        </div>
      </div>

      {/* ── Right panel: live preview ───────────────────────── */}
      <div className="lg:w-[42%] lg:shrink-0 lg:border-l lg:border-gray-100 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto" style={{ background: '#f0f0f0' }}>
        {/* Desktop preview */}
        <div className="hidden lg:block p-5">
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Live Preview</p>
            <span className="text-[11px] text-gray-400">A4 · 210 × 297 mm</span>
          </div>
          <div className="shadow-2xl" style={{ zoom: 0.55, borderRadius: '2px', overflow: 'hidden' }}>
            <InvoicePrintLayout
              invoiceNumber={invoice.invoice_number ?? invoiceNumberPreview}
              docType={invoice.doc_type}
              date={form.date}
              currency={form.currency}
              type={form.type}
              status={invoice.status}
              billToName={form.bill_to_name     || null}
              billToAddress={form.bill_to_address || null}
              billToPhone={form.bill_to_phone   || null}
              salesManager={form.sales_manager || null}
              paymentMethod={form.payment_method || null}
              showBankDetails={form.show_bank_details}
              showSignatures={fieldVisibility.signatures}
              discount={invoiceDiscount}
              paidTotal={isDraft ? (previewPaid > 0 ? previewPaid : null) : paidTotal}
              notes={form.notes || null}
              termsAndConditions={form.terms_and_conditions || null}
              items={previewItems}
              bank={previewBank}
              logoUrl={logoUrl}
              fieldVisibility={fieldVisibility}
            />
          </div>
        </div>
        {/* Mobile preview */}
        <div className="lg:hidden border-t border-gray-100 px-4 pt-5 pb-8">
          <p className="text-[11px] font-semibold uppercase mb-3" style={{ letterSpacing: '0.1em', color: '#6B6B6B' }}>LIVE PREVIEW</p>
          <div style={{ width: '100%', overflow: 'hidden', height: `${297 * 0.45}mm`, position: 'relative' }}>
            <div style={{ transform: 'scale(0.45)', transformOrigin: 'top left', width: `${100 / 0.45}%`, position: 'absolute', top: 0, left: 0 }}>
              <InvoicePrintLayout
                invoiceNumber={invoice.invoice_number ?? invoiceNumberPreview}
                docType={invoice.doc_type}
                date={form.date}
                currency={form.currency}
                type={form.type}
                status={invoice.status}
                billToName={form.bill_to_name     || null}
                billToAddress={form.bill_to_address || null}
                billToPhone={form.bill_to_phone   || null}
                salesManager={form.sales_manager || null}
                paymentMethod={form.payment_method || null}
                showBankDetails={form.show_bank_details}
                showSignatures={fieldVisibility.signatures}
                discount={invoiceDiscount}
                paidTotal={isDraft ? (previewPaid > 0 ? previewPaid : null) : paidTotal}
                notes={form.notes || null}
                termsAndConditions={form.terms_and_conditions || null}
                items={previewItems}
                bank={previewBank}
                logoUrl={logoUrl}
                fieldVisibility={fieldVisibility}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── ISSUE CONFIRMATION DIALOG ────────────────────── */}
      {issueConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" role="dialog" aria-modal="true" aria-label="Issue invoice">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Issue this {invoice.doc_type === 'credit_note' ? 'credit note' : 'invoice'}?</h3>
            <p className="text-sm text-gray-500 mb-6">
              It will be assigned a permanent invoice number and locked — the invoice and its line items can no longer be edited.
              {num(initialPaymentAmount) && num(initialPaymentAmount)! > 0
                ? ` The ${fmtAmt(num(initialPaymentAmount)!, form.currency)} entered on the Payment step will be recorded as its first payment.`
                : ' Only payments can be recorded against it afterwards.'}
            </p>
            <div className="flex flex-col gap-2">
              <BusyButton
                type="button"
                onClick={handleIssue}
                pending={issuing}
                pendingLabel="Issuing…"
                className="w-full inline-flex items-center justify-center gap-2 bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-emerald-800 transition-colors disabled:opacity-50"
              >
                Yes, Issue
              </BusyButton>
              <button type="button" onClick={() => setIssueConfirmOpen(false)} className="w-full text-sm text-gray-500 hover:text-gray-900 py-2.5 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RECORD PAYMENT DIALOG ────────────────────────── */}
      {recordPaymentOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" role="dialog" aria-modal="true" aria-label="Record payment">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Record Payment</h3>
            <div className="space-y-3">
              <div>
                <label className={lbl}>Amount</label>
                <input type="text" autoFocus value={paymentForm.amount} onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))} placeholder={`Balance due: ${fmtAmt(balanceDue, form.currency)}`} className={inp} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Currency</label>
                  <select value={paymentForm.currency} onChange={e => setPaymentForm(p => ({ ...p, currency: e.target.value }))} className={inp}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Date Paid</label>
                  <input type="date" value={paymentForm.paid_at} onChange={e => setPaymentForm(p => ({ ...p, paid_at: e.target.value }))} className={inp} />
                </div>
              </div>
              {paymentForm.currency !== 'LKR' && (
                <div>
                  <label className={lbl}>Exchange Rate (1 {paymentForm.currency} = LKR)</label>
                  <input type="number" value={paymentForm.exchange_rate} onChange={e => setPaymentForm(p => ({ ...p, exchange_rate: e.target.value }))} className={inp} />
                </div>
              )}
              <div>
                <label className={lbl}>Method</label>
                <select value={paymentForm.method} onChange={e => setPaymentForm(p => ({ ...p, method: e.target.value }))} className={inp}>
                  <option value="">— Select —</option>
                  {PAY_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Reference</label>
                <input type="text" value={paymentForm.reference} onChange={e => setPaymentForm(p => ({ ...p, reference: e.target.value }))} placeholder="Transaction / slip reference" className={inp} />
              </div>
              <div>
                <label className={lbl}>Notes</label>
                <textarea value={paymentForm.notes} onChange={e => setPaymentForm(p => ({ ...p, notes: e.target.value }))} rows={2} className={inp} />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button type="button" onClick={() => setRecordPaymentOpen(false)} disabled={recordingPayment} className="flex-1 py-2.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl transition-colors">
                Cancel
              </button>
              <BusyButton
                type="button"
                onClick={handleRecordPayment}
                pending={recordingPayment}
                disabled={!num(paymentForm.amount) || (num(paymentForm.amount) ?? 0) <= 0}
                pendingLabel="Saving…"
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-xl hover:bg-black transition-colors disabled:opacity-50"
              >
                Record Payment
              </BusyButton>
            </div>
          </div>
        </div>
      )}

      {/* ── SOURCING PROMPT DIALOG ───────────────────────── */}
      {sourcingPromptOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Add to Sourced Orders"
          >
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Add to Sourced Orders?</h3>
            <p className="text-sm text-gray-500 mb-6">Would you like to track this watch in Sourced Orders until it arrives in stock?</p>
            <div className="flex flex-col gap-2">
              <BusyButton
                type="button"
                onClick={handleAddToSourcedOrders}
                pending={sourcingAdding}
                pendingLabel="Adding…"
                className="w-full inline-flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-black transition-colors disabled:opacity-50"
              >
                Yes, Add to Sourced Orders
              </BusyButton>
              <button
                type="button"
                onClick={() => setSourcingPromptOpen(false)}
                className="w-full text-sm text-gray-500 hover:text-gray-900 py-2.5 transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PHOTO DIALOG ─────────────────────────────────── */}
      {photoDialogIdx !== null && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setPhotoDialogIdx(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Choose Photo"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-gray-900">Choose Photo</h3>
              <button type="button" aria-label="Close dialog" onClick={() => setPhotoDialogIdx(null)} className="text-gray-400 hover:text-gray-700 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
              </button>
            </div>

            {form.type === 'sale' && (
              <>
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Watch Photos</p>
                  {loadingPhotos ? (
                    <div className="flex items-center justify-center h-16">
                      <svg className="w-5 h-5 text-gray-300 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                    </div>
                  ) : dialogWatchPhotos.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {dialogWatchPhotos.map((url, pi) => (
                        <button
                          key={pi}
                          type="button"
                          onClick={() => { updateItem(photoDialogIdx, 'photo_url', url); setPhotoDialogIdx(null) }}
                          className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-gray-900 transition-all"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">{items[photoDialogIdx]?.watch_id ? 'No photos found for this watch' : 'No watch selected'}</p>
                  )}
                </div>
                <div className="h-px bg-gray-100 mb-4" />
              </>
            )}

            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Upload New</p>
              <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-gray-400 transition-colors">
                <span className="text-xs text-gray-400 pointer-events-none">
                  {uploadingIdx === photoDialogIdx ? 'Uploading…' : 'Click or drag to upload'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={async e => {
                    const file = e.target.files?.[0]
                    const capturedIdx = photoDialogIdx
                    if (file && capturedIdx !== null) {
                      await handlePhotoReplace(items[capturedIdx]._key, capturedIdx, file)
                      setPhotoDialogIdx(null)
                    }
                    e.target.value = ''
                  }}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => setPhotoDialogIdx(null)}
              className="w-full text-sm text-gray-500 hover:text-gray-900 py-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* New Client Modal */}
      {newClientOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !newClientSaving && setNewClientOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-base font-bold text-gray-900 mb-4">New Client</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Name *</label>
                <input
                  autoFocus
                  type="text"
                  value={newClientForm.name}
                  onChange={e => setNewClientForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Full name"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-gray-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={newClientForm.phone}
                  onChange={e => setNewClientForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="Phone number"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-gray-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Address</label>
                <input
                  type="text"
                  value={newClientForm.address}
                  onChange={e => setNewClientForm(p => ({ ...p, address: e.target.value }))}
                  placeholder="Address"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-gray-400 transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setNewClientOpen(false)}
                disabled={newClientSaving}
                className="flex-1 py-2.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <BusyButton
                type="button"
                onClick={handleCreateNewClient}
                pending={newClientSaving}
                disabled={!newClientForm.name.trim()}
                pendingLabel="Saving…"
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-xl hover:bg-black transition-colors disabled:opacity-50"
              >
                Save Client
              </BusyButton>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
