"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Send } from "lucide-react"

export function BroadcastForm({ editionId }: { editionId?: string }) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")

  async function handleBroadcast() {
    if (!subject || !body) return
    setIsLoading(true)
    try {
      const res = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, editionId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" })
        return
      }
      toast({ title: `Broadcast sent to ${data.count} recipients` })
      setSubject("")
      setBody("")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Send Broadcast Message</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label>Subject</Label>
            <Input
              className="mt-1"
              placeholder="Message subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea
              className="mt-1 min-h-[120px]"
              placeholder="Your message to all participants..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Will be sent to all active participants in the current edition
            </p>
            <Button variant="ibl" onClick={handleBroadcast} disabled={isLoading || !subject || !body}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send Broadcast
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
