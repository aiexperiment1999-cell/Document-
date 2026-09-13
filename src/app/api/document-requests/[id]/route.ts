import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFirmSession } from "@/lib/session";

const ALLOWED_STATUSES = ["PENDING", "RECEIVED", "WAIVED"] as const;

// Manual override per PRD: "the accountant can mark anything
// received/not-received by hand."
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getFirmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.documentRequest.findUnique({ where: { id } });
  if (!existing || existing.firmId !== session.user.firmId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  if (!ALLOWED_STATUSES.includes(body.status)) {
    return NextResponse.json(
      { error: `status must be one of ${ALLOWED_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  const updated = await prisma.documentRequest.update({
    where: { id: existing.id },
    data: {
      status: body.status,
      receivedAt: body.status === "RECEIVED" ? new Date() : null,
    },
  });
  return NextResponse.json(updated);
}
