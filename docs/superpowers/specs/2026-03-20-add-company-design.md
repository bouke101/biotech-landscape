# Design: Add Company Modal

**Date:** 2026-03-20
**Status:** Approved
**Scope:** Add a "+ Add Company" button and modal form to the `/companies` page

---

## Overview

Allow the user to manually add a new company directly from the `/companies` table page via a popup modal. The new company appears in the table immediately (optimistic update) without a full page reload.

---

## 1. Trigger

An "+ Add Company" button sits in the top-right area of the companies page, visually grouped with the filter bar. It opens the modal on click.

The button is hidden when mock mode is on. Mock mode is active when `process.env.NEXT_PUBLIC_USE_MOCK_DATA !== 'false'` (consistent with how the existing query files detect mock mode). Inserting a real record requires a live Supabase connection.

---

## 2. Modal Form

A centered overlay modal with sticky header and footer. The table is dimmed behind it. Scrollable body for the full field set. Built with custom Tailwind components consistent with the existing codebase (no shadcn/ui Dialog — use a plain `<div>` overlay pattern as seen in `map-view.tsx` popups).

### Sections and fields

**Identity**
| Field | Type | Required |
|---|---|---|
| Company name | text | ✓ |
| Website | text | — |
| Founded year | number | — |

**Classification**
| Field | Type | Required |
|---|---|---|
| Sector(s) | multi-select (12 sectors from taxonomy — same list as `CompanyFilterBar`) | ✓ |
| Stage | dropdown (Stealth → Acquired) | — |
| Business model | dropdown (B2B / B2C / Licensing / Platform / Mixed) | — |
| Tech platform | text | — |
| Key products | text | — |

**Location**
| Field | Type | Required |
|---|---|---|
| HQ City | text | — |
| HQ Country | text | — |
| HQ Region | dropdown (Netherlands / Benelux / Germany / UK / Nordic / France / Rest of Europe / USA — West / USA — East / Asia) | — |

**Financials & Team**
| Field | Type | Required |
|---|---|---|
| Total funding (USD) | number | — |
| Latest valuation (USD) | number | — |
| Employees (approx) | number | — |
| CEO | text | — |
| CSO | text | — |
| CTO | text | — |
| Partnerships | text | — |
| Add to watchlist | checkbox | — |
| Strategic notes | textarea | — |

### Fields excluded from this form

- `slug` — auto-generated from name (see below)
- `lat` / `lng` — left null; set later via geocoding or company profile page
- `id`, `created_at`, `updated_at` — set by the database

### Funding rounds

Detailed per-round investor data (who funded, how much, when) is **out of scope** for this form. It is handled separately on the company profile page (`/companies/[slug]`).

---

## 3. Slug Generation

Slug is derived from the company name client-side before submission using this algorithm (no external library):

```ts
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // replace any non-alphanumeric run with a hyphen
    .replace(/^-+|-+$/g, '')       // strip leading/trailing hyphens
}
```

Example: `"PlantKind Fermentation B.V."` → `"plantkind-fermentation-bv"`

If the generated slug already exists in the database, the Supabase unique constraint throws an error. The Server Action catches it and returns `{ success: false, error: 'A company with this name already exists.' }`. The modal stays open.

---

## 4. Optimistic Update

The companies page uses React's `useOptimistic` to add the new company row to the table instantly on form submit, before the server responds.

State ownership:
- `<CompaniesClient>` owns: `useOptimistic` companies list, modal open/close boolean, error string
- `<AddCompanyModal>` receives: `open`, `onClose`, `error` as props; calls the server action and passes the result back via an `onSubmit` callback prop

Flow:
1. User clicks Save in the modal
2. Modal calls `onSubmit(formData)`
3. `<CompaniesClient>` applies the optimistic update (appends new company to list) and fires the Server Action
4. **On success:** closes modal, clears error, calls `router.refresh()` to sync real server data
5. **On failure:** reverts optimistic entry, sets error string, modal stays open showing the error at the top

The optimistic entry is visually identical to a real row. No loading spinner needed — the table just has the new row instantly.

---

## 5. Server Action

`app/actions/companies.ts` exports `createCompany(formData: FormData)`:
- Validates required fields (name, sectors)
- Generates slug
- Checks slug uniqueness (Supabase unique constraint will catch duplicates)
- Inserts into `companies` table via Supabase client
- Returns `{ success: true, company }` or `{ success: false, error: string }`

---

## 6. File Changes

### New files
| File | Responsibility |
|---|---|
| `components/add-company-modal.tsx` | Client component: modal form, controlled inputs, calls server action, closes on success |
| `app/actions/companies.ts` | Server Action: validate, generate slug, insert into Supabase |

### Modified files
| File | Change |
|---|---|
| `app/companies/page.tsx` | Remains a server component. Passes fetched companies to `<CompaniesClient>` instead of directly to `<CompaniesTable>`. Hides the add button in mock mode via env check. |
| `components/companies-client.tsx` | **New client wrapper** (`'use client'`). Owns `useOptimistic` state, renders `<AddCompanyModal>` and `<CompaniesTable>`, wires up the optimistic insert and `router.refresh()` on success. |
| `components/companies-table.tsx` | Accept `companies` prop as-is (no change needed — optimistic company conforms to `Company` type) |
| `lib/supabase/queries/companies.ts` | Add `createCompany(data)` function used by the Server Action |

---

## 7. Out of Scope

- Editing existing companies (future)
- Deleting companies (future)
- Per-round funding detail in this form (handled on company profile page)
- Duplicate detection beyond slug uniqueness
- Image/logo upload
