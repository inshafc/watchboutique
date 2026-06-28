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
  { id: 'users',    label: 'User Management' },
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
    <div className="flex w-full min-h-full">
      {/* Desktop sub-nav */}
      <aside className="w-44 shrink-0 border-r border-border py-6 px-3 hidden md:block">
        <nav className="space-y-0.5">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[13px] font-medium text-left transition-colors ${
                active === item.id
                  ? 'text-white'
                  : 'text-text-secondary hover:bg-[#F3F2EF] hover:text-text-primary'
              }`}
              style={active === item.id ? { backgroundColor: '#111111' } : undefined}
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

      {/* Right column: mobile nav (stacked above) + content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile sub-nav (scrollable row) */}
        <div className="md:hidden flex gap-1.5 overflow-x-auto px-4 py-3 border-b border-border no-scrollbar shrink-0">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium transition-colors ${
                active === item.id ? 'text-white' : 'text-text-secondary bg-[#F3F2EF] hover:bg-[#E8E6E1]'
              }`}
              style={active === item.id ? { backgroundColor: '#111111' } : undefined}
            >
              {item.label}
              {item.soon && <span className="text-[9px] font-bold">•</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 md:py-6 px-4 md:px-8">
          <div className="bg-white border border-[#E8E6E1] rounded-xl p-4 md:border-0 md:rounded-none md:bg-transparent md:p-0">
            {active === 'invoice'  && <LogoUploadSection    initialLogoUrl={logoUrl} />}
            {active === 'banks'    && <BankAccountsSection  initialBanks={banks} />}
            {active === 'managers' && <SalesManagersSection initialManagers={salesManagers} />}
            {active === 'brands'   && <BrandsSection        initialBrands={brands} />}
            {active === 'investors'&& <InvestorsSection     initialInvestors={investors} />}
            {active === 'kpi'      && <KPITargetsSection    salesManagers={salesManagers} />}
            {active === 'users'    && <UserManagementSection />}
          </div>
        </div>
      </div>
    </div>
  )
}
