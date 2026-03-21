'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CompanyFilterBar } from './company-filter-bar'
import { CompaniesTable } from './companies-table'
import { AddCompanyModal } from './add-company-modal'
import { createCompany } from '@/app/actions/companies'
import type { Company, CompanyStage, BusinessModel } from '@/lib/supabase/database.types'

interface CompaniesClientProps {
  companies: Company[]
  showAddButton: boolean
}

export function CompaniesClient({ companies, showAddButton }: CompaniesClientProps) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const [optimisticCompanies, addOptimistic] = useOptimistic(
    companies,
    (state: Company[], newCompany: Company) => [newCompany, ...state]
  )

  function handleOpenModal() {
    setError(null)
    setModalOpen(true)
  }

  function handleSubmit(formData: FormData) {
    // Build an optimistic placeholder from form data
    const optimistic: Company = {
      id: `optimistic-${Date.now()}`,
      name: formData.get('name') as string,
      slug: '',
      sectors: formData.getAll('sectors') as string[],
      stage: (formData.get('stage') as CompanyStage | null) || null,
      hq_city: (formData.get('hq_city') as string) || null,
      hq_country: (formData.get('hq_country') as string) || null,
      hq_region: (formData.get('hq_region') as string) || null,
      total_funding_usd: formData.get('total_funding_usd') ? Number(formData.get('total_funding_usd')) : null,
      founded_year: formData.get('founded_year') ? Number(formData.get('founded_year')) : null,
      business_model: (formData.get('business_model') as BusinessModel | null) || null,
      technology_platform: (formData.get('technology_platform') as string) || null,
      key_products: (formData.get('key_products') as string) || null,
      latest_valuation_usd: formData.get('latest_valuation_usd') ? Number(formData.get('latest_valuation_usd')) : null,
      employees_approx: formData.get('employees_approx') ? Number(formData.get('employees_approx')) : null,
      ceo: (formData.get('ceo') as string) || null,
      cso: (formData.get('cso') as string) || null,
      cto: (formData.get('cto') as string) || null,
      website: (formData.get('website') as string) || null,
      partnerships: (formData.get('partnerships') as string) || null,
      on_watchlist: formData.get('on_watchlist') === 'on',
      notes: (formData.get('notes') as string) || null,
      lat: null,
      lng: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    startTransition(async () => {
      addOptimistic(optimistic)
      const result = await createCompany(formData)
      if (result.success) {
        setModalOpen(false)
        setError(null)
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <>
      {showAddButton && (
        <div className="px-5 py-3 flex justify-end border-b border-slate-100 bg-white">
          <button
            onClick={handleOpenModal}
            className="bg-[#0047CC] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#0039A6] transition-colors"
          >
            + Add Company
          </button>
        </div>
      )}
      <CompanyFilterBar />
      <CompaniesTable companies={optimisticCompanies} />
      <AddCompanyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        error={error}
        onSubmit={handleSubmit}
      />
    </>
  )
}
