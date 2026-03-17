import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json() as {
    focus_topic?: string
    focus_geography?: string
    focus_type?: 'startups' | 'investment' | 'all'
  }

  const supabase = await createClient()

  // Create a pending job — the GitHub Actions runner will adopt it
  const { data, error } = await supabase
    .from('scraper_jobs')
    .insert({
      run_id:          `pending-${Date.now()}`,
      trigger:         'ui',
      status:          'pending',
      signal:          'run',
      feeds_total:     0,
      feeds_done:      0,
      articles_fetched: 0,
      articles_new:    0,
      focus_topic:     body.focus_topic || null,
      focus_geography: body.focus_geography || null,
      focus_type:      body.focus_type || 'all',
    } as never)
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'failed to create job' }, { status: 500 })
  }

  // Trigger GitHub Actions workflow_dispatch
  const pat = process.env.GITHUB_PAT
  if (!pat) {
    return NextResponse.json({ error: 'GITHUB_PAT not configured' }, { status: 500 })
  }

  const ghRes = await fetch(
    'https://api.github.com/repos/bouke101/biotech-landscape/actions/workflows/scrape.yml/dispatches',
    {
      method: 'POST',
      headers: {
        Authorization: `token ${pat}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main', inputs: { trigger_label: 'ui' } }),
    }
  )

  if (!ghRes.ok && ghRes.status !== 204) {
    const text = await ghRes.text()
    return NextResponse.json({ error: `GitHub dispatch failed: ${text}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true, job_id: (data as { id: string }).id })
}
