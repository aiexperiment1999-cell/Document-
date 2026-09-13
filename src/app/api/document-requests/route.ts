import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDefaultFirm } from "@/lib/firm";
import { DocumentType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const firm = await getDefaultFirm();
  const status = req.nextUrl.searchParams.get("status");

  const requests = await prisma.documentRequest.findMany({
    where: {
      firmId: firm.id,
      ...(status ? { status: status as "PENDING" | "RECEIVED" | "WAIVED" } : {}),
    },
    include: { client: true },
    orderBy: { dueDate: "asc" },
  });
  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const firm = await getDefaultFirm();
  const body = await req.json();

  if (!body.clientId || !body.docType || !body.label || !body.dueDate) {
    return NextResponse.json(
      { error: "clientId, docType, label, and dueDate are required" },
      { status: 400 },
    );
  }
  if (!(body.docType in DocumentType)) {
    return NextResponse.json({ error: `Unknown docType: ${body.docType}` }, { status: 400 });
  }

  const documentRequest = await prisma.documentRequest.create({
    data: {
      firmId: firm.id,
      clientId: body.clientId,
      docType: body.docType,
      label: body.label,
      period: body.period ?? null,
      dueDate: new Date(body.dueDate),
    },
  });
  return NextResponse.json(documentRequest, { status: 201 });
}
