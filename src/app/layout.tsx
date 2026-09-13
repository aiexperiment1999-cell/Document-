import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocChaser — stop chasing client documents",
  description:
    "AI document chaser for accountants, bookkeepers, and paralegals. Clients text in W-2s, 1099s, and statements over SMS/WhatsApp — no client portal, no login. DocChaser classifies each document and escalates reminders automatically.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
