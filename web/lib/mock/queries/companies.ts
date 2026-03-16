import { COMPANIES } from '../seed'
import type { Company } from '@/lib/supabase/database.types'

export interface CompanyFilters {
  sector?: string
  stage?: string
  region?: string
  watchlist?: boolean
  search?: string
}

export function getMockCompanies(filters: CompanyFilters = {}): Company[] {
  let data = [...COMPANIES]
  if (filters.sector) data = data.filter(c => c.sectors.includes(filters.sector!))
  if (filters.stage) data = data.filter(c => c.stage === filters.stage)
  if (filters.region) data = data.filter(c => c.hq_region === filters.region)
  if (filters.watchlist) data = data.filter(c => c.on_watchlist)
  if (filters.search) data = data.filter(c => c.name.toLowerCase().includes(filters.search!.toLowerCase()))
  return data
}

export function getMockCompanyBySlug(slug: string): Company | null {
  return COMPANIES.find(c => c.slug === slug) ?? null
}
