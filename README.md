# DocChaser

An AI document chaser for accountants, bookkeepers, and paralegals.
Clients text in documents over SMS/WhatsApp — a photo of a W-2, a PDF bank
statement, a snapshot of a receipt — DocChaser classifies each one with a
vision + LLM pipeline, matches it against the firm's checklist for that
client, and automatically escalates reminders for anything still missing.

**No client login. No portal. No app.** The entire client-facing workflow
is: reply to a text message with a photo.

Target user: a solo or 2–3 person US-based bookkeeping/tax-prep practice.
Priced at $29/mo flat, unlimited clients, 14-day trial — see the full
product rationale in the project's PRD.

## How it works

1. The accountant signs up (`/signup`), adds a client, and applies a
   starter checklist template (tax season, monthly bookkeeping, or new
   client onboarding) or adds items one at a time.
2. The accountant sends the checklist — this fires one opening text to the
   client listing everything outstanding, with the carrier-required
   STOP/opt-in language baked in (`src/lib/messaging.ts`).
3. The client texts a photo/PDF back to the firm's Twilio number over SMS
   or WhatsApp. Twilio posts it to `POST /api/webhooks/twilio`.
4. The webhook downloads the media, sends it to Claude's vision model
   (`src/lib/classifier.ts`) to classify document type, period, and the
   entity printed on it, then tries to match it to an open checklist item
   for that client (`src/lib/matching.ts`).
5. A confident match closes out the checklist item and replies to the
   client confirming receipt. A low-confidence or ambiguous match instead
   gets a specific, client-facing reason back (e.g. "this looks like a
   2023 statement, not 2024") and lands in the firm's review queue.
6. A cron-triggered endpoint (`POST /api/cron/escalate`) walks every open
   checklist item and fires the next reminder in the escalation schedule
   (`src/lib/escalation.ts`): gentle → firm → urgent → flagged for the
   accountant to call personally. Reminders skip any client the accountant
   has paused, and nothing escalates until the *previous* message actually
   sent — a transient Twilio failure doesn't silently skip a step.
7. The accountant can override anything by hand at any time: mark an item
   received/waived/reopened, or pause automated reminders for one client.

## Data model

See `prisma/schema.prisma`. Core entities: `Firm` (one `User` login per
firm) → `Client` → `DocumentRequest` (a checklist item) and
`IncomingDocument` (something a client texted in, classified and
optionally matched to a request, with a `flagReason` when it wasn't a
clean match). `ReminderLog` records every escalation message sent.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Prisma + PostgreSQL
- NextAuth (credentials provider) for accountant login
- `@anthropic-ai/sdk` for vision-based document classification
- `twilio` for sending/receiving SMS and WhatsApp messages

## Getting started

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, NEXTAUTH_SECRET, ANTHROPIC_API_KEY, TWILIO_*
npm run db:push        # creates tables in your Postgres database
npm run db:seed        # seeds a demo firm, login, two clients, and a checklist
npm run dev
```

Visit `http://localhost:3000` for the landing page, `/signup` to create a
new firm, or `/login` with the seeded demo account
(`aiexperiment1999@gmail.com` / `password123`, printed by the seed script)
to see `/dashboard` with real data.

Any Postgres works for `DATABASE_URL` — local, Supabase, Neon, Railway,
Vercel Postgres, etc. To run one locally:

```bash
createdb docchaser
# DATABASE_URL="postgresql://<user>@localhost:5432/docchaser"
```

Generate `NEXTAUTH_SECRET` with `openssl rand -base64 32`.

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
5. Register 10DLC before public launch — US carriers require it for
   business SMS traffic, and it's a manual carrier process this codebase
   can't do for you.

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

The escalation schedule, checklist matching rules, checklist templates,
and message copy are all pure functions (`src/lib/escalation.ts`,
`src/lib/matching.ts`, `src/lib/templates.ts`, `src/lib/messaging.ts`,
`src/lib/classifier.ts`'s `parseClassification`) covered by unit tests in
`*.test.ts` next to each — none of them require a database or network
access to run.

## Known limitations / what's next

This is an MVP, not a finished, launch-ready product. Notable gaps,
scoped against the project's PRD:

- **No billing.** Signup creates a firm and login with no Stripe checkout
  or trial enforcement yet — every account behaves as if already paid.
  Wiring Stripe Checkout + Customer Portal (per the PRD) needs a live
  Stripe account to build against and test.
- **No per-firm phone provisioning.** Every firm currently shares one
  Twilio number set via `TWILIO_SMS_FROM`/`TWILIO_WHATSAPP_FROM`. The PRD
  calls for auto-provisioning a dedicated number per firm on signup via
  the Twilio API — straightforward to add, but untested here since it
  requires a live Twilio account with number-provisioning permissions.
- **WhatsApp Business API approval isn't handled.** The code sends over
  WhatsApp if a client's `preferredChannel` is set to it, but there's no
  onboarding flow for a firm's own WABA approval — per the PRD, launch
  SMS-only and add WhatsApp once a firm's approval clears.
- **Voice notes are received but not transcribed.** The webhook detects
  audio attachments and flags them for manual review with a clear message
  to the client, rather than crashing — but there's no Whisper/transcription
  step yet, so voice notes never auto-classify.
- **`ESCALATED_TO_FIRM` is dashboard-only.** It doesn't yet email/text the
  accountant directly; it just stops auto-reminding the client and shows
  up as overdue on `/dashboard`.
- **Matching is deliberately conservative.** Below ~55% classifier
  confidence, or when a client has several open requests of the same
  document type and the period doesn't disambiguate them, the document
  goes to manual review rather than risking a wrong auto-match.
- **Single login per firm, no team seats.** Matches the PRD's target user
  (solo/small practice) — multi-seat firms are explicitly out of scope.
- **`next`'s bundled PostCSS has a couple of known advisories** as of this
  writing, fixed upstream in Next 16. Upgrading is a real App Router
  migration and deliberately wasn't rushed in here without the ability to
  fully browser-test the result.
