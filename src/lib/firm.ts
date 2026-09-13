import { prisma } from "@/lib/db";

/**
 * This MVP is single-tenant per deployment: one firm, no login screen for
 * the accountant either (yet). Multi-tenant auth is a real gap called out
 * in the README, not something papered over here.
 */
export async function getDefaultFirm() {
  const firm = await prisma.firm.findFirst({ orderBy: { createdAt: "asc" } });
  if (!firm) {
    throw new Error("No firm found — run `npm run db:seed` first.");
  }
  return firm;
}
