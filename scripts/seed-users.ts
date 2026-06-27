/**
 * Seed initial users into Supabase Auth + profiles table.
 *
 * Prerequisites:
 *   1. Run supabase/sprint17.sql in the Supabase SQL editor first.
 *   2. Add SUPABASE_SERVICE_ROLE_KEY to .env.local.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json -e "require('@next/env').loadEnvConfig('.')" scripts/seed-users.ts
 *
 * OR export env vars manually then run:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx ts-node --project tsconfig.json scripts/seed-users.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const USERS = [
  { email: 'inshaf@insideout.link',           full_name: 'Inshaf Caffoor', role: 'super_admin', password: 'TWB@Admin2026!' },
  { email: 'emad@thewatchboutiquesl.com',     full_name: 'Emad',           role: 'super_admin', password: 'TWB@Admin2026!' },
  { email: 'dishan@thewatchboutiquesl.com',   full_name: 'Dishan',         role: 'enterer',     password: 'TWB@Enter2026!' },
  { email: 'haran@thewatchboutiquesl.com',    full_name: 'Haran',          role: 'enterer',     password: 'TWB@Enter2026!' },
  { email: 'diluka@thewatchboutiquesl.com',   full_name: 'Diluka',         role: 'viewer',      password: 'TWB@View2026!'  },
  { email: 'ali@thewatchboutiquesl.com',      full_name: 'Ali',            role: 'viewer',      password: 'TWB@View2026!'  },
  { email: 'dinushki@insideout.link',         full_name: 'Dinushki',       role: 'viewer',      password: 'TWB@View2026!'  },
] as const

async function main() {
  console.log('Seeding users…\n')

  for (const u of USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email:         u.email,
      password:      u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name, role: u.role },
    })

    if (error) {
      if (error.message.includes('already been registered')) {
        console.log(`⚠  ${u.email} — already exists, skipping`)
      } else {
        console.error(`✗  ${u.email} — ${error.message}`)
      }
      continue
    }

    // Trigger should have created the profile; ensure role is correct.
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ role: u.role, full_name: u.full_name })
      .eq('id', data.user.id)

    if (profileErr) {
      console.error(`   profile update failed for ${u.email}: ${profileErr.message}`)
    }

    console.log(`✓  ${u.email} (${u.role})`)
  }

  console.log('\nDone.')
}

main().catch(err => { console.error(err); process.exit(1) })
