'use client'

import React, { useState, useMemo } from 'react'
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
              <React.Fragment key={row.id}>
                <tr
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
                  <tr className="bg-blue-50/30 border-b-2 border-blue-100">
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
              </React.Fragment>
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
