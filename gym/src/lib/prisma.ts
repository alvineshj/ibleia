import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { gymPrisma: PrismaClient }

export const prisma =
  globalForPrisma.gymPrisma ||
  new PrismaClient({ log: ['error'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.gymPrisma = prisma
