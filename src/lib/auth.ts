import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// An empty/missing secret doesn't fail cleanly — NextAuth logs a quiet
// warning, then crashes inside its own JWT encryption with a cryptic
// `"ikm" must be at least one byte in length`, which surfaces to the
// browser as an empty 500 response and an even more cryptic "Unexpected
// end of JSON input". Fail loudly here instead, with the actual fix.
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    "NEXTAUTH_SECRET is not set. Generate one with `openssl rand -base64 32` and add it to your .env.",
  );
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: { firm: true },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.firm.name, firmId: user.firmId };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.firmId = (user as { firmId: string }).firmId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { firmId?: string }).firmId = token.firmId as string;
      }
      return session;
    },
  },
};
