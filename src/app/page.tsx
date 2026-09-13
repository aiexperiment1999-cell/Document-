const CHECKLIST = [
  { label: "2025 W-2", status: "received" as const },
  { label: "1099-NEC — Acme Consulting", status: "received" as const },
  { label: "January Chase statement", status: "pending" as const },
  { label: "Mortgage interest statement (1098)", status: "overdue" as const },
];

const STATUS_STYLES: Record<string, string> = {
  received: "bg-brand-100 text-brand-700",
  pending: "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-700",
};

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="flex items-center justify-between">
        <span className="text-lg font-semibold tracking-tight">DocChaser</span>
        <a
          href="/dashboard"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          View dashboard
        </a>
      </header>

      <section className="mt-16 grid gap-12 md:grid-cols-2 md:items-center">
        <div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-stone-900 sm:text-5xl">
            Stop chasing clients for documents.
          </h1>
          <p className="mt-5 text-lg text-stone-600">
            DocChaser texts your clients on SMS and WhatsApp, reads whatever
            they send back — a photo of a W-2, a PDF bank statement, a
            picture of a receipt — and checks it off automatically. No
            client portal. No login. No app to install.
          </p>
          <ul className="mt-8 space-y-3 text-stone-700">
            <li className="flex gap-3">
              <Dot />
              Clients reply to a text message with a photo. That&apos;s the
              entire client-facing workflow.
            </li>
            <li className="flex gap-3">
              <Dot />
              Vision + LLM classification identifies the document type,
              period, and entity, then matches it to your checklist.
            </li>
            <li className="flex gap-3">
              <Dot />
              Still missing after a few days? Reminders escalate
              automatically — gentle, then firm, then a flag on your
              dashboard to call the client yourself.
            </li>
          </ul>
          <div className="mt-10 flex items-center gap-4">
            <a
              href="mailto:hello@docchaser.app"
              className="rounded-md bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Get early access
            </a>
            <span className="text-sm text-stone-500">
              $25–40/mo per firm · built for solo & small-firm practices
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <span className="text-sm font-medium text-stone-500">
              Jamie Chen — tax season checklist
            </span>
            <span className="text-xs text-stone-400">via WhatsApp</span>
          </div>
          <ul className="mt-4 space-y-3">
            {CHECKLIST.map((item) => (
              <li
                key={item.label}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-stone-700">{item.label}</span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[item.status]}`}
                >
                  {item.status}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-lg bg-stone-50 p-3 text-xs text-stone-500">
            &ldquo;Hi Jamie — still need your 1098 mortgage statement for
            your return. Reply with a photo whenever you get a chance!&rdquo;
            <div className="mt-1 text-stone-400">
              Auto-sent 7 days after due date · escalation level: firm
            </div>
          </div>
        </div>
      </section>

      <section className="mt-24 grid gap-8 sm:grid-cols-3">
        <Feature
          title="No client login, ever"
          body="Clients never create an account or download an app. They just text back a photo, the same way they'd send one to a friend."
        />
        <Feature
          title="Classifies what it receives"
          body="Vision + LLM reads the document, figures out what it is and what period it covers, and matches it against the open checklist item."
        />
        <Feature
          title="Escalation you don't manage"
          body="Reminders step up automatically on a schedule you set, and hand off to you directly once a document is genuinely overdue."
        />
      </section>
    </main>
  );
}

function Dot() {
  return (
    <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-brand-500" />
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-semibold text-stone-900">{title}</h3>
      <p className="mt-2 text-sm text-stone-600">{body}</p>
    </div>
  );
}
