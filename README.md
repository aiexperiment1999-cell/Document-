# DocChaser

An AI document chaser for accountants, bookkeepers, and paralegals.
Clients text in documents over SMS/WhatsApp — a photo of a W-2, a PDF bank
statement, a snapshot of a receipt — DocChaser classifies each one with a
vision + LLM pipeline, matches it against the firm's checklist for that
client, and automatically escalates reminders for anything still missing.

**No client login. No portal. No app.** The entire client-facing workflow
is: reply to a text message with a photo.

Target user: solo and small-firm accountants/bookkeepers. Priced around
$25–40/mo per firm.

## How it works

1. The firm creates a `DocumentRequest` checklist item per client (e.g.
   "2025 W-2", due 2/15) via the API (or, eventually, the dashboard UI).
2. The client texts a photo/PDF to the firm's Twilio number over SMS or
   WhatsApp. Twilio posts it to `POST /api/webhooks/twilio`.
3. The webhook downloads the media, sends it to Claude's vision model
   (`src/lib/classifier.ts`) to classify document type, period, and the
   entity printed on it (employer, bank, etc.), then tries to match it to
   an open checklist item for that client (`src/lib/matching.ts`).
4. A confident match closes out the checklist item and replies to the
   client confirming receipt. A low-confidence or ambiguous match instead
   lands in the firm's "needs review" queue on the dashboard.
5. A cron-triggered endpoint (`POST /api/cron/escalate`) walks every open
   checklist item and fires the next reminder in the escalation schedule
   (`src/lib/escalation.ts`): gentle → firm → urgent → flagged for the
   accountant to call personally. Nothing escalates until the *previous*
   message actually sent — a transient Twilio failure doesn't silently
   skip a step.

## Data model

See `prisma/schema.prisma`. Core entities: `Firm` → `Client` →
`DocumentRequest` (a checklist item) and `IncomingDocument` (something a
client texted in, classified and optionally matched to a request).
`ReminderLog` records every escalation message sent.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Prisma + PostgreSQL
- `@anthropic-ai/sdk` for vision-based document classification
- `twilio` for sending/receiving SMS and WhatsApp messages

## Getting started

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, ANTHROPIC_API_KEY, TWILIO_*
npm run db:push        # creates tables in your Postgres database
npm run db:seed        # seeds a demo firm with two clients and a checklist
npm run dev
```

Visit `http://localhost:3000` for the landing page and
`http://localhost:3000/dashboard` for the firm's checklist view.

Any Postgres works for `DATABASE_URL` — local, Supabase, Neon, Railway,
Vercel Postgres, etc. To run one locally:

```bash
createdb docchaser
# DATABASE_URL="postgresql://<user>@localhost:5432/docchaser"
```

### Wiring up Twilio

1. Buy/point an SMS-capable number (and enable the WhatsApp sandbox or a
   provisioned WhatsApp sender) in the Twilio console.
2. Set that number's inbound webhook to
   `https://<your-deployment>/api/webhooks/twilio` (HTTP POST).
3. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM`, and
   `TWILIO_WHATSAPP_FROM` in your environment.
4. The webhook validates Twilio's request signature by default
   (`TWILIO_VALIDATE_SIGNATURE=true`); set it to `false` only for local
   testing with a tool like `curl` or `ngrok` without real Twilio traffic.

### Wiring up the escalation cron

`POST /api/cron/escalate` with header `Authorization: Bearer $CRON_SECRET`
needs to be hit on a schedule (hourly is plenty, since escalation steps
are measured in days). Vercel Cron, a GitHub Actions scheduled workflow,
or a plain crontab + `curl` all work.

## Tests

```bash
npm run typecheck
npm test
```

The escalation schedule, document/checklist matching rules, and reminder
copy are all pure functions (`src/lib/escalation.ts`, `src/lib/matching.ts`,
`src/lib/messaging.ts`) covered by unit tests in `*.test.ts` next to each —
none of them require a database or network access to run.

## Known limitations / what's next

This is an MVP scaffold, not a finished product. Notable gaps:

- **No accountant auth.** The dashboard and CRUD APIs operate against a
  single seeded `Firm` (`src/lib/firm.ts`). Multi-tenant login (e.g.
  NextAuth + per-firm sessions) is the first thing to add before this
  could have more than one paying customer.
- **No UI for creating clients/checklists yet.** `POST /api/clients` and
  `POST /api/document-requests` work, but there's no form — you're
  scripting them or using the seed data.
- **`ESCALATED_TO_FIRM` is dashboard-only.** It doesn't yet email/text the
  accountant directly; it just stops auto-reminding the client and shows
  up as overdue on `/dashboard`. Wiring an actual notification (email via
  Resend/SES, or a text to the firm's own number) is a small follow-up.
- **Matching is deliberately conservative.** Below ~55% classifier
  confidence, or when a client has several open requests of the same
  document type and the period doesn't disambiguate them, the document
  goes to manual review rather than risking a wrong auto-match.
- **`next`'s bundled PostCSS has a couple of known advisories** as of this
  writing, fixed upstream in Next 16. Upgrading is a real App Router
  migration (async `cookies()`/`params`, etc.) and deliberately wasn't
  rushed in here without the ability to fully browser-test the result —
  worth doing as a dedicated follow-up before a public launch.
