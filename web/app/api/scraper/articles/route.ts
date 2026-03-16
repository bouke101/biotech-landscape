import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const page       = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const source     = searchParams.get('source')
  const dealsOnly  = searchParams.get('deals_only') === 'true'

  const supabase = await createClient()
  let query = supabase
    .from('scraped_articles')
    .select('id, source, title, summary, source_url, published_at, segments, deal_extracted, amount_hint, round_type_hint, investors_hint')
    .order('published_at', { ascending: false, nullsFirst: false })
    .range((page - 1) * 50, page * 50 - 1)

  if (source)    query = query.eq('source', source)
  if (dealsOnly) query = query.eq('deal_extracted', true)

  const { data } = await query
  return NextResponse.json(data ?? [])
}
