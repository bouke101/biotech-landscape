'use server'

import type { Company, CompanyStage, BusinessModel, Database } from '@/lib/supabase/database.types'

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

const VALID_STAGES: readonly CompanyStage[] = ['Stealth', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D+', 'Public', 'Acquired']
const VALID_MODELS: readonly BusinessModel[] = ['B2B', 'B2C', 'Licensing', 'Platform', 'Mixed']

function getEnum<T extends string>(fd: FormData, key: string, allowed: readonly T[]): T | null {
  const val = fd.get(key)?.toString()
  return val && (allowed as readonly string[]).includes(val) ? (val as T) : null
}

type Result =
  | { success: true; company: Company }
  | { success: false; error: string }

async function insertCompany(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  insert: Database['public']['Tables']['companies']['Insert']
) {
  // The insert object is properly validated by its type annotation.
  // We use 'as any' here minimally only for the Supabase client call due to SSR type propagation limitations.
  return await (supabase.from('companies') as any).insert(insert).select().single()
}

export async function createCompany(formData: FormData): Promise<Result> {
  const name = (formData.get('name')?.toString() ?? '').trim()
  const sectors = (formData.getAll('sectors') as string[]).map(s => s.trim()).filter(Boolean)

  if (!name) return { success: false, error: 'Company name is required.' }
  if (sectors.length === 0) return { success: false, error: 'At least one sector is required.' }

  const slug = toSlug(name)
  if (!slug) return { success: false, error: 'Company name must contain at least one letter or number.' }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const insert: Database['public']['Tables']['companies']['Insert'] = {
    name,
    slug,
    sectors,
    founded_year:         getNumber(formData, 'founded_year'),
    website:              (formData.get('website')?.toString() ?? null),
    stage:                getEnum(formData, 'stage', VALID_STAGES),
    business_model:       getEnum(formData, 'business_model', VALID_MODELS),
    technology_platform:  (formData.get('technology_platform')?.toString() ?? null),
    key_products:         (formData.get('key_products')?.toString() ?? null),
    hq_city:              (formData.get('hq_city')?.toString() ?? null),
    hq_country:           (formData.get('hq_country')?.toString() ?? null),
    hq_region:            (formData.get('hq_region')?.toString() ?? null),
    total_funding_usd:    getNumber(formData, 'total_funding_usd'),
    latest_valuation_usd: getNumber(formData, 'latest_valuation_usd'),
    employees_approx:     getNumber(formData, 'employees_approx'),
    ceo:                  (formData.get('ceo')?.toString() ?? null),
    cso:                  (formData.get('cso')?.toString() ?? null),
    cto:                  (formData.get('cto')?.toString() ?? null),
    partnerships:         (formData.get('partnerships')?.toString() ?? null),
    on_watchlist:         formData.get('on_watchlist') === 'on',
    notes:                (formData.get('notes')?.toString() ?? null),
  }

  const { data, error } = await insertCompany(supabase, insert)

  if (error) {
    // Postgres unique constraint violation code
    if (error.code === '23505') {
      return { success: false, error: 'A company with this name already exists.' }
    }
    return { success: false, error: error.message }
  }

  return { success: true, company: data }
}
