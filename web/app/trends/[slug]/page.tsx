import { getTrendBySlug } from '@/lib/supabase/queries/trends'
import { Badge } from '@/components/ui/badge'
import { notFound } from 'next/navigation'

export default async function TrendPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const trend = await getTrendBySlug(slug)
  if (!trend) notFound()

  return (
    <div className="max-w-3xl">
      <a href="/trends" className="text-xs text-slate-400 hover:text-slate-600 mb-4 inline-block">← Trends</a>

      <div className="flex items-start justify-between gap-4 mb-4">
        <h1 className="text-2xl font-bold text-[#0A0F1E] leading-tight">{trend.theme}</h1>
        <span className={`text-sm font-semibold px-3 py-1 rounded-full shrink-0 ${
          trend.timeline_stage === 'Emerging' ? 'bg-yellow-100 text-yellow-700' :
          trend.timeline_stage === 'Growing'  ? 'bg-green-100 text-green-700' :
          'bg-blue-100 text-blue-700'
        }`}>{trend.timeline_stage}</span>
      </div>

      <p className="text-sm text-slate-400 mb-4">📍 {trend.geographic_momentum}</p>

      <div className="flex flex-wrap gap-1.5 mb-8">
        {trend.related_sectors.map(s => <Badge key={s} variant="secondary">{s}</Badge>)}
      </div>

      <div className="space-y-5">
        {trend.evidence && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Evidence & signals</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{trend.evidence}</p>
          </div>
        )}

        {trend.analysis_note && (
          <div className="bg-[#0A0F1E] rounded-xl p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">Analysis note</h2>
            <p className="text-sm text-white/80 leading-relaxed">{trend.analysis_note}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trend.key_companies.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Key companies</h2>
              <div className="space-y-1.5">
                {trend.key_companies.map(c => (
                  <p key={c} className="text-sm text-[#0A0F1E]">{c}</p>
                ))}
              </div>
            </div>
          )}
          {trend.key_investors.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Key investors</h2>
              <div className="space-y-1.5">
                {trend.key_investors.map(i => (
                  <p key={i} className="text-sm text-[#0A0F1E]">{i}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
