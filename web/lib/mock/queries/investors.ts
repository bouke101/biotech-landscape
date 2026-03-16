import { INVESTORS } from '../seed'
import type { Investor } from '@/lib/supabase/database.types'

export interface InvestorFilters { sector?: string; stage?: string; region?: string; type?: string }

export function getMockInvestors(filters: InvestorFilters = {}): Investor[] {
  let data = [...INVESTORS]
  if (filters.sector) data = data.filter(i => i.focus_sectors.includes(filters.sector!))
  if (filters.stage)  data = data.filter(i => i.focus_stages.includes(filters.stage!))
  if (filters.region) data = data.filter(i => i.geographic_focus.includes(filters.region!))
  if (filters.type)   data = data.filter(i => i.investor_type === filters.type)
  return data
}

export function getMockInvestorBySlug(slug: string): Investor | null {
  return INVESTORS.find(i => i.slug === slug) ?? null
}
