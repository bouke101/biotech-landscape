import { getMockInvestors, getMockInvestorBySlug } from '@/lib/mock/queries/investors'
import type { Investor } from '@/lib/supabase/database.types'
import type { InvestorFilters } from '@/lib/mock/queries/investors'
export type { InvestorFilters }

export async function getInvestors(filters: InvestorFilters = {}): Promise<Investor[]> {
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA !== 'false') return getMockInvestors(filters)
  const { createClient } = await import('../server')
  const supabase = await createClient()
  const { data, error } = await supabase.from('investors').select('*').order('name')
  if (error) throw error
  return data ?? []
}

export async function getInvestorBySlug(slug: string): Promise<Investor | null> {
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA !== 'false') return getMockInvestorBySlug(slug)
  const { createClient } = await import('../server')
  const supabase = await createClient()
  const { data } = await supabase.from('investors').select('*').eq('slug', slug).single()
  return data
}
