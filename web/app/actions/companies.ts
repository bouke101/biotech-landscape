'use server'

import type { Company } from '@/lib/supabase/database.types'

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

type Result =
  | { success: true; company: Company }
  | { success: false; error: string }

export async function createCompany(formData: FormData): Promise<Result> {
  const name = (formData.get('name') as string ?? '').trim()
  const sectors = formData.getAll('sectors') as string[]

  if (!name) return { success: false, error: 'Company name is required.' }
  if (sectors.length === 0) return { success: false, error: 'At least one sector is required.' }

  const slug = toSlug(name)

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const insert = {
    name,
    slug,
    sectors,
    founded_year:         formData.get('founded_year')        ? Number(formData.get('founded_year'))        : null,
    website:              (formData.get('website')        as string) || null,
    stage:                (formData.get('stage')          as string) || null,
    business_model:       (formData.get('business_model') as string) || null,
    technology_platform:  (formData.get('technology_platform') as string) || null,
    key_products:         (formData.get('key_products')   as string) || null,
    hq_city:              (formData.get('hq_city')        as string) || null,
    hq_country:           (formData.get('hq_country')     as string) || null,
    hq_region:            (formData.get('hq_region')      as string) || null,
    total_funding_usd:    formData.get('total_funding_usd')    ? Number(formData.get('total_funding_usd'))    : null,
    latest_valuation_usd: formData.get('latest_valuation_usd') ? Number(formData.get('latest_valuation_usd')) : null,
    employees_approx:     formData.get('employees_approx')     ? Number(formData.get('employees_approx'))     : null,
    ceo:                  (formData.get('ceo')            as string) || null,
    cso:                  (formData.get('cso')            as string) || null,
    cto:                  (formData.get('cto')            as string) || null,
    partnerships:         (formData.get('partnerships')   as string) || null,
    on_watchlist:         formData.get('on_watchlist') === 'on',
    notes:                (formData.get('notes')          as string) || null,
    lat: null,
    lng: null,
  }

  const { data, error } = await supabase
    .from('companies')
    .insert(insert as any)
    .select()
    .single()

  if (error) {
    // Postgres unique constraint violation code
    if (error.code === '23505') {
      return { success: false, error: 'A company with this name already exists.' }
    }
    return { success: false, error: error.message }
  }

  return { success: true, company: data }
}
