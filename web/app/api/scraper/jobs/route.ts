import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('scraper_jobs')
    .select('id, run_id, trigger, status, feeds_total, feeds_done, articles_fetched, articles_new, started_at, completed_at, error_message, current_feed')
    .order('created_at', { ascending: false })
    .limit(20)
  return NextResponse.json(data ?? [])
}
