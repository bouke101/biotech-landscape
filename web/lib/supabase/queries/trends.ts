import { getMockTrends, getMockTrendBySlug } from '@/lib/mock/queries/trends'
import type { Trend } from '@/lib/supabase/database.types'

export async function getTrends(): Promise<Trend[]> {
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA !== 'false') return getMockTrends()
  const { createClient } = await import('../server')
  const supabase = await createClient()
  const { data, error } = await supabase.from('trends').select('*').eq('published', true).order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getTrendBySlug(slug: string): Promise<Trend | null> {
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA !== 'false') return getMockTrendBySlug(slug)
  const { createClient } = await import('../server')
  const supabase = await createClient()
  const { data } = await supabase.from('trends').select('*').eq('slug', slug).single()
  return data
}
