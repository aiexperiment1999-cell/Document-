import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const firm = await prisma.firm.upsert({
    where: { ownerEmail: "aiexperiment1999@gmail.com" },
    update: {},
    create: {
      name: "Chen & Associates CPAs",
      ownerEmail: "aiexperiment1999@gmail.com",
      timezone: "America/New_York",
    },
  });

  const jamie = await prisma.client.upsert({
    where: { firmId_phone: { firmId: firm.id, phone: "+15555550101" } },
    update: {},
    create: {
      firmId: firm.id,
      name: "Jamie Chen",
      phone: "+15555550101",
      preferredChannel: "WHATSAPP",
    },
  });

  const priya = await prisma.client.upsert({
    where: { firmId_phone: { firmId: firm.id, phone: "+15555550102" } },
    update: {},
    create: {
      firmId: firm.id,
      name: "Priya Patel",
      phone: "+15555550102",
      preferredChannel: "SMS",
    },
  });

  const today = new Date();
  const daysAgo = (n: number) => new Date(today.getTime() - n * 24 * 60 * 60 * 1000);
  const daysFromNow = (n: number) => new Date(today.getTime() + n * 24 * 60 * 60 * 1000);

  await prisma.documentRequest.createMany({
    data: [
      {
        firmId: firm.id,
        clientId: jamie.id,
        docType: "W2",
        label: "2025 W-2",
        period: "2025",
        dueDate: daysAgo(14),
        status: "RECEIVED",
        receivedAt: daysAgo(10),
      },
      {
        firmId: firm.id,
        clientId: jamie.id,
        docType: "BANK_STATEMENT",
        label: "January Chase statement",
        period: "January 2026",
        dueDate: daysAgo(1),
        status: "PENDING",
      },
      {
        firmId: firm.id,
        clientId: jamie.id,
        docType: "MORTGAGE_STATEMENT",
        label: "Mortgage interest statement (1098)",
        period: "2025",
        dueDate: daysAgo(10),
        status: "PENDING",
        remindersSent: 2,
        lastReminderAt: daysAgo(3),
      },
      {
        firmId: firm.id,
        clientId: priya.id,
        docType: "FORM_1099",
        label: "1099-NEC — Acme Consulting",
        period: "2025",
        dueDate: daysFromNow(5),
        status: "PENDING",
      },
    ],
  });

  console.log(`Seeded firm "${firm.name}" with clients ${jamie.name} and ${priya.name}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
