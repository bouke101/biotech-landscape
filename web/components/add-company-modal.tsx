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
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-company-modal-title"
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 id="add-company-modal-title" className="text-lg font-bold text-[#0A0F1E]">Add Company</h2>
            <p className="text-sm text-slate-500 mt-0.5">New entry will appear in the table immediately</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none mt-0.5"
            aria-label="Close"
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
  return <label className="text-xs font-medium text-slate-600 mb-1.5 block">{children}</label>
}

function Required() {
  return <span aria-hidden="true" className="text-red-500 ml-0.5">*</span>
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
