import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { ScraperJob } from '@/lib/supabase/database.types'

export async function POST(req: Request) {
  const body = await req.json() as { signal?: string }
  const signal = body.signal

  if (!signal || !['run', 'pause', 'stop'].includes(signal)) {
    return NextResponse.json({ error: 'invalid signal' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data } = await supabase
    .from('scraper_jobs')
    .select('id, status')
    .order('created_at', { ascending: false })
    .limit(1)

  const jobs = (data ?? []) as Pick<ScraperJob, 'id' | 'status'>[]
  const job = jobs.find(j => j.status === 'running' || j.status === 'paused')

  if (!job) {
    return NextResponse.json({ error: 'no active job' }, { status: 404 })
  }

  await supabase
    .from('scraper_jobs')
    .update({ signal } as never)
    .eq('id', job.id)

  return NextResponse.json({ ok: true, job_id: job.id, signal })
}
