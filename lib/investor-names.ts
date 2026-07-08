import type { createClient } from '@/lib/supabase/server'

export async function getInvestorDisplayNames(
  supabase: ReturnType<typeof createClient>
): Promise<Map<string, string>> {
  const { data } = await supabase.from('investor_names').select('key, display_name')
  const map = new Map<string, string>()
  for (const row of data ?? []) map.set(row.key, row.display_name)
  return map
}
