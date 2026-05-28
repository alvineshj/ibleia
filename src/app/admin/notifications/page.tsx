import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/utils"
import { BroadcastForm } from "@/components/admin/broadcast-form"

export default async function NotificationsPage() {
  const edition = await prisma.edition.findFirst({ where: { status: "ACTIVE" } })

  const notifications = await prisma.notification.findMany({
    include: { recipient: { select: { name: true, email: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  const stats = {
    total: notifications.length,
    sent: notifications.filter((n) => n.status === "SENT").length,
    failed: notifications.filter((n) => n.status === "FAILED").length,
    pending: notifications.filter((n) => n.status === "PENDING").length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-muted-foreground">Send broadcasts and view notification logs</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Total Sent</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold text-green-600">{stats.sent}</p><p className="text-sm text-muted-foreground">Delivered</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold text-red-600">{stats.failed}</p><p className="text-sm text-muted-foreground">Failed</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold text-orange-600">{stats.pending}</p><p className="text-sm text-muted-foreground">Pending</p></CardContent></Card>
      </div>

      <BroadcastForm editionId={edition?.id} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No notifications sent yet.</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="flex items-start justify-between gap-3 p-3 border rounded-lg text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{n.recipient.name}</span>
                      <span className="text-muted-foreground text-xs">{n.recipient.email}</span>
                    </div>
                    <p className="font-medium text-xs truncate">{n.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(n.createdAt)}</p>
                  </div>
                  <Badge
                    variant={n.status === "SENT" ? "success" : n.status === "FAILED" ? "destructive" : "secondary"}
                    className="shrink-0"
                  >
                    {n.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
