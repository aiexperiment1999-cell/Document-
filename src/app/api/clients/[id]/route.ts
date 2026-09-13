import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFirmSession } from "@/lib/session";

async function loadOwnedClient(id: string, firmId: string) {
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client || client.firmId !== firmId) return null;
  return client;
}

// Manual override per PRD: "pause the automated reminders for one client."
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getFirmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const client = await loadOwnedClient(id, session.user.firmId);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  if (typeof body.remindersPaused !== "boolean") {
    return NextResponse.json({ error: "remindersPaused (boolean) is required" }, { status: 400 });
  }

  const updated = await prisma.client.update({
    where: { id: client.id },
    data: { remindersPaused: body.remindersPaused },
  });
  return NextResponse.json(updated);
}
