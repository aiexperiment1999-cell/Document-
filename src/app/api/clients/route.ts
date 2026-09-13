import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFirmSession } from "@/lib/session";

export async function GET() {
  const session = await getFirmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clients = await prisma.client.findMany({
    where: { firmId: session.user.firmId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const session = await getFirmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.name || !body.phone) {
    return NextResponse.json({ error: "name and phone are required" }, { status: 400 });
  }

  const client = await prisma.client.create({
    data: {
      firmId: session.user.firmId,
      name: body.name,
      phone: body.phone,
      preferredChannel: body.preferredChannel === "WHATSAPP" ? "WHATSAPP" : "SMS",
    },
  });
  return NextResponse.json(client, { status: 201 });
}
