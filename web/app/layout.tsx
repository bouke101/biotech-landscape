import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Nav } from '@/components/nav'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'Biotech BI — aiBio Labs',
  description: 'Biotech landscape intelligence platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="antialiased bg-[#f4f5f7] font-sans">
        <Nav />
        <main className="ml-56 min-h-screen p-8">
          {children}
        </main>
      </body>
    </html>
  )
}
