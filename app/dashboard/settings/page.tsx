export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import BankAccountsSection from '@/components/settings/BankAccountsSection'
import type { SavedBank } from '@/types'

export default async function SettingsPage() {
  const supabase = createClient()

  const { data } = await supabase
    .from('saved_banks')
    .select('*')
    .order('bank_name')

  const banks = (data ?? []) as SavedBank[]

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Manage system settings and saved data</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <BankAccountsSection initialBanks={banks} />
      </div>
    </div>
  )
}
