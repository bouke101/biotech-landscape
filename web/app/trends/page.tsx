import { getTrends } from '@/lib/supabase/queries/trends'
import { Badge } from '@/components/ui/badge'

export default async function TrendsPage() {
  const trends = await getTrends()

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0A0F1E] mb-1">Trends & Themes</h1>
        <p className="text-sm text-slate-500">Sector movements, investment signals, strategic observations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {trends.map(t => (
          <a key={t.id} href={`/trends/${t.slug}`}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:border-[#0047CC] transition-colors block">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="font-semibold text-[#0A0F1E] leading-snug">{t.theme}</h2>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                t.timeline_stage === 'Emerging' ? 'bg-yellow-100 text-yellow-700' :
                t.timeline_stage === 'Growing'  ? 'bg-green-100 text-green-700' :
                'bg-blue-100 text-blue-700'
              }`}>{t.timeline_stage}</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">📍 {t.geographic_momentum}</p>
            <div className="flex flex-wrap gap-1 mb-3">
              {t.related_sectors.map(s => (
                <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
              ))}
            </div>
            {t.analysis_note && (
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{t.analysis_note}</p>
            )}
          </a>
        ))}
      </div>
    </div>
  )
}
