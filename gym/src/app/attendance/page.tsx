'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { format } from 'date-fns'

type AttRecord = {
  id: string; date: string
  member: { id: string; firstName: string; lastName: string; belt: string }
  class: { id: string; name: string }
}
type Member = { id: string; firstName: string; lastName: string }
type Class = { id: string; name: string; dayOfWeek: string; startTime: string }

function LogAttendanceDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [form, setForm] = useState({ memberId: '', classId: '', date: new Date().toISOString().split('T')[0] })

  useEffect(() => {
    if (open) {
      fetch('/api/members').then(r => r.json()).then(setMembers)
      fetch('/api/classes').then(r => r.json()).then(setClasses)
    }
  }, [open])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/attendance', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false); setOpen(false)
    setForm({ memberId: '', classId: '', date: new Date().toISOString().split('T')[0] })
    onAdded()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" /> Log Attendance</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Log Attendance</DialogTitle></DialogHeader>
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
          <div className="space-y-1">
            <Label>Class</Label>
            <Select value={form.classId} onValueChange={v => setForm(f => ({ ...f, classId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select class…" /></SelectTrigger>
              <SelectContent>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Date</Label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !form.memberId || !form.classId}>
            {loading ? 'Saving…' : 'Log Attendance'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttRecord[]>([])

  async function load() {
    const res = await fetch('/api/attendance')
    setRecords(await res.json())
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Attendance</h2>
          <p className="text-muted-foreground">{records.length} records</p>
        </div>
        <LogAttendanceDialog onAdded={load} />
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-medium">Date</th>
                <th className="text-left p-4 font-medium">Member</th>
                <th className="text-left p-4 font-medium">Class</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 && (
                <tr><td colSpan={3} className="text-center p-8 text-muted-foreground">No attendance records yet</td></tr>
              )}
              {records.map(r => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="p-4">{format(new Date(r.date), 'PP')}</td>
                  <td className="p-4 font-medium">{r.member.firstName} {r.member.lastName}</td>
                  <td className="p-4 text-muted-foreground">{r.class.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
