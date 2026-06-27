export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import SettingsClient from '@/components/settings/SettingsClient'
import type { SavedBank, SalesManager, Brand, InvestorRecord } from '@/types'

export default async function SettingsPage() {
  const supabase = createClient()

  const [banksRes, logoRes, managersRes, brandsRes, investorsRes] = await Promise.all([
    supabase.from('saved_banks').select('*').order('bank_name'),
    supabase.from('app_settings').select('value').eq('key', 'invoice_logo_url').maybeSingle(),
    supabase.from('sales_managers').select('*').order('name'),
    supabase.from('brands').select('*').order('name'),
    supabase.from('investor_names').select('*').order('created_at', { ascending: true }),
  ])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-gray-100">
        <div>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">Settings</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage system settings and saved data</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <SettingsClient
          logoUrl={logoRes.data?.value ?? null}
          banks={(banksRes.data ?? []) as SavedBank[]}
          salesManagers={(managersRes.data ?? []) as SalesManager[]}
          brands={(brandsRes.data ?? []) as Brand[]}
          investors={(investorsRes.data ?? []) as InvestorRecord[]}
        />
      </div>
    </div>
  )
}
