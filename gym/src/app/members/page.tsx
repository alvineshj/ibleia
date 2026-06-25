'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, UserCheck, UserX } from 'lucide-react'
import Link from 'next/link'
import { BELT_COLORS, formatBelt } from '@/lib/utils'

type Member = {
  id: string; firstName: string; lastName: string; email: string; phone?: string
  belt: string; stripes: number; active: boolean; joinDate: string
  _count: { attendances: number; payments: number }
}

function StripeDots({ count }: { count: number }) {
  return (
    <span className="flex gap-0.5 ml-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <span key={i} className={`inline-block w-2 h-2 rounded-full border ${i < count ? 'bg-current' : 'bg-transparent'}`} />
      ))}
    </span>
  )
}

function AddMemberDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', belt: 'WHITE', stripes: 0 })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, stripes: Number(form.stripes) }) })
    setLoading(false)
    setOpen(false)
    setForm({ firstName: '', lastName: '', email: '', phone: '', belt: 'WHITE', stripes: 0 })
    onAdded()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" /> Add Member</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New Member</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>First Name</Label>
              <Input required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Last Name</Label>
              <Input required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Belt</Label>
              <Select value={form.belt} onValueChange={v => setForm(f => ({ ...f, belt: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['WHITE','BLUE','PURPLE','BROWN','BLACK'].map(b => (
                    <SelectItem key={b} value={b}>{formatBelt(b)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Stripes (0–4)</Label>
              <Input type="number" min={0} max={4} value={form.stripes} onChange={e => setForm(f => ({ ...f, stripes: Number(e.target.value) }))} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Adding…' : 'Add Member'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active')

  async function load() {
    const res = await fetch('/api/members')
    setMembers(await res.json())
  }

  useEffect(() => { load() }, [])

  const filtered = members.filter(m => {
    const matchSearch = `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || (filter === 'active' ? m.active : !m.active)
    return matchSearch && matchFilter
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Members</h2>
          <p className="text-muted-foreground">{members.filter(m => m.active).length} active members</p>
        </div>
        <AddMemberDialog onAdded={load} />
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search members…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {(['all','active','inactive'] as const).map(f => (
            <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)} className="capitalize">{f}</Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-medium">Name</th>
                <th className="text-left p-4 font-medium">Belt</th>
                <th className="text-left p-4 font-medium">Email</th>
                <th className="text-left p-4 font-medium">Attendance</th>
                <th className="text-left p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">No members found</td></tr>
              )}
              {filtered.map(m => (
                <tr key={m.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <Link href={`/members/${m.id}`} className="font-medium hover:underline">
                      {m.firstName} {m.lastName}
                    </Link>
                    {m.phone && <div className="text-xs text-muted-foreground">{m.phone}</div>}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${BELT_COLORS[m.belt]}`}>
                      {formatBelt(m.belt)}
                      <StripeDots count={m.stripes} />
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground">{m.email}</td>
                  <td className="p-4">{m._count.attendances} classes</td>
                  <td className="p-4">
                    {m.active
                      ? <span className="flex items-center gap-1 text-green-600"><UserCheck className="h-3.5 w-3.5" /> Active</span>
                      : <span className="flex items-center gap-1 text-muted-foreground"><UserX className="h-3.5 w-3.5" /> Inactive</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
