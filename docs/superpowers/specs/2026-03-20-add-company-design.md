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

The button is hidden when `NEXT_PUBLIC_USE_MOCK_DATA` is active — inserting a real record requires a live Supabase connection.

---

## 2. Modal Form

A centered overlay modal with sticky header and footer. The table is dimmed behind it. Scrollable body for the full field set.

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
| Sector(s) | multi-select (11 sectors from taxonomy) | ✓ |
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

Slug is derived from the company name client-side before submission:
- Lowercase
- Replace spaces and special characters with hyphens
- Strip leading/trailing hyphens
- Example: `"PlantKind Fermentation B.V."` → `"plantkind-fermentation-bv"`

If the generated slug already exists in the database, the Server Action returns a validation error and the modal stays open with an appropriate message.

---

## 4. Optimistic Update

The companies page uses React's `useOptimistic` to add the new company row to the table instantly on form submit, before the server responds.

Flow:
1. User clicks Save
2. `useOptimistic` appends the new company to the displayed list immediately
3. Server Action fires (`createCompany`)
4. **On success:** `router.refresh()` syncs real server data; optimistic entry is replaced
5. **On failure:** optimistic entry disappears; a brief inline error message is shown at the top of the modal (modal stays open so the user can correct and retry)

The optimistic entry is visually identical to a real row. No loading spinner or "saving…" state needed — the table just has the new row instantly.

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
| `app/companies/page.tsx` | Add `useOptimistic` state, render `<AddCompanyModal>`, pass optimistic companies to table; show "+ Add Company" button only when not in mock mode |
| `components/companies-table.tsx` | Accept `companies` prop as-is (no change needed — optimistic company conforms to `Company` type) |
| `lib/supabase/queries/companies.ts` | Add `createCompany(data)` function used by the Server Action |

---

## 7. Out of Scope

- Editing existing companies (future)
- Deleting companies (future)
- Per-round funding detail in this form (handled on company profile page)
- Duplicate detection beyond slug uniqueness
- Image/logo upload
