export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import BankAccountsSection from '@/components/settings/BankAccountsSection'
import LogoUploadSection from '@/components/settings/LogoUploadSection'
import type { SavedBank } from '@/types'

export default async function SettingsPage() {
  const supabase = createClient()

  const [banksRes, logoRes] = await Promise.all([
    supabase.from('saved_banks').select('*').order('bank_name'),
    supabase.from('app_settings').select('value').eq('key', 'invoice_logo_url').maybeSingle(),
  ])

  const banks   = (banksRes.data ?? []) as SavedBank[]
  const logoUrl = logoRes.data?.value ?? null

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Manage system settings and saved data</p>
      </div>

      <div className="space-y-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <LogoUploadSection initialLogoUrl={logoUrl} />
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <BankAccountsSection initialBanks={banks} />
        </div>
      </div>
    </div>
  )
}
