'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BELT_COLORS, formatBelt, formatCurrency } from '@/lib/utils'
import { ArrowLeft, Award, DollarSign, Calendar } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

type MemberDetail = {
  id: string; firstName: string; lastName: string; email: string; phone?: string
  belt: string; stripes: number; active: boolean; joinDate: string; notes?: string
  attendances: Array<{ id: string; date: string; class: { name: string } }>
  payments: Array<{ id: string; amount: number; type: string; status: string; paidAt?: string; description?: string }>
  promotions: Array<{ id: string; fromBelt: string; toBelt: string; date: string; notes?: string }>
}

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [member, setMember] = useState<MemberDetail | null>(null)
  const [tab, setTab] = useState<'attendance' | 'payments' | 'promotions'>('attendance')

  useEffect(() => {
    fetch(`/api/members/${id}`).then(r => r.json()).then(setMember)
  }, [id])

  if (!member) return <div className="text-muted-foreground">Loading…</div>

  async function toggleActive() {
    await fetch(`/api/members/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !member!.active }),
    })
    setMember(m => m ? { ...m, active: !m.active } : m)
  }

  const tabs = ['attendance', 'payments', 'promotions'] as const

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link href="/members"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h2 className="text-3xl font-bold">{member.firstName} {member.lastName}</h2>
          <p className="text-muted-foreground">{member.email}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={toggleActive}>
            {member.active ? 'Deactivate' : 'Reactivate'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Current Belt</div>
            <div className={`mt-2 inline-flex items-center px-3 py-1 rounded-full border text-sm font-semibold ${BELT_COLORS[member.belt]}`}>
              {formatBelt(member.belt)} · {member.stripes} stripe{member.stripes !== 1 ? 's' : ''}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Member Since</div>
            <div className="mt-2 font-semibold">{format(new Date(member.joinDate), 'PPP')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Classes</div>
            <div className="mt-2 font-semibold text-2xl">{member.attendances.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'attendance' && (
        <Card>
          <CardContent className="p-0">
            {member.attendances.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">No attendance records yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50"><th className="text-left p-4">Date</th><th className="text-left p-4">Class</th></tr></thead>
                <tbody>
                  {member.attendances.map(a => (
                    <tr key={a.id} className="border-b">
                      <td className="p-4">{format(new Date(a.date), 'PPP')}</td>
                      <td className="p-4">{a.class.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'payments' && (
        <Card>
          <CardContent className="p-0">
            {member.payments.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">No payment records yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">
                  <th className="text-left p-4">Date</th><th className="text-left p-4">Type</th>
                  <th className="text-left p-4">Amount</th><th className="text-left p-4">Status</th>
                </tr></thead>
                <tbody>
                  {member.payments.map(p => (
                    <tr key={p.id} className="border-b">
                      <td className="p-4">{p.paidAt ? format(new Date(p.paidAt), 'PP') : '—'}</td>
                      <td className="p-4 capitalize">{p.type.replace('_', ' ').toLowerCase()}</td>
                      <td className="p-4 font-medium">{formatCurrency(p.amount)}</td>
                      <td className="p-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 'PAID' ? 'bg-green-100 text-green-700' : p.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'promotions' && (
        <div className="space-y-3">
          {member.promotions.length === 0 ? (
            <Card><CardContent className="text-center p-8 text-muted-foreground">No promotions recorded yet</CardContent></Card>
          ) : (
            member.promotions.map(p => (
              <Card key={p.id}>
                <CardContent className="flex items-center gap-4 pt-4">
                  <span className={`px-3 py-1 rounded-full border text-sm ${BELT_COLORS[p.fromBelt]}`}>{formatBelt(p.fromBelt)}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className={`px-3 py-1 rounded-full border text-sm font-semibold ${BELT_COLORS[p.toBelt]}`}>{formatBelt(p.toBelt)}</span>
                  <span className="ml-auto text-sm text-muted-foreground">{format(new Date(p.date), 'PPP')}</span>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
