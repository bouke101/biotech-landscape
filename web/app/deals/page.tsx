import { getDeals } from '@/lib/supabase/queries/deals'

const TYPES = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D+', 'Grant', 'IPO', 'M&A']

const typeColors: Record<string, string> = {
  'Pre-seed': 'bg-slate-100 text-slate-600',
  Seed: 'bg-yellow-100 text-yellow-700',
  'Series A': 'bg-blue-100 text-blue-700',
  'Series B': 'bg-indigo-100 text-indigo-700',
  'Series C': 'bg-purple-100 text-purple-700',
  'Series D+': 'bg-pink-100 text-pink-700',
  Grant: 'bg-green-100 text-green-700',
  IPO: 'bg-orange-100 text-orange-700',
  'M&A': 'bg-red-100 text-red-700',
}

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; year?: string }>
}) {
  const params = await searchParams
  const deals = await getDeals({ type: params.type, year: params.year })
  const totalValue = deals.reduce((s, d) => s + (d.amount_usd ?? 0), 0)

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0A0F1E] mb-1">Deal Flow</h1>
        <p className="text-sm text-slate-500">
          {deals.length} deals · {totalValue >= 1e6 ? `$${(totalValue / 1e6).toFixed(0)}M` : `$${totalValue.toLocaleString()}`} total tracked
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <a href="/deals" className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${!params.type ? 'bg-[#0047CC] text-white border-[#0047CC]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
          All rounds
        </a>
        {TYPES.map(t => (
          <a key={t} href={`/deals?type=${encodeURIComponent(t)}`}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${params.type === t ? 'bg-[#0047CC] text-white border-[#0047CC]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
            {t}
          </a>
        ))}
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Company</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Round</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Lead investor</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {deals.map(deal => (
              <tr key={deal.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">{deal.deal_date.slice(0, 7)}</td>
                <td className="px-4 py-4">
                  <a href={`/companies/${deal.company_name.toLowerCase().replace(/\s+/g, '-')}`}
                    className="font-medium text-[#0A0F1E] hover:text-[#0047CC] transition-colors">
                    {deal.company_name}
                  </a>
                  {deal.notes && <p className="text-xs text-slate-400 mt-0.5 max-w-[200px] truncate">{deal.notes}</p>}
                </td>
                <td className="px-4 py-4">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeColors[deal.deal_type] ?? 'bg-slate-100 text-slate-500'}`}>
                    {deal.deal_type}
                  </span>
                </td>
                <td className="px-4 py-4 text-xs text-slate-500 hidden md:table-cell">
                  {deal.lead_investors.join(', ')}
                </td>
                <td className="px-5 py-4 text-right">
                  <span className="font-bold text-[#0047CC]">
                    {deal.amount ? `${deal.currency === 'USD' ? '$' : deal.currency === 'GBP' ? '£' : '€'}${deal.amount}M` : '—'}
                  </span>
                  {deal.valuation_post && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Post: ${(deal.valuation_post / 1e6).toFixed(0)}M
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
