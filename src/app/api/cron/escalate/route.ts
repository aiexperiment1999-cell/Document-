import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { nextEscalationStep } from "@/lib/escalation";
import { buildReminderMessage, sendClientMessage } from "@/lib/messaging";

export const runtime = "nodejs";

// Call this on a schedule (Vercel Cron, GitHub Actions, plain cron + curl)
// with `Authorization: Bearer <CRON_SECRET>` to fire due reminders.
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const openRequests = await prisma.documentRequest.findMany({
    where: { status: "PENDING", client: { remindersPaused: false } },
    include: { client: true, firm: true },
  });

  const now = new Date();
  const results: { requestId: string; level: string; sent: boolean; error?: string }[] = [];

  for (const request of openRequests) {
    const step = nextEscalationStep(
      { status: request.status, dueDate: request.dueDate, remindersSent: request.remindersSent },
      now,
    );
    if (!step) continue;

    const message = buildReminderMessage(step.level, {
      clientName: request.client.name,
      label: request.label,
      firmName: request.firm.name,
    });

    let sent = false;
    let error: string | undefined;
    try {
      // ESCALATED_TO_FIRM is an internal notice, not something texted to
      // the client — the client just stops receiving automatic reminders
      // and the item stays flagged on the firm's dashboard.
      if (step.level !== "ESCALATED_TO_FIRM") {
        await sendClientMessage({
          to: request.client.phone,
          channel: request.client.preferredChannel,
          body: message,
        });
      }
      sent = true;
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    }

    // Only advance state once the message actually went out — if Twilio
    // failed, leave remindersSent alone so the next cron run retries the
    // same step instead of silently skipping this client forever.
    if (sent) {
      await prisma.$transaction([
        prisma.reminderLog.create({
          data: {
            documentRequestId: request.id,
            level: step.level,
            channel: request.client.preferredChannel,
            message,
          },
        }),
        prisma.documentRequest.update({
          where: { id: request.id },
          data: { remindersSent: { increment: 1 }, lastReminderAt: now },
        }),
      ]);
    }

    results.push({ requestId: request.id, level: step.level, sent, error });
  }

  return NextResponse.json({ processed: results.length, results });
}

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${expected}`;
}
