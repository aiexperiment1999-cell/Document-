import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFirmSession } from "@/lib/session";
import { buildOpeningMessage, sendClientMessage } from "@/lib/messaging";

// The "Send" step from the PRD: triggers the opening message to the
// client's number, listing every outstanding checklist item.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getFirmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      firm: true,
      documentRequests: { where: { status: "PENDING" }, orderBy: { dueDate: "asc" } },
    },
  });
  if (!client || client.firmId !== session.user.firmId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (client.documentRequests.length === 0) {
    return NextResponse.json({ error: "This client has no outstanding checklist items" }, { status: 400 });
  }

  const message = buildOpeningMessage({
    clientName: client.name,
    firmName: client.firm.name,
    itemLabels: client.documentRequests.map((r) => r.label),
  });

  try {
    await sendClientMessage({ to: client.phone, channel: client.preferredChannel, body: message });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Failed to send: ${detail}` }, { status: 502 });
  }

  return NextResponse.json({ sent: true, message });
}
