import { NextRequest, NextResponse } from "next/server"

// In development only: if a request carries x-dev-session, inject it as the
// NextAuth session cookie so server components and API routes see it normally.
export function middleware(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") return NextResponse.next()

  const devToken = req.headers.get("x-dev-session")
  if (!devToken) return NextResponse.next()

  const cookieName = "next-auth.session-token"
  const existingCookies = req.headers.get("cookie") ?? ""

  // Replace any existing session cookie with the dev token
  const filtered = existingCookies
    .split(";")
    .map((c) => c.trim())
    .filter((c) => !c.startsWith(cookieName + "="))

  filtered.push(`${cookieName}=${devToken}`)

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set("cookie", filtered.join("; "))

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
