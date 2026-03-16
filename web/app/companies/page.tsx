import { getCompanies } from '@/lib/supabase/queries/companies'
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

const SECTORS = ['Industrial Biotech', 'Alternative Proteins', 'Synthetic Biology', 'Biomanufacturing', 'Biobased Materials', 'Biobased Chemicals', 'Agricultural Biotech', 'Food Biotech', 'Environmental Biotech', 'Digital Biotech', 'Precision Fermentation', 'Biopharmaceuticals']
const STAGES = ['Stealth', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D+', 'Public', 'Acquired']
const REGIONS = ['Netherlands', 'Benelux', 'Germany', 'UK', 'Nordic', 'France', 'Rest of Europe', 'USA — West', 'USA — East', 'Asia']

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ sector?: string; stage?: string; region?: string; watchlist?: string }>
}) {
  const params = await searchParams
  const companies = await getCompanies({
    sector: params.sector,
    stage: params.stage,
    region: params.region,
    watchlist: params.watchlist === 'true',
  })

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0A0F1E] mb-1">Companies</h1>
        <p className="text-sm text-slate-500">{companies.length} companies tracked</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <a href="/companies" className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${!params.sector && !params.stage && !params.region && !params.watchlist ? 'bg-[#0047CC] text-white border-[#0047CC]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
          All
        </a>
        <a href="/companies?watchlist=true" className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${params.watchlist === 'true' ? 'bg-[#0047CC] text-white border-[#0047CC]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
          ⭐ Watchlist
        </a>
        {SECTORS.map(s => (
          <a key={s} href={`/companies?sector=${encodeURIComponent(s)}`}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${params.sector === s ? 'bg-[#00A86B] text-white border-[#00A86B]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
            {s}
          </a>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Company</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Sectors</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stage</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Location</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Funding</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {companies.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5">
                  <a href={`/companies/${c.slug}`} className="font-medium text-[#0A0F1E] hover:text-[#0047CC] transition-colors">
                    {c.name}
                  </a>
                  {c.on_watchlist && <span className="ml-1.5 text-amber-400 text-xs">⭐</span>}
                  <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{c.technology_platform}</p>
                </td>
                <td className="px-4 py-3.5 hidden md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {c.sectors.slice(0, 2).map(s => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                    {c.sectors.length > 2 && <span className="text-xs text-slate-400">+{c.sectors.length - 2}</span>}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stageColors[c.stage ?? ''] ?? 'bg-slate-100 text-slate-500'}`}>
                    {c.stage ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-xs text-slate-500 hidden lg:table-cell">
                  {c.hq_city}, {c.hq_country}
                </td>
                <td className="px-5 py-3.5 text-right font-semibold text-[#0047CC]">
                  {fmt(c.total_funding_usd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
