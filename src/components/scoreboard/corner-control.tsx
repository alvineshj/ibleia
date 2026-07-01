"use client"

import { useRef } from "react"
import { Trash2, Upload } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getCountries } from "@/lib/countries"
import { CORNER_COLORS, CornerColorId, CornerState, clampNonNegative } from "./types"

const countries = getCountries()
const POINT_VALUES = [2, 3, 4]

interface CornerControlProps {
  corner: CornerState
  onChange: (next: CornerState) => void
}

export function CornerControl({ corner, onChange }: CornerControlProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const colorDef = CORNER_COLORS[corner.color]

  function patch(partial: Partial<CornerState>) {
    onChange({ ...corner, ...partial })
  }

  function handleLogoFile(file: File | undefined) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => patch({ logo: reader.result as string })
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-muted flex items-center justify-center">
          {corner.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={corner.logo} alt="Club logo" className="h-full w-full object-contain" />
          ) : (
            <Upload className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleLogoFile(e.target.files?.[0])}
          />
          <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
            Upload club logo
          </Button>
          {corner.logo && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => patch({ logo: null })}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Competitor name</label>
        <Input value={corner.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Competitor name" />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Team / club</label>
        <Input value={corner.team} onChange={(e) => patch({ team: e.target.value })} placeholder="Team or academy" />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Country</label>
        <Select
          value={corner.countryCode || "none"}
          onValueChange={(value) => patch({ countryCode: value === "none" ? "" : value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="none">No country</SelectItem>
            {countries.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.flag} {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Corner colour</label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CORNER_COLORS) as CornerColorId[]).map((id) => (
            <button
              key={id}
              type="button"
              title={CORNER_COLORS[id].label}
              onClick={() => patch({ color: id })}
              className={`h-7 w-7 rounded-full ${CORNER_COLORS[id].swatch} ${
                corner.color === id ? "ring-2 ring-offset-2 ring-ibl-blue" : ""
              }`}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Advantages</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => patch({ advantages: clampNonNegative(corner.advantages - 1) })}
            >
              -1
            </Button>
            <span className="w-6 text-center font-semibold">{corner.advantages}</span>
            <Button type="button" size="sm" variant="outline" onClick={() => patch({ advantages: corner.advantages + 1 })}>
              +1
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Penalties</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => patch({ penalties: clampNonNegative(corner.penalties - 1) })}
            >
              -1
            </Button>
            <span className="w-6 text-center font-semibold">{corner.penalties}</span>
            <Button type="button" size="sm" variant="outline" onClick={() => patch({ penalties: corner.penalties + 1 })}>
              +1
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-1.5 pt-1">
        <p className="text-xs font-medium text-muted-foreground">Points</p>
        <div className="flex flex-wrap items-center gap-2">
          {POINT_VALUES.map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              className={`${colorDef.panel} ${colorDef.text} hover:opacity-90`}
              onClick={() => patch({ points: corner.points + value })}
            >
              +{value}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => patch({ points: clampNonNegative(corner.points - 1) })}
          >
            -1 (correct)
          </Button>
        </div>
      </div>
    </div>
  )
}
