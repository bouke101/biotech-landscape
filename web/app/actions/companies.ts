'use server'

import type { Company } from '@/lib/supabase/database.types'

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getNumber(fd: FormData, key: string): number | null {
  const raw = fd.get(key)
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

type Result =
  | { success: true; company: Company }
  | { success: false; error: string }

export async function createCompany(formData: FormData): Promise<Result> {
  const name = (formData.get('name')?.toString() ?? '').trim()
  const sectors = (formData.getAll('sectors') as string[]).map(s => s.trim()).filter(Boolean)

  if (!name) return { success: false, error: 'Company name is required.' }
  if (sectors.length === 0) return { success: false, error: 'At least one sector is required.' }

  const slug = toSlug(name)
  if (!slug) return { success: false, error: 'Company name must contain at least one letter or number.' }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const insert = {
    name,
    slug,
    sectors,
    founded_year:         getNumber(formData, 'founded_year'),
    website:              (formData.get('website')        as string) || null,
    stage:                (formData.get('stage')          as string) || null,
    business_model:       (formData.get('business_model') as string) || null,
    technology_platform:  (formData.get('technology_platform') as string) || null,
    key_products:         (formData.get('key_products')   as string) || null,
    hq_city:              (formData.get('hq_city')        as string) || null,
    hq_country:           (formData.get('hq_country')     as string) || null,
    hq_region:            (formData.get('hq_region')      as string) || null,
    total_funding_usd:    getNumber(formData, 'total_funding_usd'),
    latest_valuation_usd: getNumber(formData, 'latest_valuation_usd'),
    employees_approx:     getNumber(formData, 'employees_approx'),
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
    .insert(insert as never)
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
