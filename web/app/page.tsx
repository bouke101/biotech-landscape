import { getCompanies } from '@/lib/supabase/queries/companies'
import { getDeals } from '@/lib/supabase/queries/deals'
import { getTrends } from '@/lib/supabase/queries/trends'
import { Badge } from '@/components/ui/badge'

function fmt(n: number | null) {
  if (!n) return '—'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`
  return `$${n.toLocaleString()}`
}

const stageColors: Record<string, string> = {
  'Pre-seed': 'bg-slate-100 text-slate-600',
  Seed: 'bg-yellow-100 text-yellow-700',
  'Series A': 'bg-blue-100 text-blue-700',
  'Series B': 'bg-indigo-100 text-indigo-700',
  'Series C': 'bg-purple-100 text-purple-700',
  'Series D+': 'bg-pink-100 text-pink-700',
  Public: 'bg-green-100 text-green-700',
  Acquired: 'bg-orange-100 text-orange-700',
}

export default async function Dashboard() {
  const [companies, deals, trends] = await Promise.all([
    getCompanies(),
    getDeals(),
    getTrends(),
  ])

  const totalFunding = companies.reduce((s, c) => s + (c.total_funding_usd ?? 0), 0)
  const watchlist = companies.filter(c => c.on_watchlist)
  const recentDeals = deals.slice(0, 6)
  const totalDealsValue = deals.reduce((s, d) => s + (d.amount_usd ?? 0), 0)

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0A0F1E] mb-1">Landscape Overview</h1>
        <p className="text-sm text-slate-500">Global biotech intelligence · Updated continuously</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Companies tracked', value: companies.length },
          { label: 'Total funding tracked', value: fmt(totalFunding) },
          { label: 'Deals recorded', value: `${deals.length} · ${fmt(totalDealsValue)}` },
          { label: 'On watchlist', value: watchlist.length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl p-5 border border-slate-200">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2">{label}</p>
            <p className="text-2xl font-bold text-[#0A0F1E]">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent deals */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-[#0A0F1E]">Recent deals</h2>
            <a href="/deals" className="text-xs text-[#0047CC] hover:underline">View all</a>
          </div>
          <div className="divide-y divide-slate-50">
            {recentDeals.map(deal => (
              <div key={deal.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#0A0F1E]">{deal.company_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {deal.deal_type} · {deal.lead_investors[0] ?? '—'} · {deal.deal_date.slice(0, 7)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-[#0047CC]">
                  {deal.amount ? `€${deal.amount}M` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Watchlist */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-[#0A0F1E]">Watchlist</h2>
            <a href="/companies?watchlist=true" className="text-xs text-[#0047CC] hover:underline">View all</a>
          </div>
          <div className="divide-y divide-slate-50">
            {watchlist.map(c => (
              <a key={c.id} href={`/companies/${c.slug}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-[#0A0F1E]">{c.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{c.hq_city}, {c.hq_country}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stageColors[c.stage ?? ''] ?? 'bg-slate-100 text-slate-500'}`}>
                  {c.stage}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Trends */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-[#0A0F1E]">Tracked trends</h2>
          <a href="/trends" className="text-xs text-[#0047CC] hover:underline">View all</a>
        </div>
        <div className="divide-y divide-slate-50">
          {trends.map(t => (
            <a key={t.id} href={`/trends/${t.slug}`} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
              <span className={`mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                t.timeline_stage === 'Emerging' ? 'bg-yellow-100 text-yellow-700' :
                t.timeline_stage === 'Growing'  ? 'bg-green-100 text-green-700' :
                'bg-blue-100 text-blue-700'
              }`}>{t.timeline_stage}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#0A0F1E]">{t.theme}</p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{t.geographic_momentum}</p>
              </div>
              <div className="flex gap-1 flex-wrap justify-end max-w-[180px]">
                {t.related_sectors.slice(0, 2).map(s => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
