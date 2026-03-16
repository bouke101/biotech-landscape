import { getInvestorBySlug } from '@/lib/supabase/queries/investors'
import { Badge } from '@/components/ui/badge'
import { notFound } from 'next/navigation'

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null
  return (
    <div className="flex gap-4 py-3 border-b border-slate-100 last:border-0">
      <p className="text-xs text-slate-400 font-medium w-44 shrink-0 pt-0.5">{label}</p>
      <p className="text-sm text-[#0A0F1E]">{value}</p>
    </div>
  )
}

function fmt(n: number | null) {
  if (!n) return null
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`
  return `$${n.toLocaleString()}`
}

export default async function InvestorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const investor = await getInvestorBySlug(slug)
  if (!investor) notFound()

  return (
    <div className="max-w-4xl">
      <a href="/investors" className="text-xs text-slate-400 hover:text-slate-600 mb-4 inline-block">← Investors</a>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0F1E] mb-1">{investor.name}</h1>
          <p className="text-sm text-slate-500">{investor.investor_type} · {investor.hq_country}</p>
        </div>
        {investor.fund_size_usd && (
          <div className="text-right shrink-0">
            <p className="text-xs text-slate-400">Fund size</p>
            <p className="text-xl font-bold text-[#0047CC]">{fmt(investor.fund_size_usd)}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-6">
        {investor.focus_sectors.map(s => <Badge key={s} variant="secondary">{s}</Badge>)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-[#0A0F1E] mb-3">Investment profile</h2>
          <Row label="Type" value={investor.investor_type} />
          <Row label="Focus stages" value={investor.focus_stages.join(', ')} />
          <Row label="Geographic focus" value={investor.geographic_focus.join(', ')} />
          <Row label="Typical check" value={
            investor.typical_check_min && investor.typical_check_max
              ? `€${investor.typical_check_min / 1e6}M – €${investor.typical_check_max / 1e6}M`
              : null
          } />
          <Row label="Key partners" value={investor.key_partners} />
          <Row label="Co-investment" value={investor.co_investment_pref} />
          <Row label="Website" value={investor.website ? (
            <a href={`https://${investor.website}`} target="_blank" className="text-[#0047CC] hover:underline">{investor.website}</a>
          ) : null} />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-[#0A0F1E] mb-3">Notable portfolio</h2>
          {investor.notable_portfolio.length > 0 ? (
            <div className="space-y-2">
              {investor.notable_portfolio.map(co => (
                <div key={co} className="text-sm text-[#0A0F1E] py-2 border-b border-slate-50 last:border-0">{co}</div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No portfolio companies recorded.</p>
          )}
          {investor.notes && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 font-medium mb-2">Strategic notes</p>
              <p className="text-sm text-slate-600 leading-relaxed">{investor.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
