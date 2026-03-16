import { DEALS } from '../seed'
import type { Deal } from '@/lib/supabase/database.types'

export interface DealFilters { type?: string; company?: string; year?: string }

export function getMockDeals(filters: DealFilters = {}): Deal[] {
  let data = [...DEALS].sort((a, b) => b.deal_date.localeCompare(a.deal_date))
  if (filters.type)    data = data.filter(d => d.deal_type === filters.type)
  if (filters.company) data = data.filter(d => d.company_name.toLowerCase().includes(filters.company!.toLowerCase()))
  if (filters.year)    data = data.filter(d => d.deal_date.startsWith(filters.year!))
  return data
}
