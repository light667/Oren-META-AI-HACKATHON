# Oren

AI assistants for small businesses in French-speaking Africa. First market: Lomé, Togo.

## The problem

A small restaurant in Lomé cannot afford a full-time person to answer customer messages. Customers ask the same questions all day — the menu, prices, opening hours, delivery — and orders get lost between phone calls, notebooks and chat threads. Generic chatbots do not help: they invent prices, cannot take a real order, and do not know when to hand over to a human.

## The solution

Oren gives a business its own assistant, live in under an hour. The assistant answers customers in French from the business's real information — and **acts**: it composes an order, shows a code-computed summary, waits for the customer's explicit confirmation, then sends the order to the owner's live dashboard. Setup is multimodal: a photo of the paper menu and a voice message become a verified catalog. No app to install for customers: a link or a QR code is enough.

## Platform architecture

Oren is a multi-business platform, not a single restaurant bot. The restaurant is the first vertical slice, built on the full platform architecture:

- **Multi-tenancy first.** Every business row carries a `business_id`; PostgreSQL Row Level Security is enabled on every table, and automated tests prove one business can neither read nor write another's data. Businesses declare a `business_type` and activate **capabilities**.
- **Capability tool registry.** Each capability (today: `catalog_orders`; later: `bookings`, `appointments`) declares its tools with Zod schemas, read/write flags and confirmation requirements. The assistant only ever receives the tools of the capabilities enabled for that business. Adding a trade means adding configuration, not rewriting the core.
- **Channel-independent core.** `core/handleMessage` knows nothing about channels. A channel is an adapter (in: normalize the message; out: format the reply). Only the `web` adapter is built today; Telegram and WhatsApp adapters will plug in without touching the core.
- **Replaceable modules** behind small interfaces: `LlmProvider` (Meta Model API: Muse Spark for chat/vision, Muse Voice Transcribe for voice), `PaymentProvider` (cash on delivery / on pickup, plus a fake test provider), `NotificationProvider` (realtime dashboard, Web Push, e-mail), `SmsProvider` (interface only).

Stack: Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui, Supabase (PostgreSQL, RLS, Realtime, email-link auth, Storage), Zod validation, Vitest. Prices are integer FCFA — never decimals, never negative. No vector database: a restaurant catalog fits in the model context.

## What makes it different

- **Code decides, the model proposes.** Prices, totals, quantities, delivery fees and statuses are always computed or validated by code. Model output is never a source of truth for money.
- **Verified confirmation.** No write happens without a code-computed summary and the customer's explicit agreement bound to that exact summary, through a single-use confirmation token. The "Je confirme" button sends a structured action with the token — it never relies on interpreting free text.
- **Multimodal onboarding.** A menu photo (vision) and a voice message (transcription) are extracted into a draft that the owner verifies line by line; uncertain readings are flagged, never invented. Measured end to end: a real Lomé menu photo plus a voice message became a published restaurant in **45.8 seconds**.
- **Extracted content is data, never instructions.** Text from an image, a voice note or a customer message cannot change the assistant's rules or trigger unplanned tools — this is tested, including a photo containing "ignore tes consignes".
- **Cost guardrails.** Public chat routes are rate-limited per session/minute, per IP/minute and per business/day (environment-tunable) before any model call; fast tests and live Meta API tests are separate commands.

## Run it locally

```bash
npm install
cp .env.example .env.local   # fill in MODEL_API_KEY (dev.meta.ai dashboard) and Supabase keys
npm run dev                  # http://localhost:3000
```

Database: paste `supabase/apply_all.sql` then `supabase/seed.sql` into the Supabase SQL Editor, or apply the migrations in `supabase/migrations/`. Verify a remote project with `npm run check:remote`.

```bash
npm test            # fast tests only — no Meta Model API calls
npm run test:live   # REAL Meta Model API calls (core + onboarding) — run before important commits only
npm run test:db     # database/RLS tests (local embedded PostgreSQL)
npm run build       # production build
npm run smoke       # 5 real Meta calls: text, tool use, JSON, image, audio
```

## Built during the hackathon

**All code in this repository was written during the event, starting October 26, 2026**, for the Meta hackathon (submission deadline November 4, 2026, 21:00 ET). The commit history shows the work as it happened. No code was copied from any earlier project, and the repository contains no secrets (`.env*` is git-ignored; `.env.example` documents every variable).

Explicitly **NOT built** — interfaces and extension points exist, implementations do not:

- Real Mobile Money payments (only cash on delivery/pickup and a fake test provider)
- SMS (including phone verification)
- Telegram and WhatsApp API channels (only a `wa.me` link button)
- Bookings and appointments capabilities (hotels, salons, invoicing, admin)

Roadmap after the hackathon: Togo pilot (November 2026), then Mobile Money, SMS, Telegram, WhatsApp and additional trades on the same capability architecture.
