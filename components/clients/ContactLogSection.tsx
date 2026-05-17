'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ContactLog, ContactChannel } from '@/types'
import { CONTACT_CHANNELS } from '@/types'

const inp = 'w-full bg-white border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all'

const CHANNEL_STYLES: Record<string, string> = {
  'WhatsApp':  'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Instagram': 'bg-purple-50  text-purple-700  ring-purple-200',
  'Phone':     'bg-sky-50     text-sky-700     ring-sky-200',
  'In Person': 'bg-gray-100   text-gray-700    ring-gray-200',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  const weeks = Math.floor(days / 7)
  if (mins < 60)    return mins <= 1 ? 'Just now' : `${mins}m ago`
  if (hours < 24)   return `${hours}h ago`
  if (days === 1)   return 'Yesterday'
  if (days < 7)     return `${days} days ago`
  if (weeks < 5)    return `${weeks} week${weeks > 1 ? 's' : ''} ago`
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

export default function ContactLogSection({
  clientId,
  initialLogs,
}: {
  clientId: string
  initialLogs: ContactLog[]
}) {
  const [logs, setLogs]       = useState(initialLogs)
  const [channel, setChannel] = useState<ContactChannel>('WhatsApp')
  const [note, setNote]       = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLog(e: React.FormEvent) {
    e.preventDefault()
    if (!note.trim()) return
    setLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('contact_log')
      .insert({ client_id: clientId, channel, note: note.trim() })
      .select()
      .single()

    if (!error && data) {
      setLogs(v => [data as ContactLog, ...v])
      setNote('')
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('contact_log').delete().eq('id', id)
    setLogs(v => v.filter(l => l.id !== id))
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        Contact Log
        {logs.length > 0 && (
          <span className="ml-2 text-xs text-gray-400 font-normal tabular-nums">{logs.length}</span>
        )}
      </h3>

      {/* Log form */}
      <form onSubmit={handleLog} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-5 space-y-3">
        {/* Channel selector */}
        <div className="flex gap-1.5 flex-wrap">
          {CONTACT_CHANNELS.map(ch => (
            <button
              key={ch}
              type="button"
              onClick={() => setChannel(ch)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ring-1 ring-inset transition-all ${
                channel === ch
                  ? CHANNEL_STYLES[ch] ?? 'bg-gray-900 text-white ring-transparent'
                  : 'bg-white text-gray-500 ring-gray-200 hover:ring-gray-400'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>

        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
          placeholder="What did you discuss?"
          className={inp}
          required
        />

        <button
          type="submit" disabled={loading || !note.trim()}
          className="w-full bg-gray-900 text-white text-xs font-semibold py-2.5 rounded-xl hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Logging…' : 'Log Contact'}
        </button>
      </form>

      {/* Timeline */}
      {logs.length === 0 ? (
        <p className="text-sm text-gray-400">No contacts logged yet.</p>
      ) : (
        <div className="space-y-3">
          {logs.map(log => (
            <div key={log.id} className="flex gap-3 group">
              {/* Dot + line */}
              <div className="flex flex-col items-center pt-1">
                <div className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                <div className="w-px flex-1 bg-gray-100 mt-1.5" />
              </div>

              <div className="flex-1 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  {log.channel && (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${CHANNEL_STYLES[log.channel] ?? 'bg-gray-100 text-gray-700 ring-gray-200'}`}>
                      {log.channel}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{timeAgo(log.created_at)}</span>
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="ml-auto text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-base leading-none"
                  >
                    ×
                  </button>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{log.note}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
