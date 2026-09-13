import twilioLib from "twilio";
import type { Channel, ReminderLevel } from "@prisma/client";

export interface ReminderContext {
  clientName: string;
  label: string;
  firmName: string;
}

/**
 * Pure copy generator, kept separate from the Twilio call so message
 * wording can be unit tested without network access.
 */
export function buildReminderMessage(level: ReminderLevel, ctx: ReminderContext): string {
  switch (level) {
    case "GENTLE":
      return `Hi ${ctx.clientName} — this is ${ctx.firmName}. Just a friendly reminder we still need your ${ctx.label}. Reply with a photo whenever you get a chance!`;
    case "FIRM":
      return `Hi ${ctx.clientName}, following up again — we still haven't received your ${ctx.label}. We need this soon to stay on track. A quick photo reply works great.`;
    case "URGENT":
      return `${ctx.clientName}, this is an urgent reminder from ${ctx.firmName}: your ${ctx.label} is still outstanding and is holding things up. Please send it today if you can.`;
    case "ESCALATED_TO_FIRM":
      return `Internal notice for ${ctx.firmName}: ${ctx.clientName} has not sent their ${ctx.label} after multiple automatic reminders. Recommend a personal call.`;
    default:
      return `Reminder: we still need your ${ctx.label}.`;
  }
}

let cachedClient: ReturnType<typeof twilioLib> | null = null;
function getTwilioClient() {
  if (!cachedClient) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) throw new Error("Twilio credentials are not set");
    cachedClient = twilioLib(sid, token);
  }
  return cachedClient;
}

/**
 * Sends a message to a client over SMS or WhatsApp. Network call — the
 * ESCALATED_TO_FIRM level is handled by the caller instead (it's an
 * internal notice, not something texted to the client).
 */
export async function sendClientMessage(params: {
  to: string;
  channel: Channel;
  body: string;
}): Promise<void> {
  const { to, channel, body } = params;
  const from =
    channel === "WHATSAPP" ? process.env.TWILIO_WHATSAPP_FROM : process.env.TWILIO_SMS_FROM;
  if (!from) {
    throw new Error(`No Twilio "from" number configured for channel ${channel}`);
  }

  await getTwilioClient().messages.create({
    to: channel === "WHATSAPP" ? `whatsapp:${to.replace(/^whatsapp:/, "")}` : to,
    from,
    body,
  });
}
