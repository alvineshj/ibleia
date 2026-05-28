import nodemailer from "nodemailer"
import { prisma } from "@/lib/prisma"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

interface EmailPayload {
  to: string | string[]
  subject: string
  html: string
  recipientId?: string
  type?: string
  editionId?: string
}

export async function sendEmail(payload: EmailPayload) {
  const from = process.env.SMTP_FROM || "IBL Excellence Award <noreply@iblgroup.com>"

  try {
    await transporter.sendMail({
      from,
      to: Array.isArray(payload.to) ? payload.to.join(", ") : payload.to,
      subject: payload.subject,
      html: payload.html,
    })

    if (payload.recipientId) {
      await prisma.notification.create({
        data: {
          recipientId: payload.recipientId,
          editionId: payload.editionId,
          type: payload.type || "GENERAL",
          subject: payload.subject,
          body: payload.html,
          sentAt: new Date(),
          status: "SENT",
        },
      })
    }
  } catch (error) {
    console.error("Email send error:", error)
    if (payload.recipientId) {
      await prisma.notification.create({
        data: {
          recipientId: payload.recipientId,
          editionId: payload.editionId,
          type: payload.type || "GENERAL",
          subject: payload.subject,
          body: payload.html,
          status: "FAILED",
        },
      })
    }
    throw error
  }
}

export function slotBookingEmail(data: {
  name: string
  slotDate: string
  slotTime: string
  teamsLink?: string
  ideaCodeName: string
}) {
  return {
    subject: "IBL Excellence Award — Slot Booking Confirmation",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #003087; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">IBL Excellence &amp; Innovation Award 2026</h1>
          <p style="margin: 5px 0 0;">Idea Brief Session — Booking Confirmation</p>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <p>Dear ${data.name},</p>
          <p>Your Idea Brief Session slot has been confirmed for <strong>${data.ideaCodeName}</strong>.</p>
          <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; background:#eee; font-weight:bold;">Date</td>
              <td style="padding: 8px;">${data.slotDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px; background:#eee; font-weight:bold;">Time</td>
              <td style="padding: 8px;">${data.slotTime}</td>
            </tr>
            ${data.teamsLink ? `<tr>
              <td style="padding: 8px; background:#eee; font-weight:bold;">MS Teams Link</td>
              <td style="padding: 8px;"><a href="${data.teamsLink}">${data.teamsLink}</a></td>
            </tr>` : ""}
          </table>
          <p style="color:#666;">Your 5-minute Idea Brief Session is in the presence of the Award Committee. This is the initial eligibility filter — not a competitive pitch. Please be concise and ready.</p>
          <p>For questions: <a href="mailto:excellenceaward@iblgroup.com">excellenceaward@iblgroup.com</a></p>
        </div>
        <div style="background:#003087; color:#ccc; padding:15px; text-align:center; font-size:12px;">
          IBL Group — Excellence &amp; Innovation Award Committee
        </div>
      </div>
    `,
  }
}

export function reportConfirmationEmail(data: {
  name: string
  ideaCodeName: string
  round: string
}) {
  return {
    subject: `IBL Excellence Award — Report Received (${data.round})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #003087; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">IBL Excellence &amp; Innovation Award 2026</h1>
        </div>
        <div style="padding: 30px;">
          <p>Dear ${data.name},</p>
          <p>We have received your <strong>${data.round}</strong> report for <strong>${data.ideaCodeName}</strong>.</p>
          <p>Your report is now under review by the jury. Good luck!</p>
          <p>For questions: <a href="mailto:excellenceaward@iblgroup.com">excellenceaward@iblgroup.com</a></p>
        </div>
      </div>
    `,
  }
}

export function progressionEmail(data: {
  name: string
  ideaCodeName: string
  nextRound: string
  reportDeadline?: string
}) {
  return {
    subject: `IBL Excellence Award — Congratulations! You advanced to ${data.nextRound}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #003087; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">IBL Excellence &amp; Innovation Award 2026</h1>
        </div>
        <div style="padding: 30px;">
          <p>Dear ${data.name},</p>
          <p>🎉 Congratulations! Your idea <strong>${data.ideaCodeName}</strong> has advanced to the <strong>${data.nextRound}</strong>!</p>
          ${data.reportDeadline ? `<p>Your next report deadline is: <strong>${data.reportDeadline}</strong></p>` : ""}
          <p>Log into the platform to see your next steps and requirements.</p>
          <p>For questions: <a href="mailto:excellenceaward@iblgroup.com">excellenceaward@iblgroup.com</a></p>
        </div>
      </div>
    `,
  }
}

export function eliminationEmail(data: { name: string; ideaCodeName: string; round: string }) {
  return {
    subject: `IBL Excellence Award — Round Result for ${data.ideaCodeName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #003087; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">IBL Excellence &amp; Innovation Award 2026</h1>
        </div>
        <div style="padding: 30px;">
          <p>Dear ${data.name},</p>
          <p>Thank you for your participation in the <strong>${data.round}</strong>. After careful evaluation, <strong>${data.ideaCodeName}</strong> has not advanced to the next round.</p>
          <p>We truly appreciate your effort and innovation. Please continue to bring your ideas forward in future editions.</p>
          <p>For questions: <a href="mailto:excellenceaward@iblgroup.com">excellenceaward@iblgroup.com</a></p>
        </div>
      </div>
    `,
  }
}

export function surveyTriggerEmail(data: {
  triggerType: string
  eventDescription: string
  audience: string
  surveyUrl?: string
}) {
  return {
    subject: `IBL Excellence Award — Action Required: Launch Survey (${data.triggerType})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #C8971A; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">Action Required: Survey Launch</h1>
        </div>
        <div style="padding: 30px;">
          <p><strong>Trigger:</strong> ${data.triggerType}</p>
          <p><strong>Event:</strong> ${data.eventDescription}</p>
          <p><strong>Audience:</strong> ${data.audience}</p>
          ${data.surveyUrl ? `<p><strong>Survey URL:</strong> <a href="${data.surveyUrl}">${data.surveyUrl}</a></p>` : ""}
          <p>Please log into the platform and mark this task as <strong>Launched</strong> once you have sent the SurveyMonkey survey.</p>
          <p style="color:#e74c3c;font-weight:bold;">This task will escalate if not actioned within 2 days.</p>
        </div>
      </div>
    `,
  }
}
