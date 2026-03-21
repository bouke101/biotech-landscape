# Add Company Modal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "+ Add Company" button and modal form to the `/companies` page that inserts a new company into Supabase and shows it in the table immediately via an optimistic update.

**Architecture:** A new `CompaniesClient` client wrapper component owns the `useOptimistic` companies list, modal open/close state, and error state. It renders `CompanyFilterBar`, `CompaniesTable`, and `AddCompanyModal`. The server page passes the fetched companies to this wrapper. A Server Action (`app/actions/companies.ts`) handles validation, slug generation, and Supabase insert.

**Tech Stack:** Next.js 16 App Router, React 19 (`useOptimistic`, `useTransition`), Supabase, TypeScript strict, Tailwind CSS

**Working directory:** `web/` inside the project root (`/Users/bouke/onedrive/claude/biotech BI/web/`)

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `app/actions/companies.ts` | Create | Server Action: validate, slug, insert into Supabase |
| `components/add-company-modal.tsx` | Create | Modal UI: controlled form with all 4 sections |
| `components/companies-client.tsx` | Create | Client wrapper: optimistic state, modal wiring, router.refresh |
| `app/companies/page.tsx` | Modify | Pass companies to `CompaniesClient`; detect mock mode |

---

## Task 1: Server Action — createCompany

**Files:**
- Create: `app/actions/companies.ts`

- [ ] **Step 1: Create the server action file**

Create `app/actions/companies.ts`:

```ts
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
    .insert(insert)
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
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add app/actions/companies.ts
git commit -m "feat: add createCompany server action"
```

---

## Task 2: AddCompanyModal component

**Files:**
- Create: `components/add-company-modal.tsx`

This is a controlled form component. It does NOT call the server action directly — it calls `onSubmit(formData)` and lets `CompaniesClient` handle the action and state.

- [ ] **Step 1: Create the component**

Create `components/add-company-modal.tsx`:

```tsx
'use client'

import { useRef } from 'react'

const SECTORS = [
  'Industrial Biotech', 'Alternative Proteins', 'Synthetic Biology', 'Biomanufacturing',
  'Biobased Materials', 'Biobased Chemicals', 'Agricultural Biotech', 'Food Biotech',
  'Environmental Biotech', 'Digital Biotech', 'Precision Fermentation', 'Biopharmaceuticals',
]
const STAGES = ['Stealth', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D+', 'Public', 'Acquired']
const REGIONS = ['Netherlands', 'Benelux', 'Germany', 'UK', 'Nordic', 'France', 'Rest of Europe', 'USA — West', 'USA — East', 'Asia']
const MODELS = ['B2B', 'B2C', 'Licensing', 'Platform', 'Mixed']

interface AddCompanyModalProps {
  open: boolean
  onClose: () => void
  error: string | null
  onSubmit: (formData: FormData) => void
}

export function AddCompanyModal({ open, onClose, error, onSubmit }: AddCompanyModalProps) {
  const formRef = useRef<HTMLFormElement>(null)

  if (!open) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formRef.current) return
    onSubmit(new FormData(formRef.current))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-[#0A0F1E]">Add Company</h2>
            <p className="text-sm text-slate-500 mt-0.5">New entry will appear in the table immediately</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none mt-0.5"
          >
            ✕
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex-shrink-0">
            {error}
          </div>
        )}

        {/* Scrollable form body */}
        <form id="add-company-form" ref={formRef} onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* Identity */}
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Identity</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Company name <Required /></Label>
                <Input name="name" placeholder="e.g. PlantKind Fermentation" required />
              </div>
              <div>
                <Label>Website</Label>
                <Input name="website" placeholder="plantkind.bio" />
              </div>
              <div>
                <Label>Founded year</Label>
                <Input name="founded_year" type="number" placeholder="2021" min={1900} max={2100} />
              </div>
            </div>
          </section>

          {/* Classification */}
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Classification</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Sector(s) <Required /></Label>
                <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                  {SECTORS.map(s => (
                    <label key={s} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:text-slate-900">
                      <input type="checkbox" name="sectors" value={s} className="accent-[#0047CC]" />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label>Stage</Label>
                <Select name="stage">
                  <option value="">— select —</option>
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
              </div>
              <div>
                <Label>Business model</Label>
                <Select name="business_model">
                  <option value="">— select —</option>
                  {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                </Select>
              </div>
              <div>
                <Label>Tech platform</Label>
                <Input name="technology_platform" placeholder="Precision fermentation" />
              </div>
              <div>
                <Label>Key products</Label>
                <Input name="key_products" placeholder="MycoProtein XL" />
              </div>
            </div>
          </section>

          {/* Location */}
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Location</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>City</Label>
                <Input name="hq_city" placeholder="Amsterdam" />
              </div>
              <div>
                <Label>Country</Label>
                <Input name="hq_country" placeholder="Netherlands" />
              </div>
              <div>
                <Label>Region</Label>
                <Select name="hq_region">
                  <option value="">— select —</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </Select>
              </div>
            </div>
          </section>

          {/* Financials & Team */}
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Financials & Team</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Total funding (USD)</Label>
                <Input name="total_funding_usd" type="number" placeholder="12000000" min={0} />
              </div>
              <div>
                <Label>Latest valuation (USD)</Label>
                <Input name="latest_valuation_usd" type="number" placeholder="50000000" min={0} />
              </div>
              <div>
                <Label>Employees (approx)</Label>
                <Input name="employees_approx" type="number" placeholder="45" min={0} />
              </div>
              <div>
                <Label>CEO</Label>
                <Input name="ceo" placeholder="Jane Smith" />
              </div>
              <div>
                <Label>CSO</Label>
                <Input name="cso" placeholder="Dr. Ali Hassan" />
              </div>
              <div>
                <Label>CTO</Label>
                <Input name="cto" placeholder="Lena Park" />
              </div>
              <div className="col-span-3">
                <Label>Partnerships</Label>
                <Input name="partnerships" placeholder="Wageningen UR, DSM-Firmenich" />
              </div>
              <div className="col-span-3">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" name="on_watchlist" value="on" className="accent-[#0047CC]" />
                  ★ Add to watchlist
                </label>
              </div>
              <div className="col-span-3">
                <Label>Strategic notes</Label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Key observations, strategic context..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0047CC]/20 focus:border-[#0047CC] resize-none"
                />
              </div>
            </div>
          </section>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:border-slate-400 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-company-form"
            className="px-5 py-2 text-sm font-semibold bg-[#0047CC] text-white rounded-lg hover:bg-[#0039A6] transition-colors"
          >
            Save Company
          </button>
        </div>
      </div>
    </div>
  )
}

// Small helpers to keep form markup DRY
function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-medium text-slate-600 mb-1.5">{children}</div>
}

function Required() {
  return <span className="text-red-500 ml-0.5">*</span>
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0047CC]/20 focus:border-[#0047CC] ${className ?? ''}`}
    />
  )
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0047CC]/20 focus:border-[#0047CC] bg-white"
    >
      {children}
    </select>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/add-company-modal.tsx
git commit -m "feat: add AddCompanyModal form component"
```

---

## Task 3: CompaniesClient wrapper + update page

**Files:**
- Create: `components/companies-client.tsx`
- Modify: `app/companies/page.tsx`

- [ ] **Step 1: Create CompaniesClient**

Create `components/companies-client.tsx`:

```tsx
'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CompanyFilterBar } from './company-filter-bar'
import { CompaniesTable } from './companies-table'
import { AddCompanyModal } from './add-company-modal'
import { createCompany } from '@/app/actions/companies'
import type { Company } from '@/lib/supabase/database.types'

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
      stage: (formData.get('stage') as Company['stage']) || null,
      hq_city: (formData.get('hq_city') as string) || null,
      hq_country: (formData.get('hq_country') as string) || null,
      hq_region: (formData.get('hq_region') as string) || null,
      total_funding_usd: formData.get('total_funding_usd') ? Number(formData.get('total_funding_usd')) : null,
      founded_year: formData.get('founded_year') ? Number(formData.get('founded_year')) : null,
      business_model: (formData.get('business_model') as Company['business_model']) || null,
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
```

- [ ] **Step 2: Update the companies page**

Replace `app/companies/page.tsx`:

```tsx
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
```

Note: The `Suspense` in `page.tsx` wraps `<CompaniesClient>` at the server render level, which is what matters for nuqs — nuqs calls `useSearchParams()` internally which suspends during SSR. All nuqs-using components (`CompanyFilterBar`) remain inside that `Suspense` boundary.

Note on spec deviation: The spec's file change table lists `lib/supabase/queries/companies.ts` as a file to modify, adding a `createCompany` query function. This plan puts the insert logic inline in the Server Action instead, which is simpler and avoids an unnecessary layer of indirection (YAGNI). The spec's intent is fully satisfied.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Run build to verify no SSR errors**

```bash
npm run build
```

Expected: clean build, `/companies` listed as a dynamic route.

- [ ] **Step 5: Commit**

```bash
git add components/companies-client.tsx app/companies/page.tsx
git commit -m "feat: add CompaniesClient wrapper with optimistic insert and Add Company button"
```

---

## Done

All 3 tasks complete. The `/companies` page has a "+ Add Company" button (visible when connected to Supabase) that opens a full modal form. On submit, the new company appears in the table immediately and is persisted via Server Action. Errors are shown inline in the modal.
