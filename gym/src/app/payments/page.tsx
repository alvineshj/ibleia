'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'

type Payment = {
  id: string; amount: number; type: string; status: string
  paidAt?: string; description?: string
  member: { id: string; firstName: string; lastName: string }
}
type Member = { id: string; firstName: string; lastName: string }

const PAYMENT_TYPES = ['MONTHLY','ANNUAL','DROP_IN','GRADING_FEE','OTHER']
const STATUS_COLORS: Record<string, string> = {
  PAID: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
}

function AddPaymentDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [form, setForm] = useState({
    memberId: '', amount: '', type: 'MONTHLY', status: 'PAID',
    paidAt: new Date().toISOString().split('T')[0], description: '',
  })

  useEffect(() => {
    if (open) fetch('/api/members').then(r => r.json()).then(setMembers)
  }, [open])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/payments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    })
    setLoading(false); setOpen(false)
    setForm({ memberId: '', amount: '', type: 'MONTHLY', status: 'PAID', paidAt: new Date().toISOString().split('T')[0], description: '' })
    onAdded()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" /> Record Payment</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1">
            <Label>Member</Label>
            <Select value={form.memberId} onValueChange={v => setForm(f => ({ ...f, memberId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select member…" /></SelectTrigger>
              <SelectContent>
                {members.map(m => <SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Amount (USD)</Label>
              <Input type="number" required min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['PAID','PENDING','OVERDUE','CANCELLED'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <input type="date" value={form.paidAt} onChange={e => setForm(f => ({ ...f, paidAt: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Description (optional)</Label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. June membership" />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !form.memberId || !form.amount}>
            {loading ? 'Saving…' : 'Record Payment'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])

  async function load() {
    const res = await fetch('/api/payments')
    setPayments(await res.json())
  }

  useEffect(() => { load() }, [])

  const totalPaid = payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0)
  const pending = payments.filter(p => p.status === 'PENDING' || p.status === 'OVERDUE').reduce((s, p) => s + p.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Payments</h2>
          <p className="text-muted-foreground">{payments.length} records</p>
        </div>
        <AddPaymentDialog onAdded={load} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-yellow-600">{formatCurrency(pending)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-medium">Date</th>
                <th className="text-left p-4 font-medium">Member</th>
                <th className="text-left p-4 font-medium">Type</th>
                <th className="text-left p-4 font-medium">Amount</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 && (
                <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">No payments recorded yet</td></tr>
              )}
              {payments.map(p => (
                <tr key={p.id} className="border-b hover:bg-muted/30">
                  <td className="p-4">{p.paidAt ? format(new Date(p.paidAt), 'PP') : '—'}</td>
                  <td className="p-4 font-medium">{p.member.firstName} {p.member.lastName}</td>
                  <td className="p-4 capitalize text-muted-foreground">{p.type.replace('_', ' ').toLowerCase()}</td>
                  <td className="p-4 font-medium">{formatCurrency(p.amount)}</td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                  </td>
                  <td className="p-4 text-muted-foreground">{p.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
