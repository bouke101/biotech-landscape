# Companies Table & Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/companies` as a full BI table with expandable rows + sorting + filtering, and add a new `/map` page with an interactive Leaflet map, colored pins, "Color by" dropdown, and map layer switcher.

**Architecture:** The companies page becomes a server component that fetches all companies and passes them to a `<CompaniesTable>` client component (TanStack Table). The map page is a server component that fetches companies with coordinates and passes them to `<MapView>` loaded via `dynamic(..., { ssr: false })`. A shared `<CompanyFilterBar>` client component manages URL params using `nuqs` and is used by both pages.

**Tech Stack:** Next.js 16 App Router, React 19, TanStack Table v8 (already installed), Leaflet + react-leaflet (to install), nuqs (already installed), Tailwind CSS, TypeScript strict

**Working directory:** `web/` inside the project root (`/Users/bouke/onedrive/claude/biotech BI/web/`)

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `components/companies-table.tsx` | Client component: TanStack Table with expandable rows, sorting, filter chips |
| `components/company-filter-bar.tsx` | Client component: shared filter bar (search + dropdowns), owns nuqs URL state |
| `components/map-view.tsx` | Client component: Leaflet map, DivIcon pins, color-by, layer switcher, popup |
| `app/map/page.tsx` | Server component: fetch companies with coords, dynamic-import MapView |

### Modified files
| File | Change |
|---|---|
| `lib/supabase/database.types.ts` | Add `lat`, `lng` to `Company` interface |
| `lib/mock/seed.ts` | Add `lat`, `lng` to all mock companies |
| `lib/mock/queries/companies.ts` | Add `hasCoordinates` filter |
| `lib/supabase/queries/companies.ts` | Add `hasCoordinates` filter; pass through to Supabase query |
| `app/companies/page.tsx` | Rewrite: fetch all companies, render `<CompanyFilterBar>` + `<CompaniesTable>` |
| `components/nav.tsx` | Add Map nav item |
| `package.json` | Add leaflet, react-leaflet, @types/leaflet; remove react-simple-maps |

> Note: `database.types.ts` appears once above — the spec listed it twice; that was a spec duplication, not two separate changes.

---

## Task 1: Install dependencies and update types

**Files:**
- Modify: `package.json`
- Modify: `lib/supabase/database.types.ts`

- [ ] **Step 1: Install Leaflet packages**

```bash
cd "/Users/bouke/onedrive/claude/biotech BI/web"
npm install leaflet react-leaflet
npm install --save-dev @types/leaflet
```

Expected: packages added to `node_modules`, `package-lock.json` updated.

- [ ] **Step 2: Remove react-simple-maps**

```bash
npm uninstall react-simple-maps
```

- [ ] **Step 3: Add lat/lng to the Company type**

In `lib/supabase/database.types.ts`, add two fields to the `Company` interface after `on_watchlist`:

```ts
  lat: number | null
  lng: number | null
```

The interface should now include:
```ts
  on_watchlist: boolean
  lat: number | null
  lng: number | null
  created_at: string
  updated_at: string
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: errors only about missing `lat`/`lng` in mock seed data (will fix in Task 2). Zero errors about the type change itself.

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/database.types.ts package.json package-lock.json
git commit -m "feat: add lat/lng to Company type, install react-leaflet"
```

---

## Task 2: Add lat/lng to mock seed data

**Files:**
- Modify: `lib/mock/seed.ts`

- [ ] **Step 1: Add lat/lng to all mock companies**

Open `lib/mock/seed.ts`. Add `lat` and `lng` to every company object. Use these city-center coordinates:

| City | lat | lng |
|---|---|---|
| Wageningen, NL | 51.97 | 5.66 |
| Delft, NL | 52.01 | 4.36 |
| Amsterdam, NL | 52.37 | 4.89 |
| Leiden, NL | 52.16 | 4.49 |
| Ghent, BE | 51.05 | 3.72 |
| Munich, DE | 48.14 | 11.58 |
| London, UK | 51.51 | -0.13 |
| Cambridge, UK | 52.21 | 0.12 |
| Copenhagen, DK | 55.68 | 12.57 |
| Stockholm, SE | 59.33 | 18.07 |
| Boston, USA | 42.36 | -71.06 |
| San Francisco, USA | 37.77 | -122.42 |
| Singapore | 1.35 | 103.82 |

For any company city not in this list, use the nearest major hub, or set `lat: null, lng: null`.

Example for the first company (Wageningen):
```ts
{
  id: '1', slug: 'plantkind', name: 'PlantKind Fermentation', founded_year: 2020,
  hq_city: 'Wageningen', hq_country: 'Netherlands', hq_region: 'Netherlands',
  // ... existing fields ...
  lat: 51.97, lng: 5.66,
  created_at: '2024-01-10T00:00:00Z', updated_at: '2024-03-01T00:00:00Z',
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add lib/mock/seed.ts
git commit -m "feat: add lat/lng coordinates to mock company data"
```

---

## Task 3: Update queries to support hasCoordinates filter

**Files:**
- Modify: `lib/mock/queries/companies.ts`
- Modify: `lib/supabase/queries/companies.ts`

- [ ] **Step 1: Add hasCoordinates to CompanyFilters and mock query**

In `lib/mock/queries/companies.ts`, update `CompanyFilters` and `getMockCompanies`:

```ts
export interface CompanyFilters {
  sector?: string
  stage?: string
  region?: string
  watchlist?: boolean
  search?: string
  hasCoordinates?: boolean
}

export function getMockCompanies(filters: CompanyFilters = {}): Company[] {
  let data = [...COMPANIES]
  if (filters.sector) data = data.filter(c => c.sectors.includes(filters.sector!))
  if (filters.stage) data = data.filter(c => c.stage === filters.stage)
  if (filters.region) data = data.filter(c => c.hq_region === filters.region)
  if (filters.watchlist) data = data.filter(c => c.on_watchlist)
  if (filters.search) data = data.filter(c =>
    c.name.toLowerCase().includes(filters.search!.toLowerCase()) ||
    (c.technology_platform ?? '').toLowerCase().includes(filters.search!.toLowerCase())
  )
  if (filters.hasCoordinates) data = data.filter(c => c.lat !== null && c.lng !== null)
  return data
}
```

- [ ] **Step 2: Add hasCoordinates to Supabase query**

In `lib/supabase/queries/companies.ts`, add to the query block:

```ts
if (filters.hasCoordinates) query = query.not('lat', 'is', null).not('lng', 'is', null)
```

Full updated function:
```ts
export async function getCompanies(filters: CompanyFilters = {}): Promise<Company[]> {
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA !== 'false') return getMockCompanies(filters)
  const { createClient } = await import('../server')
  const supabase = await createClient()
  let query = supabase.from('companies').select('*').order('updated_at', { ascending: false })
  if (filters.sector) query = query.contains('sectors', [filters.sector])
  if (filters.stage) query = query.eq('stage', filters.stage as never)
  if (filters.region) query = query.eq('hq_region', filters.region)
  if (filters.watchlist) query = query.eq('on_watchlist', true)
  if (filters.hasCoordinates) query = query.not('lat', 'is', null).not('lng', 'is', null)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add lib/mock/queries/companies.ts lib/supabase/queries/companies.ts
git commit -m "feat: add hasCoordinates filter to company queries"
```

---

## Task 4: Add Map to sidebar nav

**Files:**
- Modify: `components/nav.tsx`

- [ ] **Step 1: Add the Map link**

In `components/nav.tsx`, add a new entry to the `links` array after Companies:

```ts
const links = [
  { href: '/',            label: 'Dashboard',  icon: '▦' },
  { href: '/companies',   label: 'Companies',  icon: '⬡' },
  { href: '/map',         label: 'Map',        icon: '◉' },
  { href: '/investors',   label: 'Investors',  icon: '◈' },
  { href: '/deals',       label: 'Deal Flow',  icon: '◎' },
  { href: '/trends',      label: 'Trends',     icon: '⟋' },
  { href: '/scraper',     label: 'Scraper',    icon: '⟳' },
]
```

- [ ] **Step 2: Type-check and verify build**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/nav.tsx
git commit -m "feat: add Map to sidebar nav"
```

---

## Task 5: Build the shared CompanyFilterBar component

**Files:**
- Create: `components/company-filter-bar.tsx`

This is a `'use client'` component. It reads and writes URL params using `nuqs`. The canonical param keys are: `q` (search), `sector` (array), `stage` (array), `region` (array), `model` (array), `watchlist` (boolean).

- [ ] **Step 1: Create the component**

Create `components/company-filter-bar.tsx`:

```tsx
'use client'

import { useQueryState, parseAsArrayOf, parseAsString, parseAsBoolean } from 'nuqs'

const SECTORS = [
  'Industrial Biotech', 'Alternative Proteins', 'Synthetic Biology', 'Biomanufacturing',
  'Biobased Materials', 'Biobased Chemicals', 'Agricultural Biotech', 'Food Biotech',
  'Environmental Biotech', 'Digital Biotech', 'Precision Fermentation', 'Biopharmaceuticals',
]
const STAGES = ['Stealth', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D+', 'Public', 'Acquired']
const REGIONS = ['Netherlands', 'Benelux', 'Germany', 'UK', 'Nordic', 'France', 'Rest of Europe', 'USA — West', 'USA — East', 'Asia']
const MODELS = ['B2B', 'B2C', 'Licensing', 'Platform', 'Mixed']

export type ColorByOption = 'sector' | 'stage' | 'model' | 'region'

interface CompanyFilterBarProps {
  showSearch?: boolean
  showColorBy?: boolean
  colorBy?: ColorByOption
  onColorByChange?: (v: ColorByOption) => void
  resultCount?: number
}

export function CompanyFilterBar({
  showSearch = true,
  showColorBy = false,
  colorBy,
  onColorByChange,
  resultCount,
}: CompanyFilterBarProps) {
  const [q, setQ] = useQueryState('q', parseAsString.withDefault(''))
  const [sectors, setSectors] = useQueryState('sector', parseAsArrayOf(parseAsString).withDefault([]))
  const [stages, setStages] = useQueryState('stage', parseAsArrayOf(parseAsString).withDefault([]))
  const [regions, setRegions] = useQueryState('region', parseAsArrayOf(parseAsString).withDefault([]))
  const [models, setModels] = useQueryState('model', parseAsArrayOf(parseAsString).withDefault([]))
  const [watchlist, setWatchlist] = useQueryState('watchlist', parseAsBoolean.withDefault(false))

  const activeChips: { label: string; onRemove: () => void }[] = [
    ...sectors.map(s => ({ label: s, onRemove: () => setSectors(sectors.filter(x => x !== s)) })),
    ...stages.map(s => ({ label: s, onRemove: () => setStages(stages.filter(x => x !== s)) })),
    ...regions.map(r => ({ label: r, onRemove: () => setRegions(regions.filter(x => x !== r)) })),
    ...models.map(m => ({ label: m, onRemove: () => setModels(models.filter(x => x !== m)) })),
    ...(watchlist ? [{ label: '★ Watchlist', onRemove: () => setWatchlist(false) }] : []),
  ]

  const hasFilters = activeChips.length > 0 || q.length > 0

  function clearAll() {
    setQ('')
    setSectors([])
    setStages([])
    setRegions([])
    setModels([])
    setWatchlist(false)
  }

  function toggleMulti(
    value: string,
    current: string[],
    setter: (v: string[]) => void
  ) {
    setter(current.includes(value) ? current.filter(x => x !== value) : [...current, value])
  }

  return (
    <div className="bg-white border-b border-slate-200">
      {/* Toolbar row */}
      <div className="px-5 py-3 flex items-center gap-3 flex-wrap">
        {showSearch && (
          <input
            value={q}
            onChange={e => setQ(e.target.value || null)}
            placeholder="Search companies, tech platforms..."
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] max-w-sm focus:outline-none focus:ring-2 focus:ring-[#0047CC]/20 focus:border-[#0047CC]"
          />
        )}

        <MultiSelect label="Sector" options={SECTORS} selected={sectors} onChange={setSectors} />
        <MultiSelect label="Stage" options={STAGES} selected={stages} onChange={setStages} />
        <MultiSelect label="Region" options={REGIONS} selected={regions} onChange={setRegions} />
        <MultiSelect label="Model" options={MODELS} selected={models} onChange={setModels} />

        <button
          onClick={() => setWatchlist(watchlist ? null : true)}
          className={`text-sm px-3 py-2 rounded-lg border transition-colors ${
            watchlist
              ? 'bg-amber-50 border-amber-300 text-amber-700 font-medium'
              : 'border-slate-200 text-slate-600 hover:border-slate-400'
          }`}
        >
          ★ Watchlist
        </button>

        {showColorBy && onColorByChange && (
          <>
            <div className="w-px h-5 bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 whitespace-nowrap">Color by:</span>
              <select
                value={colorBy}
                onChange={e => onColorByChange(e.target.value as ColorByOption)}
                className="border border-[#0047CC] rounded px-2 py-1.5 text-sm text-[#0047CC] font-semibold focus:outline-none"
              >
                <option value="sector">Sector</option>
                <option value="stage">Stage</option>
                <option value="model">Business Model</option>
                <option value="region">Region</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* Active chips row */}
      {(hasFilters || resultCount !== undefined) && (
        <div className="px-5 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-2 flex-wrap">
          {activeChips.map(chip => (
            <span
              key={chip.label}
              className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 rounded-full px-3 py-0.5 text-xs font-medium"
            >
              {chip.label}
              <button onClick={chip.onRemove} className="hover:text-blue-900 ml-0.5">✕</button>
            </span>
          ))}
          {hasFilters && (
            <button onClick={clearAll} className="text-xs text-[#0047CC] hover:underline ml-1">
              Clear all
            </button>
          )}
          {resultCount !== undefined && (
            <span className="ml-auto text-xs text-slate-500">{resultCount} results</span>
          )}
        </div>
      )}
    </div>
  )
}

// Internal multi-select dropdown
function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  return (
    <div className="relative group">
      <button className={`text-sm px-3 py-2 rounded-lg border transition-colors flex items-center gap-1 ${
        selected.length > 0
          ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
          : 'border-slate-200 text-slate-600 hover:border-slate-400'
      }`}>
        {label} {selected.length > 0 ? `(${selected.length})` : ''} <span className="text-xs">▾</span>
      </button>
      <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 min-w-[180px] py-1 hidden group-focus-within:block group-hover:block">
        {options.map(opt => (
          <label key={opt} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => onChange(
                selected.includes(opt) ? selected.filter(x => x !== opt) : [...selected, opt]
              )}
              className="accent-[#0047CC]"
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
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
git add components/company-filter-bar.tsx
git commit -m "feat: add shared CompanyFilterBar component with nuqs URL state"
```

---

## Task 6: Rewrite the /companies page

**Files:**
- Create: `components/companies-table.tsx`
- Modify: `app/companies/page.tsx`

The page is a server component that fetches all companies. It renders the filter bar and passes companies to a client-side TanStack Table component.

- [ ] **Step 1: Create the CompaniesTable client component**

Create `components/companies-table.tsx`:

```tsx
'use client'

import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ExpandedState,
} from '@tanstack/react-table'
import { useQueryState, parseAsArrayOf, parseAsString, parseAsBoolean } from 'nuqs'
import type { Company } from '@/lib/supabase/database.types'

function fmt(n: number | null) {
  if (!n) return '—'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}

const stageColors: Record<string, string> = {
  'Stealth':   'bg-slate-100 text-slate-500',
  'Pre-seed':  'bg-slate-100 text-slate-600',
  'Seed':      'bg-yellow-100 text-yellow-700',
  'Series A':  'bg-blue-100 text-blue-700',
  'Series B':  'bg-indigo-100 text-indigo-700',
  'Series C':  'bg-purple-100 text-purple-700',
  'Series D+': 'bg-pink-100 text-pink-700',
  'Public':    'bg-green-100 text-green-700',
  'Acquired':  'bg-orange-100 text-orange-700',
}

const sectorColors: Record<string, string> = {
  'Industrial Biotech':    'bg-yellow-50 text-yellow-800',
  'Alternative Proteins':  'bg-blue-50 text-blue-700',
  'Synthetic Biology':     'bg-pink-50 text-pink-700',
  'Biomanufacturing':      'bg-orange-50 text-orange-700',
  'Biobased Materials':    'bg-purple-50 text-purple-700',
  'Biobased Chemicals':    'bg-emerald-50 text-emerald-700',
  'Agricultural Biotech':  'bg-lime-50 text-lime-700',
  'Food Biotech':          'bg-amber-50 text-amber-700',
  'Environmental Biotech': 'bg-teal-50 text-teal-700',
  'Digital Biotech':       'bg-cyan-50 text-cyan-700',
  'Precision Fermentation':'bg-violet-50 text-violet-700',
  'Biopharmaceuticals':    'bg-rose-50 text-rose-800',
}

const col = createColumnHelper<Company>()

const columns = [
  col.accessor('name', {
    header: 'Company',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <button
          onClick={() => row.toggleExpanded()}
          className="text-slate-400 hover:text-slate-600 w-4 text-center flex-shrink-0"
        >
          {row.getIsExpanded() ? '▼' : '▶'}
        </button>
        <div>
          <a href={`/companies/${row.original.slug}`} className="font-semibold text-[#0A0F1E] hover:text-[#0047CC]">
            {row.original.name}
          </a>
          {row.original.website && (
            <div className="text-xs text-slate-400 truncate max-w-[180px]">{row.original.website}</div>
          )}
        </div>
      </div>
    ),
  }),
  col.accessor('sectors', {
    header: 'Sector(s)',
    enableSorting: false,
    cell: ({ getValue }) => (
      <div className="flex flex-wrap gap-1">
        {getValue().map(s => (
          <span key={s} className={`text-xs px-2 py-0.5 rounded-full font-medium ${sectorColors[s] ?? 'bg-slate-100 text-slate-600'}`}>
            {s}
          </span>
        ))}
      </div>
    ),
  }),
  col.accessor('stage', {
    header: 'Stage',
    cell: ({ getValue }) => {
      const v = getValue()
      return v ? (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stageColors[v] ?? 'bg-slate-100 text-slate-500'}`}>
          {v}
        </span>
      ) : <span className="text-slate-400">—</span>
    },
  }),
  col.accessor('hq_city', {
    header: 'HQ',
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-sm text-slate-600 whitespace-nowrap">
        {row.original.hq_city}{row.original.hq_country ? `, ${row.original.hq_country}` : ''}
      </span>
    ),
  }),
  col.accessor('total_funding_usd', {
    header: 'Funding',
    cell: ({ getValue }) => <span className="font-semibold text-[#0047CC]">{fmt(getValue())}</span>,
  }),
  col.accessor('founded_year', {
    header: 'Founded',
    cell: ({ getValue }) => <span className="text-slate-600">{getValue() ?? '—'}</span>,
  }),
  col.accessor('business_model', {
    header: 'Model',
    enableSorting: false,
    cell: ({ getValue }) => <span className="text-sm text-slate-600">{getValue() ?? '—'}</span>,
  }),
  col.accessor('technology_platform', {
    header: 'Tech Platform',
    enableSorting: false,
    cell: ({ getValue }) => <span className="text-xs text-slate-500 max-w-[160px] line-clamp-2">{getValue() ?? '—'}</span>,
  }),
  col.accessor('on_watchlist', {
    header: '★',
    enableSorting: false,
    cell: ({ getValue }) => getValue() ? <span className="text-amber-400">⭐</span> : null,
  }),
]

export function CompaniesTable({ companies }: { companies: Company[] }) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [expanded, setExpanded] = useState<ExpandedState>({})

  const [q] = useQueryState('q', parseAsString.withDefault(''))
  const [sectors] = useQueryState('sector', parseAsArrayOf(parseAsString).withDefault([]))
  const [stages] = useQueryState('stage', parseAsArrayOf(parseAsString).withDefault([]))
  const [regions] = useQueryState('region', parseAsArrayOf(parseAsString).withDefault([]))
  const [models] = useQueryState('model', parseAsArrayOf(parseAsString).withDefault([]))
  const [watchlist] = useQueryState('watchlist', parseAsBoolean.withDefault(false))

  const filtered = useMemo(() => {
    let data = companies
    if (q) data = data.filter(c =>
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      (c.technology_platform ?? '').toLowerCase().includes(q.toLowerCase())
    )
    if (sectors.length > 0) data = data.filter(c => sectors.some(s => c.sectors.includes(s)))
    if (stages.length > 0) data = data.filter(c => stages.includes(c.stage ?? ''))
    if (regions.length > 0) data = data.filter(c => regions.includes(c.hq_region ?? ''))
    if (models.length > 0) data = data.filter(c => models.includes(c.business_model ?? ''))
    if (watchlist) data = data.filter(c => c.on_watchlist)
    return data
  }, [companies, q, sectors, stages, regions, models, watchlist])

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, expanded },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  })

  return (
    <>
      {/* Status bar */}
      <div className="px-5 py-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs text-slate-500">
        <span>{filtered.length} of {companies.length} companies</span>
        {sorting.length > 0 && (
          <span>Sorted by {sorting[0].id} ({sorting[0].desc ? '↓' : '↑'})</span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 border-b-2 border-slate-200">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    className={`px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap ${
                      header.column.getCanSort() ? 'cursor-pointer select-none hover:text-slate-800' : ''
                    }`}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === 'asc' && ' ↑'}
                    {header.column.getIsSorted() === 'desc' && ' ↓'}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows.map(row => (
              <>
                <tr
                  key={row.id}
                  className={`hover:bg-slate-50 cursor-pointer transition-colors ${row.getIsExpanded() ? 'bg-blue-50/50' : ''}`}
                  onClick={() => row.toggleExpanded()}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                {row.getIsExpanded() && (
                  <tr key={`${row.id}-expanded`} className="bg-blue-50/30 border-b-2 border-blue-100">
                    <td colSpan={columns.length} className="px-8 py-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <Detail label="Key Products" value={row.original.key_products} />
                        <Detail label="Employees" value={row.original.employees_approx ? `~${row.original.employees_approx}` : null} />
                        <Detail label="Latest Valuation" value={fmt(row.original.latest_valuation_usd)} />
                        <Detail label="Partnerships" value={row.original.partnerships} />
                        {(row.original.ceo || row.original.cso || row.original.cto) && (
                          <Detail
                            label="Key People"
                            value={[row.original.ceo && `CEO: ${row.original.ceo}`, row.original.cso && `CSO: ${row.original.cso}`, row.original.cto && `CTO: ${row.original.cto}`].filter(Boolean).join(' · ')}
                          />
                        )}
                        {row.original.notes && (
                          <div className="col-span-2 md:col-span-3">
                            <Detail label="Strategic Notes" value={row.original.notes} />
                          </div>
                        )}
                        <div className="flex items-end">
                          <a
                            href={`/companies/${row.original.slug}`}
                            onClick={e => e.stopPropagation()}
                            className="text-[#0047CC] font-medium hover:underline text-sm"
                          >
                            View full profile →
                          </a>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-slate-700">{value}</div>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite the companies page**

Replace `app/companies/page.tsx` entirely:

```tsx
import { getCompanies } from '@/lib/supabase/queries/companies'
import { CompanyFilterBar } from '@/components/company-filter-bar'
import { CompaniesTable } from '@/components/companies-table'

export default async function CompaniesPage() {
  const companies = await getCompanies()

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-slate-200 bg-white">
        <h1 className="text-2xl font-bold text-[#0A0F1E] mb-0.5">Companies</h1>
        <p className="text-sm text-slate-500">Global industrial biotech & food companies</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 mx-5 my-5 overflow-hidden flex flex-col">
        <CompanyFilterBar />
        <CompaniesTable companies={companies} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Run the dev server and verify the page**

```bash
npm run dev
```

Open http://localhost:3000/companies. Verify:
- Table renders with 9 columns
- Clicking a row expands the detail panel
- Sorting works (click column headers)
- Search box filters companies in real time
- Sector/Stage/Region/Model dropdowns add filter chips
- "Clear all" removes chips and resets the table

- [ ] **Step 5: Commit**

```bash
git add components/companies-table.tsx app/companies/page.tsx
git commit -m "feat: rewrite companies page with TanStack Table, expandable rows, and filter chips"
```

---

## Task 7: Build the MapView component

**Files:**
- Create: `components/map-view.tsx`

This is the main Leaflet map component. It must be a `'use client'` component and import `leaflet/dist/leaflet.css`.

- [ ] **Step 1: Create the color mapping utilities at the top of the file**

These will be used to color pins and build the legend.

```tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet'
import { useQueryState, parseAsArrayOf, parseAsString, parseAsBoolean } from 'nuqs'
import 'leaflet/dist/leaflet.css'
import type { Company } from '@/lib/supabase/database.types'
import type { ColorByOption } from './company-filter-bar'

const TILE_LAYERS = {
  street: {
    label: 'Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
  },
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri',
  },
  terrain: {
    label: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap contributors',
  },
  dark: {
    label: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© CartoDB',
  },
} as const

type TileKey = keyof typeof TILE_LAYERS

const SECTOR_COLORS: Record<string, string> = {
  'Industrial Biotech':    '#d97706',
  'Alternative Proteins':  '#2563eb',
  'Synthetic Biology':     '#db2777',
  'Biomanufacturing':      '#ea580c',
  'Biobased Materials':    '#7c3aed',
  'Biobased Chemicals':    '#059669',
  'Agricultural Biotech':  '#65a30d',
  'Food Biotech':          '#ca8a04',
  'Environmental Biotech': '#0d9488',
  'Digital Biotech':       '#0891b2',
  'Precision Fermentation':'#6d28d9',
  'Biopharmaceuticals':    '#be123c',
}

const STAGE_COLORS: Record<string, string> = {
  'Stealth':   '#94a3b8',
  'Pre-seed':  '#64748b',
  'Seed':      '#ca8a04',
  'Series A':  '#2563eb',
  'Series B':  '#4f46e5',
  'Series C':  '#7c3aed',
  'Series D+': '#be185d',
  'Public':    '#16a34a',
  'Acquired':  '#ea580c',
}

const MODEL_COLORS: Record<string, string> = {
  'B2B':       '#2563eb',
  'B2C':       '#16a34a',
  'Licensing': '#7c3aed',
  'Platform':  '#ea580c',
  'Mixed':     '#64748b',
}

const REGION_COLORS: Record<string, string> = {
  'Netherlands':    '#f97316',
  'Benelux':        '#fb923c',
  'Germany':        '#3b82f6',
  'UK':             '#6366f1',
  'Nordic':         '#06b6d4',
  'France':         '#8b5cf6',
  'Rest of Europe': '#a78bfa',
  'USA — West':     '#22c55e',
  'USA — East':     '#16a34a',
  'Asia':           '#f43f5e',
}

const COLOR_MAPS: Record<ColorByOption, Record<string, string>> = {
  sector: SECTOR_COLORS,
  stage: STAGE_COLORS,
  model: MODEL_COLORS,
  region: REGION_COLORS,
}

function getPinColor(company: Company, colorBy: ColorByOption): string {
  const map = COLOR_MAPS[colorBy]
  let key: string | null | undefined
  if (colorBy === 'sector') key = company.sectors[0]
  else if (colorBy === 'stage') key = company.stage
  else if (colorBy === 'model') key = company.business_model
  else if (colorBy === 'region') key = company.hq_region
  return (key && map[key]) ?? '#94a3b8'
}

function fmt(n: number | null) {
  if (!n) return '—'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}
```

- [ ] **Step 2: Add the TileLayerSwitcher sub-component and the main MapView export**

Append to `components/map-view.tsx`:

```tsx
function TileLayerSwitcher({ tileKey, onChange }: { tileKey: TileKey; onChange: (k: TileKey) => void }) {
  return (
    <div className="absolute top-3 right-3 z-[1000] bg-white rounded-xl shadow-lg overflow-hidden text-xs border border-slate-200">
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        Map style
      </div>
      {(Object.keys(TILE_LAYERS) as TileKey[]).map(key => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors border-l-2 ${
            tileKey === key
              ? 'border-l-[#0047CC] bg-blue-50 text-[#0047CC] font-semibold'
              : 'border-l-transparent text-slate-700 hover:bg-slate-50'
          }`}
        >
          {TILE_LAYERS[key].label}
        </button>
      ))}
    </div>
  )
}

function MapLegend({ colorBy }: { colorBy: ColorByOption }) {
  const map = COLOR_MAPS[colorBy]
  const entries = Object.entries(map).slice(0, 8)
  return (
    <div className="absolute bottom-8 left-3 z-[1000] bg-white/95 rounded-xl shadow-lg px-3 py-3 text-xs border border-slate-200 max-w-[180px]">
      <div className="font-semibold text-slate-500 uppercase tracking-wide mb-2">
        Color by: {colorBy}
      </div>
      <div className="space-y-1">
        {entries.map(([label, color]) => (
          <div key={label} className="flex items-center gap-2">
            <span style={{ background: color }} className="w-2.5 h-2.5 rounded-full flex-shrink-0" />
            <span className="text-slate-600 truncate">{label}</span>
          </div>
        ))}
        {Object.keys(map).length > 8 && (
          <div className="text-slate-400">+{Object.keys(map).length - 8} more</div>
        )}
      </div>
    </div>
  )
}

// Swap tile layer without remounting the map
function TileLayerSwapper({ tileKey }: { tileKey: TileKey }) {
  const layer = TILE_LAYERS[tileKey]
  return <TileLayer key={tileKey} url={layer.url} attribution={layer.attribution} />
}

export function MapView({ companies }: { companies: Company[] }) {
  const [colorBy, setColorBy] = useState<ColorByOption>('sector')
  const [tileKey, setTileKey] = useState<TileKey>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('mapTileKey') as TileKey) ?? 'street'
    }
    return 'street'
  })

  const [q] = useQueryState('q', parseAsString.withDefault(''))
  const [sectors] = useQueryState('sector', parseAsArrayOf(parseAsString).withDefault([]))
  const [stages] = useQueryState('stage', parseAsArrayOf(parseAsString).withDefault([]))
  const [regions] = useQueryState('region', parseAsArrayOf(parseAsString).withDefault([]))
  const [models] = useQueryState('model', parseAsArrayOf(parseAsString).withDefault([]))
  const [watchlist] = useQueryState('watchlist', parseAsBoolean.withDefault(false))

  function handleTileChange(key: TileKey) {
    setTileKey(key)
    localStorage.setItem('mapTileKey', key)
  }

  const filtered = useMemo(() => {
    let data = companies
    if (q) data = data.filter(c =>
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      (c.technology_platform ?? '').toLowerCase().includes(q.toLowerCase())
    )
    if (sectors.length > 0) data = data.filter(c => sectors.some(s => c.sectors.includes(s)))
    if (stages.length > 0) data = data.filter(c => stages.includes(c.stage ?? ''))
    if (regions.length > 0) data = data.filter(c => regions.includes(c.hq_region ?? ''))
    if (models.length > 0) data = data.filter(c => models.includes(c.business_model ?? ''))
    if (watchlist) data = data.filter(c => c.on_watchlist)
    return data
  }, [companies, q, sectors, stages, regions, models, watchlist])

  const countryCount = useMemo(
    () => new Set(filtered.map(c => c.hq_country).filter(Boolean)).size,
    [filtered]
  )

  return (
    <div className="relative flex flex-col flex-1 overflow-hidden">
      {/* Filter bar */}
      <div className="relative z-[1000] bg-white border-b border-slate-200">
        <div className="px-4 py-2">
          {/* CompanyFilterBar is imported at the page level and rendered above MapView;
              here we just show the Color by selector inline */}
        </div>
      </div>

      {/* Map */}
      <div className="relative flex-1">
        <MapContainer
          center={[52.37, 4.89]}
          zoom={5}
          minZoom={2}
          maxZoom={15}
          className="h-full w-full"
          style={{ height: '100%' }}
        >
          <TileLayerSwapper tileKey={tileKey} />
          {filtered.map(company => {
            if (company.lat === null || company.lng === null) return null
            const color = getPinColor(company, colorBy)
            return (
              <CircleMarker
                key={company.id}
                center={[company.lat!, company.lng!]}
                radius={7}
                pathOptions={{ color: 'white', fillColor: color, fillOpacity: 1, weight: 2 }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>
                  <span className="text-xs font-semibold">{company.name}</span>
                </Tooltip>
                <Popup>
                  <div className="min-w-[200px] py-1">
                    <div className="font-bold text-[#0A0F1E] text-base mb-2">{company.name}</div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {company.sectors.map(s => (
                        <span key={s} className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">{s}</span>
                      ))}
                      {company.stage && (
                        <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{company.stage}</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mb-1">
                      📍 {company.hq_city}{company.hq_country ? `, ${company.hq_country}` : ''}
                    </div>
                    <div className="text-xs text-slate-500 mb-1">
                      💰 {fmt(company.total_funding_usd)}{company.founded_year ? ` · Founded ${company.founded_year}` : ''}
                    </div>
                    {company.technology_platform && (
                      <div className="text-xs text-slate-500 mb-2">🧬 {company.technology_platform}</div>
                    )}
                    {company.notes && (
                      <div className="text-xs text-slate-500 italic mb-2 line-clamp-2">{company.notes}</div>
                    )}
                    <a href={`/companies/${company.slug}`} className="text-[#0047CC] text-xs font-semibold hover:underline">
                      View full profile →
                    </a>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>

        {/* Overlays */}
        <TileLayerSwitcher tileKey={tileKey} onChange={handleTileChange} />
        <MapLegend colorBy={colorBy} />

        {/* Color by selector (floating, top-left) */}
        <div className="absolute top-3 left-3 z-[1000] bg-white rounded-lg shadow-md px-3 py-2 flex items-center gap-2 text-xs border border-slate-200">
          <span className="text-slate-500 whitespace-nowrap">Color by:</span>
          <select
            value={colorBy}
            onChange={e => setColorBy(e.target.value as ColorByOption)}
            className="border border-[#0047CC] rounded px-2 py-1 text-[#0047CC] font-semibold focus:outline-none text-xs"
          >
            <option value="sector">Sector</option>
            <option value="stage">Stage</option>
            <option value="model">Business Model</option>
            <option value="region">Region</option>
          </select>
        </div>

        {/* Stats badge */}
        <div className="absolute bottom-8 right-3 z-[1000] bg-white/95 rounded-lg shadow-md px-3 py-2 text-xs border border-slate-200 text-slate-700">
          <strong>{filtered.length}</strong> companies · <strong>{countryCount}</strong> countries
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add components/map-view.tsx
git commit -m "feat: add MapView component with Leaflet, colored pins, layer switcher, and popup"
```

---

## Task 8: Build the /map page

**Files:**
- Create: `app/map/page.tsx`

- [ ] **Step 1: Create the map page**

Create `app/map/page.tsx`:

```tsx
import dynamic from 'next/dynamic'
import { getCompanies } from '@/lib/supabase/queries/companies'
import { CompanyFilterBar } from '@/components/company-filter-bar'

const MapView = dynamic(() => import('@/components/map-view').then(m => m.MapView), { ssr: false })

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
        <MapView companies={companies} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: successful build. No Leaflet SSR errors.

- [ ] **Step 4: Run the dev server and verify the map**

```bash
npm run dev
```

Open http://localhost:3000/map. Verify:
- Map loads centered on Netherlands at zoom 5
- Company pins appear as colored dots
- Hovering a pin shows a tooltip
- Clicking a pin shows the popup card with company info and "View full profile →" link
- "Color by" dropdown changes pin colors and legend updates
- Layer switcher toggles between Street / Satellite / Terrain / Dark
- Filter bar filters visible pins in real time
- Stats badge shows correct company and country counts
- Switching between pages (Companies ↔ Map) preserves filter URL params

- [ ] **Step 5: Commit**

```bash
git add app/map/page.tsx
git commit -m "feat: add /map page with server-fetched companies and dynamic MapView"
```

---

## Done

All tasks complete. The `/companies` page is a full BI table with expandable rows, sorting, and multi-filter chips. The `/map` page shows companies as colored interactive pins on a Leaflet map with layer switching and a "Color by" control.
