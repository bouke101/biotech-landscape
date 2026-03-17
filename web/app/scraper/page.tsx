'use client'

import { useEffect, useState, useCallback } from 'react'
import type { ScraperJob, ScrapedArticle } from '@/lib/supabase/database.types'

// ── Helpers ────────────────────────────────────────────────────────────────────
const statusColor: Record<string, string> = {
  pending:   'bg-purple-100 text-purple-700',
  running:   'bg-blue-100 text-blue-700',
  paused:    'bg-yellow-100 text-yellow-700',
  stopped:   'bg-slate-100 text-slate-600',
  completed: 'bg-green-100 text-green-700',
  failed:    'bg-red-100 text-red-700',
}

const FOCUS_TYPES = [
  { value: 'startups',   label: 'Startups & funding' },
  { value: 'investment', label: 'Investment deals' },
  { value: 'all',        label: 'All biotech' },
]

const GEO_PRESETS = ['Netherlands', 'EU', 'Germany', 'UK', 'USA', 'Global']

function duration(start: string, end: string | null) {
  const ms = new Date(end ?? Date.now()).getTime() - new Date(start).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ScraperPage() {
  const [job, setJob]               = useState<ScraperJob | null>(null)
  const [jobs, setJobs]             = useState<ScraperJob[]>([])
  const [articles, setArticles]     = useState<ScrapedArticle[]>([])
  const [dealsOnly, setDealsOnly]   = useState(false)
  const [page, setPage]             = useState(1)
  const [sending, setSending]       = useState(false)
  const [starting, setStarting]     = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  // Focus form state
  const [focusTopic, setFocusTopic]       = useState('')
  const [focusGeo, setFocusGeo]           = useState('Netherlands')
  const [focusType, setFocusType]         = useState<'startups' | 'investment' | 'all'>('startups')

  const fetchStatus = useCallback(async () => {
    const [jobRes, jobsRes] = await Promise.all([
      fetch('/api/scraper/status').then(r => r.json()),
      fetch('/api/scraper/jobs').then(r => r.json()),
    ])
    setJob(jobRes)
    setJobs(jobsRes)
  }, [])

  const fetchArticles = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page) })
    if (dealsOnly) params.set('deals_only', 'true')
    const data = await fetch(`/api/scraper/articles?${params}`).then(r => r.json())
    setArticles(data)
  }, [page, dealsOnly])

  // Poll every 5s
  useEffect(() => {
    fetchStatus()
    const id = setInterval(fetchStatus, 5000)
    return () => clearInterval(id)
  }, [fetchStatus])

  useEffect(() => { fetchArticles() }, [fetchArticles])

  async function sendSignal(signal: 'pause' | 'run' | 'stop') {
    setSending(true)
    await fetch('/api/scraper/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signal }),
    })
    setSending(false)
    fetchStatus()
  }

  async function startRun() {
    setStarting(true)
    setStartError(null)
    const res = await fetch('/api/scraper/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        focus_topic:     focusTopic.trim() || undefined,
        focus_geography: focusGeo.trim() || undefined,
        focus_type:      focusType,
      }),
    })
    const data = await res.json()
    setStarting(false)
    if (!res.ok) {
      setStartError(data.error ?? 'Unknown error')
    } else {
      fetchStatus()
    }
  }

  const isActive = job?.status === 'running' || job?.status === 'paused' || job?.status === 'pending'
  const progress = job && job.feeds_total > 0
    ? Math.round((job.feeds_done / job.feeds_total) * 100)
    : 0

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0A0F1E] mb-1">Scraper</h1>
        <p className="text-sm text-slate-500">Targeted data collection · Configure focus, then start</p>
      </div>

      {/* Configure & Start */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="font-semibold text-[#0A0F1E] mb-4">Configure new run</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

          {/* Topic */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Topic / keyword</label>
            <input
              type="text"
              value={focusTopic}
              onChange={e => setFocusTopic(e.target.value)}
              placeholder="e.g. yarrowia, mRNA, CRISPR"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0047CC]/30 focus:border-[#0047CC]"
            />
          </div>

          {/* Geography */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Geography</label>
            <div className="flex gap-1.5 flex-wrap mb-2">
              {GEO_PRESETS.map(geo => (
                <button
                  key={geo}
                  onClick={() => setFocusGeo(geo)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    focusGeo === geo
                      ? 'bg-[#0047CC] text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {geo}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={focusGeo}
              onChange={e => setFocusGeo(e.target.value)}
              placeholder="or type custom..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0047CC]/30 focus:border-[#0047CC]"
            />
          </div>

          {/* Focus type */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Focus</label>
            <div className="flex flex-col gap-1.5">
              {FOCUS_TYPES.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="focusType"
                    value={value}
                    checked={focusType === value}
                    onChange={() => setFocusType(value as typeof focusType)}
                    className="accent-[#0047CC]"
                  />
                  <span className="text-sm text-slate-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={startRun}
            disabled={starting || isActive}
            className="px-5 py-2.5 rounded-lg bg-[#0047CC] text-white text-sm font-semibold hover:bg-[#0035a0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {starting ? 'Starting…' : isActive ? 'Run in progress' : '▶ Start run'}
          </button>
          {isActive && (
            <p className="text-xs text-slate-400">Stop the current run before starting a new one.</p>
          )}
          {startError && (
            <p className="text-xs text-red-600">{startError}</p>
          )}
        </div>
      </div>

      {/* Active job card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">Current job</p>
            {job ? (
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[job.status]}`}>
                  {job.status}
                </span>
                <span className="text-sm text-slate-500">{job.run_id}</span>
                {(job.focus_topic || job.focus_geography) && (
                  <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                    {[job.focus_topic, job.focus_geography].filter(Boolean).join(' · ')}
                    {job.focus_type && job.focus_type !== 'all' && ` · ${job.focus_type}`}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No jobs yet. Configure and start a run above.</p>
            )}
          </div>

          {/* Controls */}
          {isActive && job?.status !== 'pending' && (
            <div className="flex gap-2">
              {job?.status === 'running' && (
                <button
                  onClick={() => sendSignal('pause')}
                  disabled={sending}
                  className="px-4 py-2 rounded-lg bg-yellow-100 text-yellow-700 text-sm font-semibold hover:bg-yellow-200 transition-colors disabled:opacity-50"
                >
                  ⏸ Pause
                </button>
              )}
              {job?.status === 'paused' && (
                <button
                  onClick={() => sendSignal('run')}
                  disabled={sending}
                  className="px-4 py-2 rounded-lg bg-blue-100 text-blue-700 text-sm font-semibold hover:bg-blue-200 transition-colors disabled:opacity-50"
                >
                  ▶ Resume
                </button>
              )}
              <button
                onClick={() => sendSignal('stop')}
                disabled={sending}
                className="px-4 py-2 rounded-lg bg-red-100 text-red-700 text-sm font-semibold hover:bg-red-200 transition-colors disabled:opacity-50"
              >
                ■ Stop
              </button>
            </div>
          )}
          {job?.status === 'pending' && (
            <p className="text-xs text-slate-400 italic">Waiting for GitHub Actions runner…</p>
          )}
        </div>

        {job && job.status !== 'pending' && (
          <>
            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span>
                  {job.current_feed ? `Fetching: ${job.current_feed}` : 'Idle'}
                </span>
                <span>{job.feeds_done} / {job.feeds_total} feeds</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0047CC] rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Articles fetched', value: job.articles_fetched },
                { label: 'New this run',     value: job.articles_new },
                { label: 'Trigger',          value: job.trigger },
                { label: 'Duration',         value: duration(job.started_at, job.completed_at) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                  <p className="text-lg font-bold text-[#0A0F1E]">{value}</p>
                </div>
              ))}
            </div>

            {job.error_message && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg text-sm text-red-700">
                {job.error_message}
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Job history */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-[#0A0F1E]">Job history</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {jobs.length === 0 && (
              <p className="px-5 py-4 text-sm text-slate-400">No runs yet.</p>
            )}
            {jobs.map(j => (
              <div key={j.id} className="px-5 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor[j.status]}`}>
                    {j.status}
                  </span>
                  <span className="text-xs text-slate-400">{duration(j.started_at, j.completed_at)}</span>
                </div>
                {(j.focus_topic || j.focus_geography) && (
                  <p className="text-xs text-[#0047CC] truncate mb-0.5">
                    {[j.focus_topic, j.focus_geography].filter(Boolean).join(' · ')}
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-0.5">
                  {j.articles_new} new · {j.trigger}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Articles feed */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-[#0A0F1E]">Scraped articles</h2>
            <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                checked={dealsOnly}
                onChange={e => { setDealsOnly(e.target.checked); setPage(1) }}
                className="rounded"
              />
              Deal signals only
            </label>
          </div>
          <div className="divide-y divide-slate-50">
            {articles.length === 0 && (
              <p className="px-5 py-4 text-sm text-slate-400">
                No articles yet. Start a run above to populate this feed.
              </p>
            )}
            {articles.map(a => (
              <div key={a.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <a href={a.source_url} target="_blank"
                      className="text-sm font-medium text-[#0A0F1E] hover:text-[#0047CC] transition-colors line-clamp-2">
                      {a.title}
                    </a>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {a.source} · {a.published_at ? new Date(a.published_at).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  {a.deal_extracted && (
                    <div className="shrink-0 text-right">
                      {a.amount_hint && (
                        <span className="text-xs font-semibold text-[#0047CC]">{a.amount_hint}</span>
                      )}
                      {a.round_type_hint && (
                        <p className="text-xs text-slate-400 capitalize">{a.round_type_hint}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {articles.length === 50 && (
            <div className="px-5 py-3 border-t border-slate-100 flex gap-3">
              {page > 1 && (
                <button onClick={() => setPage(p => p - 1)}
                  className="text-xs text-[#0047CC] hover:underline">← Previous</button>
              )}
              <button onClick={() => setPage(p => p + 1)}
                className="text-xs text-[#0047CC] hover:underline">Next →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
