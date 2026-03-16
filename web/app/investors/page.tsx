import { getInvestors } from '@/lib/supabase/queries/investors'
import { Badge } from '@/components/ui/badge'

const TYPES = ['VC', 'CVC', 'Family Office', 'Government', 'Accelerator', 'Angel', 'PE']

function fmtCheck(min: number | null, max: number | null) {
  if (!min && !max) return '—'
  const f = (n: number) => n >= 1e6 ? `€${n / 1e6}M` : `€${(n / 1000).toFixed(0)}K`
  if (min && max) return `${f(min)} – ${f(max)}`
  if (min) return `from ${f(min)}`
  return `up to ${f(max!)}`
}

export default async function InvestorsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; sector?: string; region?: string }>
}) {
  const params = await searchParams
  const investors = await getInvestors({ type: params.type, sector: params.sector, region: params.region })

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0A0F1E] mb-1">Investors</h1>
        <p className="text-sm text-slate-500">{investors.length} investors tracked</p>
      </div>

      {/* Type filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <a href="/investors" className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${!params.type ? 'bg-[#0047CC] text-white border-[#0047CC]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
          All
        </a>
        {TYPES.map(t => (
          <a key={t} href={`/investors?type=${encodeURIComponent(t)}`}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${params.type === t ? 'bg-[#0047CC] text-white border-[#0047CC]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
            {t}
          </a>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {investors.map(inv => (
          <a key={inv.id} href={`/investors/${inv.slug}`}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:border-[#0047CC] transition-colors block">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-semibold text-[#0A0F1E]">{inv.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{inv.hq_country} · {inv.investor_type}</p>
              </div>
              {inv.fund_size_usd && (
                <span className="text-xs font-semibold text-[#0047CC] whitespace-nowrap">
                  ${(inv.fund_size_usd / 1e9).toFixed(inv.fund_size_usd < 1e9 ? 0 : 1)}{inv.fund_size_usd >= 1e9 ? 'B' : 'M'}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {inv.focus_sectors.slice(0, 3).map(s => (
                <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
              ))}
              {inv.focus_sectors.length > 3 && <span className="text-xs text-slate-400">+{inv.focus_sectors.length - 3}</span>}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Stages: {inv.focus_stages.join(', ')}</span>
              <span>{fmtCheck(inv.typical_check_min, inv.typical_check_max)}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
