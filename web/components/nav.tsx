'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/',            label: 'Dashboard',  icon: '▦' },
  { href: '/companies',   label: 'Companies',  icon: '⬡' },
  { href: '/investors',   label: 'Investors',  icon: '◈' },
  { href: '/deals',       label: 'Deal Flow',  icon: '◎' },
  { href: '/trends',      label: 'Trends',     icon: '⟋' },
]

export function Nav() {
  const path = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-[#0A0F1E] flex flex-col z-50">
      <div className="px-5 py-6 border-b border-white/10">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-1">aiBio Labs</p>
        <p className="text-white font-bold text-lg leading-tight">Biotech BI</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ href, label, icon }) => {
          const active = href === '/' ? path === '/' : path.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#0047CC] text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-white/30 text-xs">Bouke de Jong, PhD</p>
      </div>
    </aside>
  )
}
