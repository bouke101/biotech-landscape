import { Suspense } from 'react'
import { getCompanies } from '@/lib/supabase/queries/companies'
import { CompaniesClient } from '@/components/companies-client'

export default async function CompaniesPage() {
  const companies = await getCompanies()
  const showAddButton = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'false'

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-slate-200 bg-white">
        <h1 className="text-2xl font-bold text-[#0A0F1E] mb-0.5">Companies</h1>
        <p className="text-sm text-slate-500">Global industrial biotech & food companies</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 mx-5 my-5 overflow-hidden flex flex-col">
        <Suspense>
          <CompaniesClient companies={companies} showAddButton={showAddButton} />
        </Suspense>
      </div>
    </div>
  )
}
