import { PrismaClient, BjjBelt, DayOfWeek, PaymentType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding BJJ gym data…')

  const members = await Promise.all([
    prisma.member.upsert({
      where: { email: 'john.silva@example.com' },
      update: {},
      create: { firstName: 'John', lastName: 'Silva', email: 'john.silva@example.com', belt: BjjBelt.BLUE, stripes: 2, phone: '555-0101' },
    }),
    prisma.member.upsert({
      where: { email: 'maria.santos@example.com' },
      update: {},
      create: { firstName: 'Maria', lastName: 'Santos', email: 'maria.santos@example.com', belt: BjjBelt.PURPLE, stripes: 1, phone: '555-0102' },
    }),
    prisma.member.upsert({
      where: { email: 'alex.kim@example.com' },
      update: {},
      create: { firstName: 'Alex', lastName: 'Kim', email: 'alex.kim@example.com', belt: BjjBelt.WHITE, stripes: 3 },
    }),
    prisma.member.upsert({
      where: { email: 'sara.jones@example.com' },
      update: {},
      create: { firstName: 'Sara', lastName: 'Jones', email: 'sara.jones@example.com', belt: BjjBelt.WHITE, stripes: 0 },
    }),
  ])

  const classes = await Promise.all([
    prisma.class.upsert({
      where: { id: 'fundamentals-mon' },
      update: {},
      create: { id: 'fundamentals-mon', name: 'Fundamentals', instructor: 'Prof. Rodrigues', dayOfWeek: DayOfWeek.MONDAY, startTime: '18:30', durationMin: 75 },
    }),
    prisma.class.upsert({
      where: { id: 'advanced-wed' },
      update: {},
      create: { id: 'advanced-wed', name: 'Advanced', instructor: 'Prof. Rodrigues', dayOfWeek: DayOfWeek.WEDNESDAY, startTime: '19:00', durationMin: 90 },
    }),
    prisma.class.upsert({
      where: { id: 'nogi-fri' },
      update: {},
      create: { id: 'nogi-fri', name: 'No-Gi', instructor: 'Coach Ana', dayOfWeek: DayOfWeek.FRIDAY, startTime: '18:00', durationMin: 60 },
    }),
    prisma.class.upsert({
      where: { id: 'open-mat-sat' },
      update: {},
      create: { id: 'open-mat-sat', name: 'Open Mat', instructor: 'Prof. Rodrigues', dayOfWeek: DayOfWeek.SATURDAY, startTime: '10:00', durationMin: 120 },
    }),
  ])

  // Sample payments
  await prisma.payment.createMany({
    data: [
      { memberId: members[0].id, amount: 120, type: PaymentType.MONTHLY, status: 'PAID', paidAt: new Date('2026-06-01'), description: 'June membership' },
      { memberId: members[1].id, amount: 120, type: PaymentType.MONTHLY, status: 'PAID', paidAt: new Date('2026-06-01'), description: 'June membership' },
      { memberId: members[2].id, amount: 120, type: PaymentType.MONTHLY, status: 'PENDING', description: 'June membership' },
    ],
    skipDuplicates: true,
  })

  console.log(`Seeded ${members.length} members, ${classes.length} classes.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
