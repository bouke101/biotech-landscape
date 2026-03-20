'use client'

import dynamic from 'next/dynamic'
import type { Company } from '@/lib/supabase/database.types'

const MapView = dynamic(
  () => import('@/components/map-view').then(m => m.MapView),
  { ssr: false, loading: () => <div className="flex-1 bg-slate-100 animate-pulse" /> }
)

export function MapPageClient({ companies }: { companies: Company[] }) {
  return <MapView companies={companies} />
}
