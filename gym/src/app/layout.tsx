import type { Metadata } from 'next'
import './globals.css'
import { Nav } from '@/components/nav'

export const metadata: Metadata = {
  title: 'BJJ Gym Manager',
  description: 'Brazilian Jiu-Jitsu Gym Management Platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="flex">
          <Nav />
          <main className="flex-1 min-h-screen p-8 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
