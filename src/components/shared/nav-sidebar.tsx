"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Lightbulb,
  FileText,
  Calendar,
  Users,
  Star,
  Settings,
  LogOut,
  Trophy,
  BookOpen,
  Bell,
  BarChart3,
  ClipboardList,
  Megaphone,
  Zap,
} from "lucide-react"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const participantNav: NavItem[] = [
  { href: "/participant/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/participant/ideas", label: "My Ideas", icon: Lightbulb },
]

const juryNav: NavItem[] = [
  { href: "/jury/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jury/scoring", label: "Score Ideas", icon: Star },
]

const adminNav: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/admin/slots", label: "Slot Booking", icon: Calendar },
  { href: "/admin/workshops", label: "Workshops", icon: BookOpen },
  { href: "/admin/rounds", label: "Rounds", icon: Trophy },
  { href: "/admin/scoring", label: "Leaderboard", icon: BarChart3 },
  { href: "/admin/reports", label: "Reports", icon: FileText },
  { href: "/admin/survey-triggers", label: "Survey Triggers", icon: Zap },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

const commsNav: NavItem[] = [
  { href: "/comms/showcase", label: "Idea Showcase", icon: Megaphone },
]

export function NavSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const role = session?.user?.role
  const navItems =
    role === "ADMIN"
      ? adminNav
      : role === "JURY"
      ? juryNav
      : role === "COMMS"
      ? commsNav
      : participantNav

  return (
    <div className="flex flex-col h-full bg-ibl-blue text-white w-64 shrink-0">
      <div className="p-6 border-b border-blue-700">
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-ibl-gold" />
          <div>
            <p className="font-bold text-sm leading-tight">IBL Excellence</p>
            <p className="text-xs text-blue-300">& Innovation Award</p>
          </div>
        </div>
      </div>

      {session && (
        <div className="px-4 py-3 border-b border-blue-700">
          <p className="text-sm font-medium truncate">{session.user.name}</p>
          <p className="text-xs text-blue-300 capitalize">{role?.toLowerCase()}</p>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-ibl-gold text-white font-medium"
                      : "text-blue-100 hover:bg-blue-700"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-blue-700">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-blue-200 hover:text-white hover:bg-blue-700 justify-start"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
