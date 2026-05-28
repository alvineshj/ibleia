import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import bcrypt from "bcryptjs"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) return null
  if (session.user.role !== "ADMIN") return null
  return session
}

async function writeAuditLog(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata?: Record<string, unknown>
) {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      entityType,
      entityId,
      metadata: (metadata ?? {}) as object,
    },
  })
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const role = searchParams.get("role") as UserRole | null
  const company = searchParams.get("company")
  const search = searchParams.get("search")

  const where: Record<string, unknown> = {}
  if (role && Object.values(UserRole).includes(role)) where.role = role
  if (company) where.companyName = { contains: company, mode: "insensitive" }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ]
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      companyName: true,
      role: true,
      isActive: true,
      editionId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { name, email, password, role, companyName, phone, editionId } = body

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  if (!Object.values(UserRole).includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 })

  const hashed = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role,
      companyName: companyName ?? null,
      phone: phone ?? null,
      editionId: editionId ?? null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      companyName: true,
      isActive: true,
      createdAt: true,
    },
  })

  await writeAuditLog(session.user.id, "CREATE_USER", "User", user.id, { role, email })

  return NextResponse.json(user, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { id, role, isActive, name, companyName, phone } = body

  if (!id) return NextResponse.json({ error: "Missing user id" }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (role !== undefined) {
    if (!Object.values(UserRole).includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }
    updates.role = role
  }
  if (isActive !== undefined) updates.isActive = isActive
  if (name !== undefined) updates.name = name
  if (companyName !== undefined) updates.companyName = companyName
  if (phone !== undefined) updates.phone = phone

  const user = await prisma.user.update({
    where: { id },
    data: updates,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      companyName: true,
      isActive: true,
    },
  })

  await writeAuditLog(session.user.id, "UPDATE_USER", "User", id, updates)

  return NextResponse.json(user)
}
