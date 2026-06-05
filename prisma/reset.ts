/**
 * Resets all edition data while keeping user accounts intact.
 * Run with: npx tsx prisma/reset.ts
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Resetting database (keeping users)...")

  // Delete in dependency order (children before parents)
  await prisma.scoreItem.deleteMany()
  console.log("  ScoreItems deleted")

  await prisma.score.deleteMany()
  console.log("  Scores deleted")

  await prisma.conflictDeclaration.deleteMany()
  console.log("  ConflictDeclarations deleted")

  await prisma.presentationMember.deleteMany()
  await prisma.presentationObserver.deleteMany()
  await prisma.presentation.deleteMany()
  console.log("  Presentations deleted")

  await prisma.report.deleteMany()
  console.log("  Reports deleted")

  await prisma.teamMember.deleteMany()
  await prisma.team.deleteMany()
  console.log("  Teams deleted")

  await prisma.idea.deleteMany()
  console.log("  Ideas deleted")

  await prisma.workshopAttendee.deleteMany()
  await prisma.externalSurveyTrigger.deleteMany()
  await prisma.workshop.deleteMany()
  console.log("  Workshops deleted")

  await prisma.slot.deleteMany()
  console.log("  Slots deleted")

  await prisma.criterion.deleteMany()
  console.log("  Criteria deleted")

  await prisma.auditLog.deleteMany()
  console.log("  AuditLogs deleted")

  await prisma.notification.deleteMany()
  console.log("  Notifications deleted")

  // Detach users from their edition before deleting it
  await prisma.user.updateMany({ data: { editionId: null } })
  console.log("  Users detached from edition")

  await prisma.edition.deleteMany()
  console.log("  Editions deleted")

  console.log("\nReset complete. Run 'npm run db:seed' to create a fresh edition.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
