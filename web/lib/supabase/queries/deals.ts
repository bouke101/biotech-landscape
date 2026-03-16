import { getMockDeals } from '@/lib/mock/queries/deals'
import type { Deal } from '@/lib/supabase/database.types'
import type { DealFilters } from '@/lib/mock/queries/deals'
export type { DealFilters }

export async function getDeals(filters: DealFilters = {}): Promise<Deal[]> {
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA !== 'false') return getMockDeals(filters)
  const { createClient } = await import('../server')
  const supabase = await createClient()
  const { data, error } = await supabase.from('deals').select('*').order('deal_date', { ascending: false })
  if (error) throw error
  return data ?? []
}
