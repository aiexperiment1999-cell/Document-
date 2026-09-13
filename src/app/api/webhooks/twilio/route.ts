import { NextRequest, NextResponse } from "next/server";
import twilioLib from "twilio";
import { prisma } from "@/lib/db";
import { classifyDocument } from "@/lib/classifier";
import { matchDocumentToRequest } from "@/lib/matching";

export const runtime = "nodejs";

// Twilio posts inbound SMS/WhatsApp messages here as
// application/x-www-form-urlencoded. Docs:
// https://www.twilio.com/docs/messaging/guides/webhook-request
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const params = new URLSearchParams(rawBody);

  if (!(await isValidTwilioRequest(req, rawBody))) {
    return new NextResponse("Invalid Twilio signature", { status: 403 });
  }

  const from = normalizePhone(params.get("From") ?? "");
  const numMedia = Number(params.get("NumMedia") ?? "0");
  const isWhatsApp = (params.get("From") ?? "").startsWith("whatsapp:");

  const client = await prisma.client.findFirst({ where: { phone: from } });
  if (!client) {
    return twiml(
      "We couldn't match this number to a client record. Please contact your accountant directly.",
    );
  }

  if (numMedia < 1) {
    return twiml(
      `Hi ${client.name}! To send a document, just reply to this text with a photo or PDF attached.`,
    );
  }

  const mediaUrl = params.get("MediaUrl0")!;
  const mediaContentType = params.get("MediaContentType0") ?? "image/jpeg";
  const messageSid = params.get("MessageSid") ?? undefined;

  const mediaBase64 = await downloadTwilioMediaAsBase64(mediaUrl);

  const classification = await classifyDocument({ mediaBase64, mediaContentType });

  const openRequests = await prisma.documentRequest.findMany({
    where: { clientId: client.id, status: "PENDING" },
    select: { id: true, docType: true, period: true },
  });

  const { matchedId, needsReview } = matchDocumentToRequest(
    { docType: classification.docType, period: classification.period, confidence: classification.confidence },
    openRequests,
  );

  const incomingDocument = await prisma.incomingDocument.create({
    data: {
      clientId: client.id,
      channel: isWhatsApp ? "WHATSAPP" : "SMS",
      mediaUrl,
      mediaContentType,
      rawMessageSid: messageSid,
      classifiedType: classification.docType ?? undefined,
      classifiedPeriod: classification.period ?? undefined,
      classifiedEntity: classification.entity ?? undefined,
      confidence: classification.confidence,
      classificationRaw: classification.raw,
      matchedRequestId: matchedId ?? undefined,
      needsReview,
    },
  });

  let reply: string;
  if (matchedId) {
    const matchedRequest = await prisma.documentRequest.update({
      where: { id: matchedId },
      data: { status: "RECEIVED", receivedAt: new Date() },
    });
    reply = `Got it — thanks! We've checked off "${matchedRequest.label}". `;
  } else {
    reply =
      "Thanks, we received that document. We're not sure which checklist item it covers, so someone from the team will take a look. ";
  }

  return twiml(reply, incomingDocument.id);
}

function twiml(message: string, _debugId?: string) {
  const body = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizePhone(from: string): string {
  return from.replace(/^whatsapp:/, "");
}

async function downloadTwilioMediaAsBase64(mediaUrl: string): Promise<string> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const auth = sid && token ? Buffer.from(`${sid}:${token}`).toString("base64") : undefined;

  const res = await fetch(mediaUrl, {
    headers: auth ? { Authorization: `Basic ${auth}` } : undefined,
  });
  if (!res.ok) {
    throw new Error(`Failed to download media from Twilio: ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  return buffer.toString("base64");
}

async function isValidTwilioRequest(req: NextRequest, rawBody: string): Promise<boolean> {
  if (process.env.TWILIO_VALIDATE_SIGNATURE === "false") return true;

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.headers.get("x-twilio-signature");
  if (!authToken || !signature) return false;

  const url = new URL(req.url);
  const fullUrl = `${process.env.APP_BASE_URL ?? `${url.protocol}//${url.host}`}${url.pathname}`;

  const params = Object.fromEntries(new URLSearchParams(rawBody).entries());
  return twilioLib.validateRequest(authToken, signature, fullUrl, params);
}
