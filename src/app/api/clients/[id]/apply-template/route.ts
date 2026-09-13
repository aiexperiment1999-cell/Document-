import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFirmSession } from "@/lib/session";
import { getTemplate } from "@/lib/templates";
import { addDays } from "@/lib/escalation";

// Bulk-creates checklist items for a client from a starter template, so
// most accountants aren't typing a checklist line-by-line (PRD: "a few
// starter templates... so most accountants don't type from scratch").
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getFirmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client || client.firmId !== session.user.firmId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const template = typeof body.templateId === "string" ? getTemplate(body.templateId) : undefined;
  if (!template) {
    return NextResponse.json({ error: "Unknown templateId" }, { status: 400 });
  }

  const now = new Date();
  const created = await prisma.$transaction(
    template.items.map((item) =>
      prisma.documentRequest.create({
        data: {
          firmId: session.user.firmId,
          clientId: client.id,
          docType: item.docType,
          label: item.label,
          dueDate: addDays(now, item.dueInDays),
        },
      }),
    ),
  );

  return NextResponse.json(created, { status: 201 });
}
