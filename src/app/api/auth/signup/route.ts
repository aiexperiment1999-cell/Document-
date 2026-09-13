import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// Self-serve signup: creates a Firm and its one User in a single step, per
// the PRD's "signup to first client message sent, under 15 minutes, no
// onboarding call" goal. Billing (Stripe) is not wired up yet — see
// README for what's deferred.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { firmName, email, password } = body as {
    firmName?: string;
    email?: string;
    password?: string;
  };

  if (!firmName || !email || !password) {
    return NextResponse.json(
      { error: "firmName, email, and password are required" },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const normalizedEmail = email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const firm = await prisma.firm.create({
    data: {
      name: firmName,
      ownerEmail: normalizedEmail,
      user: { create: { email: normalizedEmail, passwordHash } },
    },
  });

  return NextResponse.json({ firmId: firm.id }, { status: 201 });
}
