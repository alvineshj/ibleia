'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Calendar, DollarSign, LayoutDashboard, Award } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/members', label: 'Members', icon: Users },
  { href: '/classes', label: 'Classes', icon: Calendar },
  { href: '/attendance', label: 'Attendance', icon: Award },
  { href: '/payments', label: 'Payments', icon: DollarSign },
]

export function Nav() {
  const pathname = usePathname()
  return (
    <aside className="w-60 shrink-0 border-r bg-card h-screen sticky top-0 flex flex-col">
      <div className="p-6 border-b">
        <h1 className="font-bold text-xl tracking-tight">🥋 BJJ Manager</h1>
        <p className="text-xs text-muted-foreground mt-1">Gym Management Platform</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t text-xs text-muted-foreground">
        BJJ Gym Manager v1.0
      </div>
    </aside>
  )
}
