import { TRENDS } from '../seed'
import type { Trend } from '@/lib/supabase/database.types'

export function getMockTrends(): Trend[] {
  return TRENDS.filter(t => t.published)
}

export function getMockTrendBySlug(slug: string): Trend | null {
  return TRENDS.find(t => t.slug === slug) ?? null
}
