import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDefaultFirm } from "@/lib/firm";

export async function GET() {
  const firm = await getDefaultFirm();
  const clients = await prisma.client.findMany({
    where: { firmId: firm.id },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const firm = await getDefaultFirm();
  const body = await req.json();

  if (!body.name || !body.phone) {
    return NextResponse.json({ error: "name and phone are required" }, { status: 400 });
  }

  const client = await prisma.client.create({
    data: {
      firmId: firm.id,
      name: body.name,
      phone: body.phone,
      preferredChannel: body.preferredChannel === "WHATSAPP" ? "WHATSAPP" : "SMS",
    },
  });
  return NextResponse.json(client, { status: 201 });
}
