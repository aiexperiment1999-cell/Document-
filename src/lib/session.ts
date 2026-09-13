import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** Returns the signed-in firm's session, or null if not authenticated. */
export async function getFirmSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.firmId) return null;
  return session;
}
