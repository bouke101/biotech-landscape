import { getCompanies } from '@/lib/supabase/queries/companies'
import { CompanyFilterBar } from '@/components/company-filter-bar'
import { MapPageClient } from './map-page-client'

export default async function MapPage() {
  const companies = await getCompanies({ hasCoordinates: true })

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 0px)' }}>
      <div className="px-5 py-4 bg-white border-b border-slate-200">
        <h1 className="text-2xl font-bold text-[#0A0F1E] mb-0.5">Map</h1>
        <p className="text-sm text-slate-500">Geographic view of the biotech landscape</p>
      </div>
      <CompanyFilterBar showSearch resultCount={companies.length} />
      <div className="flex-1 relative">
        <MapPageClient companies={companies} />
      </div>
    </div>
  )
}
