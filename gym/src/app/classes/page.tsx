'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Clock, User } from 'lucide-react'

const DAYS = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY']

type Class = {
  id: string; name: string; instructor: string; dayOfWeek: string
  startTime: string; durationMin: number; maxStudents?: number; active: boolean
  _count: { attendances: number }
}

function AddClassDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', instructor: '', dayOfWeek: 'MONDAY', startTime: '18:00', durationMin: 60, maxStudents: '' })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/classes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, durationMin: Number(form.durationMin), maxStudents: form.maxStudents ? Number(form.maxStudents) : undefined }),
    })
    setLoading(false); setOpen(false)
    setForm({ name: '', instructor: '', dayOfWeek: 'MONDAY', startTime: '18:00', durationMin: 60, maxStudents: '' })
    onAdded()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" /> Add Class</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New Class</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1">
            <Label>Class Name</Label>
            <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Fundamentals, Advanced No-Gi…" />
          </div>
          <div className="space-y-1">
            <Label>Instructor</Label>
            <Input required value={form.instructor} onChange={e => setForm(f => ({ ...f, instructor: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Day</Label>
              <Select value={form.dayOfWeek} onValueChange={v => setForm(f => ({ ...f, dayOfWeek: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map(d => <SelectItem key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Start Time</Label>
              <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Duration (min)</Label>
              <Input type="number" value={form.durationMin} onChange={e => setForm(f => ({ ...f, durationMin: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label>Max Students</Label>
              <Input type="number" placeholder="Unlimited" value={form.maxStudents} onChange={e => setForm(f => ({ ...f, maxStudents: e.target.value }))} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Adding…' : 'Add Class'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([])

  async function load() {
    const res = await fetch('/api/classes')
    setClasses(await res.json())
  }

  useEffect(() => { load() }, [])

  const byDay = DAYS.reduce((acc, day) => {
    acc[day] = classes.filter(c => c.dayOfWeek === day)
    return acc
  }, {} as Record<string, Class[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Classes</h2>
          <p className="text-muted-foreground">{classes.filter(c => c.active).length} active classes</p>
        </div>
        <AddClassDialog onAdded={load} />
      </div>

      <div className="grid gap-4">
        {DAYS.map(day => byDay[day].length > 0 && (
          <div key={day}>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
              {day.charAt(0) + day.slice(1).toLowerCase()}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {byDay[day].map(cls => (
                <Card key={cls.id}>
                  <CardContent className="pt-4">
                    <div className="font-semibold">{cls.name}</div>
                    <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{cls.instructor}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{cls.startTime} · {cls.durationMin}min</span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {cls._count.attendances} total check-ins
                      {cls.maxStudents && ` · max ${cls.maxStudents}`}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
        {classes.length === 0 && (
          <Card><CardContent className="text-center p-10 text-muted-foreground">No classes yet. Add your first class above.</CardContent></Card>
        )}
      </div>
    </div>
  )
}
