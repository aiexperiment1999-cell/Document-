import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getFirmSession } from "@/lib/session";
import { AddClientForm, ClientActions, RequestStatusActions, SignOutButton } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  RECEIVED: "bg-brand-100 text-brand-700",
  PENDING: "bg-amber-100 text-amber-700",
  OVERDUE: "bg-red-100 text-red-700",
  WAIVED: "bg-stone-100 text-stone-500",
};

export default async function DashboardPage() {
  const session = await getFirmSession();
  if (!session) redirect("/login");

  const firmId = session.user.firmId;
  const now = new Date();

  const [firm, requests, reviewQueue, clients] = await Promise.all([
    prisma.firm.findUniqueOrThrow({ where: { id: firmId } }),
    prisma.documentRequest.findMany({
      where: { firmId },
      include: { client: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.incomingDocument.findMany({
      where: { needsReview: true, client: { firmId } },
      include: { client: true },
      orderBy: { receivedAt: "desc" },
      take: 20,
    }),
    prisma.client.findMany({ where: { firmId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{firm.name}</h1>
          <p className="text-sm text-stone-500">Document checklist overview</p>
        </div>
        <div className="flex items-center gap-4">
          <a href="/" className="text-sm text-stone-500 hover:text-stone-700">
            ← Back to site
          </a>
          <SignOutButton />
        </div>
      </header>

      {reviewQueue.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Needs your review</h2>
          <p className="text-sm text-stone-500">
            The classifier wasn&apos;t confident enough to auto-match these to a checklist item.
          </p>
          <ul className="mt-4 divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
            {reviewQueue.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <span className="font-medium text-stone-800">{doc.client.name}</span>
                  <span className="ml-2 text-stone-500">
                    guessed: {doc.classifiedType ?? "unknown"}
                    {doc.classifiedPeriod ? ` · ${doc.classifiedPeriod}` : ""}
                  </span>
                  {doc.flagReason && (
                    <div className="mt-0.5 text-xs text-amber-700">{doc.flagReason}</div>
                  )}
                </div>
                <a
                  href={doc.mediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-600 hover:underline"
                >
                  View document
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Checklist</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reminders sent</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {requests.map((r) => {
                const overdue = r.status === "PENDING" && r.dueDate < now;
                const statusLabel = overdue ? "OVERDUE" : r.status;
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium text-stone-800">{r.client.name}</td>
                    <td className="px-4 py-3 text-stone-600">{r.label}</td>
                    <td className="px-4 py-3 text-stone-500">
                      {r.dueDate.toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[statusLabel]}`}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-500">{r.remindersSent}</td>
                    <td className="px-4 py-3">
                      <RequestStatusActions requestId={r.id} status={r.status} />
                    </td>
                  </tr>
                );
              })}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                    No checklist items yet — add a client below, then apply a template.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Clients</h2>
        <div className="mt-4">
          <AddClientForm />
        </div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {clients.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-stone-800">{c.name}</div>
                {c.remindersPaused && (
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
                    reminders paused
                  </span>
                )}
              </div>
              <div className="text-stone-500">
                {c.phone} · {c.preferredChannel}
              </div>
              <ClientActions clientId={c.id} remindersPaused={c.remindersPaused} />
            </li>
          ))}
          {clients.length === 0 && (
            <li className="text-sm text-stone-400">No clients yet.</li>
          )}
        </ul>
      </section>
    </main>
  );
}
