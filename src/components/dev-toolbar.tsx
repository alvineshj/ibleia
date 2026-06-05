"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

const TOKEN_KEY = "ibl_dev_token"
const ROLE_KEY = "ibl_dev_role"
const NAME_KEY = "ibl_dev_name"

const ACCOUNTS = [
  { label: "Admin", email: "admin@iblgroup.com" },
  { label: "Jury", email: "jury@iblgroup.com" },
  { label: "Participant", email: "participant@iblgroup.com" },
  { label: "Comms", email: "comms@iblgroup.com" },
]

const ROLE_COLORS: Record<string, string> = {
  Admin: "#ef4444",
  Jury: "#8b5cf6",
  Participant: "#3b82f6",
  Comms: "#10b981",
}

export default function DevToolbar() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [name, setName] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  // Patch window.fetch once on mount to inject x-dev-session header
  useEffect(() => {
    const stored = sessionStorage.getItem(ROLE_KEY)
    const storedName = sessionStorage.getItem(NAME_KEY)
    if (stored) setRole(stored)
    if (storedName) setName(storedName)

    const original = window.fetch.bind(window)
    window.fetch = function (input, init) {
      const token = sessionStorage.getItem(TOKEN_KEY)
      if (token) {
        const headers = new Headers((init as RequestInit | undefined)?.headers)
        headers.set("x-dev-session", token)
        init = { ...(init as RequestInit), headers }
      }
      return original(input, init)
    }
    return () => {
      window.fetch = original
    }
  }, [])

  const loginAs = useCallback(
    async (email: string, label: string) => {
      setLoading(label)
      try {
        // Call without the interceptor to avoid sending stale token
        const res = await fetch("/api/dev/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)

        sessionStorage.setItem(TOKEN_KEY, data.token)
        sessionStorage.setItem(ROLE_KEY, label)
        sessionStorage.setItem(NAME_KEY, data.name)
        setRole(label)
        setName(data.name)
        setOpen(false)
        router.refresh()
      } catch (err) {
        console.error("[DevToolbar] login failed:", err)
      } finally {
        setLoading(null)
      }
    },
    [router]
  )

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(ROLE_KEY)
    sessionStorage.removeItem(NAME_KEY)
    setRole(null)
    setName(null)
    setOpen(false)
    router.refresh()
  }, [router])

  const accent = role ? ROLE_COLORS[role] ?? "#6b7280" : "#6b7280"

  return (
    <div
      style={{
        position: "fixed",
        bottom: 12,
        right: 12,
        zIndex: 9999,
        fontFamily: "monospace",
        fontSize: 11,
      }}
    >
      {open && (
        <div
          style={{
            marginBottom: 6,
            background: "rgba(15,15,15,0.95)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            minWidth: 200,
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          }}
        >
          <p style={{ color: "rgba(255,255,255,0.45)", margin: 0, fontSize: 10, letterSpacing: 1 }}>
            SWITCH TAB SESSION
          </p>
          {ACCOUNTS.map((a) => (
            <button
              key={a.label}
              onClick={() => loginAs(a.email, a.label)}
              disabled={loading === a.label}
              style={{
                background:
                  role === a.label
                    ? ROLE_COLORS[a.label]
                    : "rgba(255,255,255,0.08)",
                color: "white",
                border: "none",
                borderRadius: 5,
                padding: "5px 10px",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "monospace",
                fontSize: 12,
                fontWeight: role === a.label ? 700 : 400,
                opacity: loading && loading !== a.label ? 0.4 : 1,
              }}
            >
              {loading === a.label ? "…" : a.label}
              <span style={{ opacity: 0.5, marginLeft: 6, fontSize: 10 }}>{a.email}</span>
            </button>
          ))}
          {role && (
            <button
              onClick={clearSession}
              style={{
                background: "transparent",
                color: "rgba(255,255,255,0.4)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 5,
                padding: "4px 10px",
                cursor: "pointer",
                fontFamily: "monospace",
                fontSize: 11,
                marginTop: 2,
              }}
            >
              Clear session
            </button>
          )}
        </div>
      )}

      {/* Pill button */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "rgba(15,15,15,0.92)",
          border: `1px solid ${accent}`,
          borderRadius: 20,
          padding: "5px 12px",
          color: "white",
          cursor: "pointer",
          fontFamily: "monospace",
          fontSize: 11,
          display: "flex",
          alignItems: "center",
          gap: 6,
          boxShadow: `0 0 0 1px ${accent}22`,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: accent,
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        {role ? `${role} — ${name ?? ""}` : "DEV · no session"}
      </button>
    </div>
  )
}
