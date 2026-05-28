import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const CRITERIA_DATA = [
  {
    number: 1,
    name: "Organisational Readiness (Leadership Support)",
    description: "Level of organisational sponsorship and readiness to proceed",
    weightPctCX: 5, weightPctBI: 5, weightPctOE: 5,
    isTiebreakerBonus: false,
    anchor0: "No owner or sponsor identified",
    anchor1: "Informal interest only",
    anchor2: "Owner identified but weak commitment",
    anchor3: "Sponsor identified with partial commitment",
    anchor4: "Strong sponsor and clear ownership",
    anchor5: "Full sponsorship, resourcing, and readiness to proceed",
  },
  {
    number: 2,
    name: "Impact on Business Model",
    description: "Degree of new business model impact (tie-break bonus criterion)",
    weightPctCX: 0, weightPctBI: 0, weightPctOE: 0,
    isTiebreakerBonus: true,
    anchor0: "No new business model impact identified",
    anchor1: "Minor enhancement to existing model",
    anchor2: "New revenue idea but highly dependent on core business",
    anchor3: "Distinct model with new revenue streams, partially independent",
    anchor4: "Strong new model with clear revenue potential and operational independence",
    anchor5: "Transformational model creating significant new growth, largely independent from core",
  },
  {
    number: 3,
    name: "Impact on ESG",
    description: "Environmental, Social & Governance impact",
    weightPctCX: 5, weightPctBI: 5, weightPctOE: 5,
    isTiebreakerBonus: false,
    anchor0: "No ESG impact identified",
    anchor1: "ESG mentioned but weak or incidental",
    anchor2: "Some positive ESG impact, limited in scope",
    anchor3: "Clear and meaningful ESG impact in at least one dimension",
    anchor4: "Strong ESG impact with measurable outcomes",
    anchor5: "Significant, measurable, and scalable ESG impact embedded in the solution",
  },
  {
    number: 4,
    name: "Creativity & Innovation (Originality)",
    description: "Level of originality and innovation",
    weightPctCX: 10, weightPctBI: 15, weightPctOE: 10,
    isTiebreakerBonus: false,
    anchor0: "No innovation element presented",
    anchor1: "Purely incremental improvement",
    anchor2: "Minor novelty; limited differentiation",
    anchor3: "Some new elements or creative recombination",
    anchor4: "Clearly innovative with distinct differentiation",
    anchor5: "Highly original, disruptive, or reframes the problem in a novel way",
  },
  {
    number: 5,
    name: "Desirability (User & Stakeholder Value)",
    description: "Evidence of customer/stakeholder need and demand",
    weightPctCX: 30, weightPctBI: 20, weightPctOE: 15,
    isTiebreakerBonus: false,
    anchor0: "No customer need identified; no evidence",
    anchor1: "Assumed need, no direct input",
    anchor2: "Limited evidence (informal/anecdotal)",
    anchor3: "Clear need with some structured evidence (interviews, small survey)",
    anchor4: "Strong validation using multiple evidence sources",
    anchor5: "Compelling, well-documented validation with strong demand and clear value",
  },
  {
    number: 6,
    name: "Viability (Profit, Cost Savings & Efficiency Gains)",
    description: "Financial value and economic sustainability",
    weightPctCX: 15, weightPctBI: 20, weightPctOE: 30,
    isTiebreakerBonus: false,
    anchor0: "No financial value identified",
    anchor1: "Financial value claimed but unsupported",
    anchor2: "Value estimated via assumptions/extrapolation only",
    anchor3: "Early financial evidence from MVPs or pilots",
    anchor4: "Actual, recurring profit/savings evidenced over several months",
    anchor5: "Strong, sustained financial value with growth trajectory and scalability",
  },
  {
    number: 7,
    name: "Feasibility (Execution & Delivery)",
    description: "Degree of implementation progress and delivery capability",
    weightPctCX: 20, weightPctBI: 20, weightPctOE: 20,
    isTiebreakerBonus: false,
    anchor0: "No execution activity; idea only",
    anchor1: "Concept defined, no tangible execution started",
    anchor2: "Initial execution started (planning, design, early pilot)",
    anchor3: "Pilot or partial implementation completed",
    anchor4: "Implemented and in use, not yet fully rolled out",
    anchor5: "Fully implemented and operational across the intended scope",
  },
  {
    number: 8,
    name: "Presentation — Slides Design & Content Quality",
    description: "Quality of presentation slides",
    weightPctCX: 7.5, weightPctBI: 7.5, weightPctOE: 7.5,
    isTiebreakerBonus: false,
    anchor0: "Slides missing or mandatory content not covered",
    anchor1: "Poor formatting, cluttered, hard to read",
    anchor2: "Acceptable design but inconsistent or overloaded",
    anchor3: "Clean, readable slides with all mandatory content",
    anchor4: "Visually strong, consistent design supporting key messages",
    anchor5: "Highly professional, polished slides that reinforce the story",
  },
  {
    number: 9,
    name: "Presentation — Storytelling & Team Delivery",
    description: "Quality of storytelling and team delivery",
    weightPctCX: 7.5, weightPctBI: 7.5, weightPctOE: 7.5,
    isTiebreakerBonus: false,
    anchor0: "No clear story, no effective team participation",
    anchor1: "Disjointed narrative, minimal contribution from most members",
    anchor2: "Basic structure but weak flow and uneven participation",
    anchor3: "Clear and logical story with all members contributing meaningfully",
    anchor4: "Engaging narrative with smooth transitions and well-balanced delivery",
    anchor5: "Compelling story with strong hook, seamless transitions, confident handovers, and balanced contribution from all members",
  },
]

async function main() {
  console.log("Seeding database...")

  // Create active edition
  const edition = await prisma.edition.upsert({
    where: { year: 2026 },
    update: {},
    create: {
      year: 2026,
      name: "IBL Excellence & Innovation Award 2026",
      status: "ACTIVE",
      launchDate: new Date("2026-02-04"),
      regDeadline: new Date("2026-03-31T23:59:00"),
      briefSessionStart: new Date("2026-04-06T08:30:00"),
      briefSessionEnd: new Date("2026-04-07T12:00:00"),
      qfStart: new Date("2026-06-15"),
      sfStart: new Date("2026-08-31"),
      finalDate: new Date("2026-10-09"),
    },
  })
  console.log("Edition created:", edition.year)

  // Create scoring criteria
  for (const criterionData of CRITERIA_DATA) {
    await prisma.criterion.upsert({
      where: { editionId_number: { editionId: edition.id, number: criterionData.number } },
      update: {},
      create: { editionId: edition.id, ...criterionData },
    })
  }
  console.log("Criteria created:", CRITERIA_DATA.length)

  // Create slots for April 6-7 (8:30am - 12:00pm, 15-min intervals)
  const slotDates = [
    new Date("2026-04-06"),
    new Date("2026-04-07"),
  ]

  for (const slotDate of slotDates) {
    let current = new Date(slotDate)
    current.setHours(8, 30, 0, 0)
    const end = new Date(slotDate)
    end.setHours(12, 0, 0, 0)

    while (current < end) {
      const slotStart = new Date(current)
      const existing = await prisma.slot.findFirst({
        where: {
          editionId: edition.id,
          startTime: slotStart,
        },
      })

      if (!existing) {
        await prisma.slot.create({
          data: {
            editionId: edition.id,
            date: slotDate,
            startTime: slotStart,
            durationMins: 15,
          },
        })
      }

      current = new Date(current.getTime() + 15 * 60 * 1000)
    }
  }
  console.log("Slots created for April 6-7")

  // Create admin user
  const adminPassword = await bcrypt.hash("Admin2026!", 12)
  const admin = await prisma.user.upsert({
    where: { email: "admin@iblgroup.com" },
    update: {},
    create: {
      name: "Award Administrator",
      email: "admin@iblgroup.com",
      password: adminPassword,
      role: "ADMIN",
      companyName: "IBL Group",
      editionId: edition.id,
    },
  })
  console.log("Admin user created:", admin.email)

  // Create demo jury user
  const juryPassword = await bcrypt.hash("Jury2026!", 12)
  await prisma.user.upsert({
    where: { email: "jury@iblgroup.com" },
    update: {},
    create: {
      name: "Jury Member",
      email: "jury@iblgroup.com",
      password: juryPassword,
      role: "JURY",
      companyName: "IBL Group",
      editionId: edition.id,
    },
  })
  console.log("Jury user created: jury@iblgroup.com")

  // Create demo participant
  const participantPassword = await bcrypt.hash("Part2026!", 12)
  await prisma.user.upsert({
    where: { email: "participant@iblgroup.com" },
    update: {},
    create: {
      name: "Demo Participant",
      email: "participant@iblgroup.com",
      password: participantPassword,
      role: "PARTICIPANT",
      companyName: "IBL Subsidiary",
      phone: "+230 5000 0000",
      editionId: edition.id,
    },
  })
  console.log("Participant user created: participant@iblgroup.com")

  // Create comms user
  const commsPassword = await bcrypt.hash("Comms2026!", 12)
  await prisma.user.upsert({
    where: { email: "comms@iblgroup.com" },
    update: {},
    create: {
      name: "Communications User",
      email: "comms@iblgroup.com",
      password: commsPassword,
      role: "COMMS",
      companyName: "IBL Group Communications",
      editionId: edition.id,
    },
  })
  console.log("Comms user created: comms@iblgroup.com")

  console.log("\nSeed complete!")
  console.log("\nDemo Accounts:")
  console.log("  Admin:       admin@iblgroup.com / Admin2026!")
  console.log("  Jury:        jury@iblgroup.com / Jury2026!")
  console.log("  Participant: participant@iblgroup.com / Part2026!")
  console.log("  Comms:       comms@iblgroup.com / Comms2026!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
