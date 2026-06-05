import { NextRequest, NextResponse } from "next/server"
import { encode } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"

// Development-only endpoint — disabled in production
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    secret: process.env.NEXTAUTH_SECRET!,
    maxAge: 60 * 60 * 24, // 24 hours
  })

  return NextResponse.json({ token, role: user.role, name: user.name })
}
