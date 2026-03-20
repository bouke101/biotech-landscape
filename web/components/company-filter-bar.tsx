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
    setQ(null)
    setSectors([])
    setStages([])
    setRegions([])
    setModels([])
    setWatchlist(null)
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
