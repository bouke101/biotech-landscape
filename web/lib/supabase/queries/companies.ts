import { getMockCompanies, getMockCompanyBySlug } from '@/lib/mock/queries/companies'
import type { Company } from '@/lib/supabase/database.types'

export type { CompanyFilters } from '@/lib/mock/queries/companies'
import type { CompanyFilters } from '@/lib/mock/queries/companies'

export async function getCompanies(filters: CompanyFilters = {}): Promise<Company[]> {
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA !== 'false') return getMockCompanies(filters)
  const { createClient } = await import('../server')
  const supabase = await createClient()
  let query = supabase.from('companies').select('*').order('updated_at', { ascending: false })
  if (filters.sector) query = query.contains('sectors', [filters.sector])
  if (filters.stage)  query = query.eq('stage', filters.stage as never)
  if (filters.region) query = query.eq('hq_region', filters.region)
  if (filters.watchlist) query = query.eq('on_watchlist', true)
  if (filters.hasCoordinates) query = query.not('lat', 'is', null).not('lng', 'is', null)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA !== 'false') return getMockCompanyBySlug(slug)
  const { createClient } = await import('../server')
  const supabase = await createClient()
  const { data } = await supabase.from('companies').select('*').eq('slug', slug).single()
  return data
}
