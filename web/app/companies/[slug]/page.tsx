import { getCompanyBySlug } from '@/lib/supabase/queries/companies'
import { getDeals } from '@/lib/supabase/queries/deals'
import { Badge } from '@/components/ui/badge'
import { notFound } from 'next/navigation'

function fmt(n: number | null) {
  if (!n) return '—'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`
  return `$${n.toLocaleString()}`
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value || value === '—') return null
  return (
    <div className="flex gap-4 py-3 border-b border-slate-100 last:border-0">
      <p className="text-xs text-slate-400 font-medium w-40 shrink-0 pt-0.5">{label}</p>
      <p className="text-sm text-[#0A0F1E]">{value}</p>
    </div>
  )
}

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [company, allDeals] = await Promise.all([
    getCompanyBySlug(slug),
    getDeals(),
  ])

  if (!company) notFound()

  const companyDeals = allDeals.filter(d => d.company_id === company.id || d.company_name === company.name)

  const stageColor: Record<string, string> = {
    'Pre-seed': 'bg-slate-100 text-slate-600', Seed: 'bg-yellow-100 text-yellow-700',
    'Series A': 'bg-blue-100 text-blue-700', 'Series B': 'bg-indigo-100 text-indigo-700',
    'Series C': 'bg-purple-100 text-purple-700',
  }

  return (
    <div className="max-w-4xl">
      <a href="/companies" className="text-xs text-slate-400 hover:text-slate-600 mb-4 inline-block">← Companies</a>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-[#0A0F1E]">{company.name}</h1>
            {company.on_watchlist && <span className="text-amber-400">⭐</span>}
          </div>
          <p className="text-sm text-slate-500">{company.technology_platform}</p>
        </div>
        <span className={`text-sm font-semibold px-3 py-1 rounded-full shrink-0 ${stageColor[company.stage ?? ''] ?? 'bg-slate-100 text-slate-500'}`}>
          {company.stage}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-6">
        {company.sectors.map(s => (
          <Badge key={s} variant="secondary">{s}</Badge>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total funding', value: fmt(company.total_funding_usd) },
          { label: 'Latest valuation', value: fmt(company.latest_valuation_usd) },
          { label: 'Employees', value: company.employees_approx ? `~${company.employees_approx}` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <p className="text-xl font-bold text-[#0047CC]">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-[#0A0F1E] mb-3">Company details</h2>
          <Row label="Founded" value={company.founded_year?.toString()} />
          <Row label="HQ" value={`${company.hq_city}, ${company.hq_country}`} />
          <Row label="Business model" value={company.business_model} />
          <Row label="Key products" value={company.key_products} />
          <Row label="Partnerships" value={company.partnerships} />
          <Row label="Website" value={company.website ? <a href={`https://${company.website}`} target="_blank" className="text-[#0047CC] hover:underline">{company.website}</a> : null} />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-[#0A0F1E] mb-3">Key people</h2>
          <Row label="CEO" value={company.ceo} />
          <Row label="CSO" value={company.cso} />
          <Row label="CTO" value={company.cto} />
          {company.notes && (
            <>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400 font-medium mb-2">Strategic notes</p>
                <p className="text-sm text-slate-600 leading-relaxed">{company.notes}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {companyDeals.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-[#0A0F1E]">Funding history</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {companyDeals.map(deal => (
              <div key={deal.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[#0A0F1E]">{deal.deal_type}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{deal.deal_date.slice(0, 7)} · Lead: {deal.lead_investors.join(', ')}</p>
                  {deal.co_investors.length > 0 && (
                    <p className="text-xs text-slate-400 mt-0.5">Co-investors: {deal.co_investors.join(', ')}</p>
                  )}
                  {deal.use_of_funds && <p className="text-xs text-slate-500 mt-1 italic">{deal.use_of_funds}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-[#0047CC]">{deal.amount ? `€${deal.amount}M` : '—'}</p>
                  {deal.valuation_post && <p className="text-xs text-slate-400 mt-0.5">Post: {fmt(deal.valuation_post)}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
