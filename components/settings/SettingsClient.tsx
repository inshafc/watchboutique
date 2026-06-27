'use client'

import { useState } from 'react'
import LogoUploadSection    from './LogoUploadSection'
import BankAccountsSection  from './BankAccountsSection'
import SalesManagersSection from './SalesManagersSection'
import BrandsSection        from './BrandsSection'
import InvestorsSection     from './InvestorsSection'
import KPITargetsSection    from './KPITargetsSection'
import UserManagementSection from './UserManagementSection'
import type { SavedBank, SalesManager, Brand, InvestorRecord } from '@/types'

type Section = 'invoice' | 'banks' | 'managers' | 'brands' | 'investors' | 'kpi' | 'users'

const NAV_ITEMS: { id: Section; label: string; soon?: boolean }[] = [
  { id: 'invoice',  label: 'Invoice'          },
  { id: 'banks',    label: 'Bank Accounts'    },
  { id: 'managers', label: 'Sales Managers'   },
  { id: 'brands',   label: 'Brands'           },
  { id: 'investors',label: 'Investors'        },
  { id: 'kpi',      label: 'KPI Targets'      },
  { id: 'users',    label: 'User Management', soon: true },
]

export default function SettingsClient({
  logoUrl,
  banks,
  salesManagers,
  brands,
  investors,
}: {
  logoUrl:       string | null
  banks:         SavedBank[]
  salesManagers: SalesManager[]
  brands:        Brand[]
  investors:     InvestorRecord[]
}) {
  const [active, setActive] = useState<Section>('invoice')

  return (
    <div className="flex min-h-full">
      {/* Sub-nav */}
      <aside className="w-44 shrink-0 border-r border-gray-100 py-6 px-3 hidden md:block">
        <nav className="space-y-0.5">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-medium text-left transition-colors ${
                active === item.id
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className="truncate">{item.label}</span>
              {item.soon && (
                <span className={`text-[9px] font-bold rounded-full px-1.5 py-0.5 shrink-0 ${
                  active === item.id ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                }`}>SOON</span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile sub-nav (scrollable row) */}
      <div className="md:hidden w-full">
        <div className="flex gap-1 overflow-x-auto px-4 py-3 border-b border-gray-100 no-scrollbar">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                active === item.id ? 'bg-gray-900 text-white' : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {item.label}
              {item.soon && <span className="text-[9px] font-bold">•</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-6 px-6 md:px-8">
        {active === 'invoice'  && <LogoUploadSection    initialLogoUrl={logoUrl} />}
        {active === 'banks'    && <BankAccountsSection  initialBanks={banks} />}
        {active === 'managers' && <SalesManagersSection initialManagers={salesManagers} />}
        {active === 'brands'   && <BrandsSection        initialBrands={brands} />}
        {active === 'investors'&& <InvestorsSection     initialInvestors={investors} />}
        {active === 'kpi'      && <KPITargetsSection    salesManagers={salesManagers} />}
        {active === 'users'    && <UserManagementSection />}
      </div>
    </div>
  )
}
