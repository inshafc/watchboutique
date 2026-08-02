import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LeagueHome from '@/components/home/LeagueHome'

export default async function RootPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  return <LeagueHome />
}
