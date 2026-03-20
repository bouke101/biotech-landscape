'use client'

import { useState, useMemo } from 'react'
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
  if (n === null || n === undefined) return '—'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}

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
    <div className="relative flex-1" style={{ minHeight: '500px' }}>
      <MapContainer
        center={[52.37, 4.89] as [number, number]}
        zoom={5}
        minZoom={2}
        maxZoom={15}
        className="h-full w-full absolute inset-0"
      >
        <TileLayerSwapper tileKey={tileKey} />
        {filtered.map(company => {
          if (company.lat === null || company.lng === null) return null
          const color = getPinColor(company, colorBy)
          return (
            <CircleMarker
              key={company.id}
              center={[company.lat, company.lng] as [number, number]}
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

      {/* Overlays — outside MapContainer so they use normal CSS z-index */}
      <TileLayerSwitcher tileKey={tileKey} onChange={handleTileChange} />
      <MapLegend colorBy={colorBy} />

      {/* Color by selector */}
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
  )
}
