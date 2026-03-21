# Design: Companies Table & Map Views

**Date:** 2026-03-19
**Status:** Approved
**Scope:** Redesign `/companies` page + add new `/map` page to the Biotech BI platform

---

## Overview

Replace the existing simple companies table with a full BI-grade table view, and add a new geographic map page. Both are separate nav items — the map gets its own immersive full-screen experience, while the companies page remains the canonical data table.

**Goal:** List all industrial biotech and food companies globally (focus: Netherlands and Europe) with rich BI information visible at a glance, plus a geographic view to explore where companies cluster.

---

## 1. Navigation

- Add `/map` as a new item in the left sidebar nav (`components/nav.tsx`)
- `/companies` remains the table view (no URL change)
- Both pages are independent — no shared URL state between them

---

## 2. `/companies` — BI Table Page

### Layout

- Search bar + filter dropdowns in a top toolbar
- Active filters shown as removable chips below the toolbar
- Single scrollable table beneath — no pagination
- Sticky column headers while scrolling
- Status bar at the bottom showing match count and active sort

### Columns (all visible by default)

| Column | Sortable | Notes |
|---|---|---|
| Company | ✓ | Name + website subtitle + expand toggle (▶/▼) |
| Sector(s) | — | Colored badges, multi-sector supported |
| Stage | ✓ | Colored badge per stage |
| HQ | — | City + country |
| Funding | ✓ | Total raised in EUR/USD |
| Founded | ✓ | Year |
| Business Model | — | B2B / B2C / Licensing / Platform / Mixed |
| Tech Platform | — | Short descriptor, subdued style |
| ★ | — | Watchlist indicator |

### Expandable Rows

Clicking a row expands an inline detail panel. Use TanStack Table's built-in `getExpandedRowModel()`. Render the detail as a single full-width `<td colspan={columnCount}>` cell inside a sibling `<tr>` after the data row. Expanded row IDs tracked via `useReactTable`'s `expanded` state.

Detail panel contents:
- Key Products
- Employees (approx)
- Key People (CEO / CSO / CTO)
- Latest Valuation
- Partnerships
- Strategic Notes
- "View full profile →" link to `/companies/[slug]`

### Filters

All filters are multi-select dropdowns, URL-param driven (shareable links):
- **Sector** — all 11 sectors from the taxonomy
- **Stage** — Pre-seed through Public/Acquired
- **Region** — Netherlands, Benelux, Germany, UK, Nordic, France, USA, Asia, etc.
- **Business Model** — B2B, B2C, Licensing, Platform, Mixed
- **★ Watchlist only** — toggle button

Active filters rendered as dismissible chip pills. "Clear all" resets all filters.

**Region filter:** Uses the existing `hq_region` column in the companies table (e.g. "Netherlands", "Benelux", "Germany", "UK", "Nordic", "France", "USA — East", "USA — West", "Asia"). No derivation needed — filter directly on `hq_region`.

**Watchlist filter:** Uses the existing `on_watchlist` boolean column in the companies table. No additional DB changes needed.

**Shared filter component:** Both `/companies` and `/map` use the same filter dimensions. Extract a shared `<CompanyFilterBar />` client component (`components/company-filter-bar.tsx`) used by both pages.

Props interface:
```ts
interface CompanyFilterBarProps {
  showSearch?: boolean       // default true
  showColorBy?: boolean      // default false — only map uses this
}
```
The component reads and writes URL params directly using `nuqs`. It does not accept filter values as props — it owns the URL state. Both pages read the same param keys so filters round-trip correctly between pages.

**URL param key names (canonical — must match on both pages):**

| Filter | Param key | Type |
|---|---|---|
| Search | `q` | string |
| Sector | `sector` | string[] |
| Stage | `stage` | string[] |
| Region | `region` | string[] |
| Business Model | `model` | string[] |
| Watchlist only | `watchlist` | boolean |

### Behaviour

- All filtering is client-side after initial data load (fast, no extra requests)
- **No pagination** — all matching rows rendered in one scrollable table. No "load more" button. If the dataset grows beyond ~500 companies, revisit with virtual scrolling.
- Real-time search across company name and tech platform field
- Sort state and filters persist in URL query params

---

## 3. `/map` — Geographic View

### Layout

Full-screen Leaflet map (100% viewport height minus sidebar). Three floating UI panels overlay the map:

1. **Top-left:** Filter bar (search + Sector / Stage / Region dropdowns + "Color by" dropdown)
2. **Top-right:** Map layer switcher
3. **Bottom-left:** Dynamic legend (updates when "Color by" changes)
4. **Bottom-right:** Stats badge — total companies currently shown (after filters applied) + count of distinct `hq_country` values among those companies. Both computed from the filtered array, not the viewport.

### Map Library

**Leaflet** via `react-leaflet`. Replaces the existing `react-simple-maps` (SVG-based, no real zoom/pan).

Install: `npm install leaflet react-leaflet @types/leaflet`

**Critical — SSR:** Leaflet accesses `window` at import time and crashes Next.js server rendering. `map-view.tsx` must be loaded in `app/map/page.tsx` using:
```ts
const MapView = dynamic(() => import('@/components/map-view'), { ssr: false })
```
The `'use client'` directive alone is not sufficient.

**Required CSS import** in `map-view.tsx`:
```ts
import 'leaflet/dist/leaflet.css'
```

**Marker icon fix** — Leaflet's default marker icons break with webpack bundling. Use `leaflet.Icon.Default.mergeOptions` with explicit icon URLs, or use custom `DivIcon` for the circular dot pins (preferred, since we use custom colored dots anyway).

### Tile Layers (all free)

| Name | Provider | Notes |
|---|---|---|
| Street (default) | OpenStreetMap | No API key |
| Satellite | Esri World Imagery | No API key |
| Terrain | OpenTopoMap | No API key (replaces Stadia Stamen — those endpoints require registration) |
| Dark | CartoDB Dark Matter | No API key |

Selected layer persists in `localStorage`.

### Company Pins

- Each company rendered as a colored circular dot (12px, white border, drop shadow)
- Color determined by the active "Color by" selection
- **"Color by" options:** Sector · Stage · Business Model · Region
- Legend updates live to match current selection and color mapping
- **"Color by" state** persists in React component state only (not URL params, not localStorage). It is a display preference, not a data filter.

### Popup Card (on pin click)

Implemented using Leaflet's built-in `Popup` component. Default auto-pan behaviour (map shifts to keep popup visible) is acceptable. Floating card anchored to pin position:
- Company name (bold)
- Sector badge(s) + Stage badge
- HQ city + country
- Total funding + founded year
- Tech platform
- Strategic notes (italic, truncated to 2 lines)
- "View full profile →" link to `/companies/[slug]`
- Close (✕) button

One popup open at a time. Implement by tracking the selected company in React state (`useState<Company | null>`). Render a single `<Popup>` positioned at the selected company's `lat`/`lng`. Clicking a pin sets the selected company; clicking ✕ or another pin replaces it.

### Hover

Tooltip on hover shows company name only (lightweight).

### Map defaults

- Initial center: Netherlands (52.37°N, 4.89°E)
- Initial zoom: 5 (shows most of Europe)
- Min zoom: 2 (world view) · Max zoom: 15

### Filters

Same filter options as the table page (sector, stage, region), applied as pin visibility (hidden pins are removed from map, not greyed out). Filters are URL-param driven.

---

## 4. Database Changes

Add two columns to the `companies` table in Supabase:

```sql
ALTER TABLE companies ADD COLUMN lat double precision;
ALTER TABLE companies ADD COLUMN lng double precision;
```

- Coordinates stored as decimal degrees
- Populated via a one-time geocoding script (city + country → lat/lng using a free geocoding API or manual entry for NL/EU companies)
- Companies without coordinates are excluded from the map (not shown as pins)
- `database.types.ts` updated to include `lat` and `lng` fields

---

## 5. File Changes

### New files
- `app/map/page.tsx` — Server component. Calls `getCompanies({ hasCoordinates: true })` to fetch only companies with lat/lng. Passes result to `<MapView companies={companies} />`. Loads `MapView` via `dynamic(() => import('@/components/map-view'), { ssr: false })`. Fields used by the popup: `slug`, `name`, `sectors`, `stage`, `hq_city`, `hq_country`, `total_funding_usd`, `founded_year`, `technology_platform`, `notes`, `lat`, `lng`.
- `components/map-view.tsx` — Client component wrapping react-leaflet (`'use client'` + `import 'leaflet/dist/leaflet.css'`)
- `components/company-filter-bar.tsx` — Shared filter bar used by both `/companies` and `/map`
- `components/map-popup.tsx` — Popup card component

### Modified files
- `app/companies/page.tsx` — Full rewrite with TanStack Table, expandable rows, filter chips
- `components/nav.tsx` — Add Map nav item
- `lib/supabase/database.types.ts` — Add `lat`, `lng` to companies type
- `lib/supabase/queries/companies.ts` — Add lat/lng to select; add `hasCoordinates` filter option for map query
- `lib/mock/seed.ts` — Add lat/lng to mock company data. Use approximate city-center coordinates, e.g. Amsterdam (52.37, 4.89), Delft (52.01, 4.36), Ghent (51.05, 3.72), Munich (48.14, 11.58), London (51.51, -0.13)
- `package.json` — Add `leaflet`, `react-leaflet`, `@types/leaflet`; remove `react-simple-maps`. Note: `@tanstack/react-table` is already installed (v8.21.3) — no change needed.
- `lib/supabase/database.types.ts` — Manually add `lat: number | null` and `lng: number | null` to the `companies` Row type. (Alternatively run `supabase gen types typescript --linked` after the migration to regenerate automatically — preferred if Supabase CLI is configured.)

---

## 6. Out of Scope

- Investor map (future)
- Deal flow map (future)
- Clustering/grouping of overlapping pins (can add later if dataset grows large)
- Custom map tiles requiring paid API keys

---

## Summary of Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Table vs map location | Separate pages | Map deserves its own full-screen experience |
| Table density | All 9 columns visible | BI platform — data should be visible, not hidden |
| Row detail | Expandable inline | Best balance of density and depth |
| Pagination | None — scrollable | User wants to see all companies at once |
| Map library | Leaflet | Real zoom/pan/tiles vs SVG static map |
| Map interaction | Floating popup on click | Stays on map, compact but informative |
| Pin coloring | Colored dots + "Color by" dropdown | Flexible — sector, stage, region all useful |
| Map layers | Street / Satellite / Terrain / Dark | User requested; all free tile providers |
