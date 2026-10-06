# LedgerPay (Digital Layaway)

A mobile-first web app that replaces the paper notebook artisans use to track
layaway instalments — tailors, seamstresses, furniture makers, and other
small-business owners who sell items on a pay-over-time basis.

An artisan creates a record per client and item, logs each instalment as it
comes in, and the app calculates the running balance and generates a
verifiable receipt — on screen, as a PDF, or shared straight to WhatsApp.

## Stack

- **React 18 + TypeScript**, built with **Vite**
- **Supabase** — Postgres, Auth, and Row Level Security (no separate backend
  server; the database itself is the API and the security boundary)
- **Tailwind CSS** for styling
- **React Hook Form + Zod** for form validation
- **jsPDF** for receipt generation
- **Vitest** for unit and integration tests

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

Copy the example env file and fill in your project's credentials (found in
your Supabase dashboard under Project Settings → API):

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

`.env` is gitignored — never commit real credentials. The anon key is safe to
expose in a browser bundle by design; it has no access beyond what Row Level
Security explicitly grants per authenticated user.

### 3. Apply the database schema

Run the SQL files in `supabase/migrations/` **in filename order** against
your Supabase project, either by pasting each into the Supabase SQL Editor or
via the Supabase CLI:

```bash
supabase db push
```

This creates the `profiles`, `layaway_profiles`, and `installments` tables,
enables Row Level Security on all three, and installs the `log_payment` and
`void_installment` functions that payments must go through (direct inserts
and hard deletes on `installments` are intentionally not permitted — see
[Security](#security) below).

### 4. Run the app

```bash
npm run dev
```

## Scripts

| Command                   | Purpose                                                  |
| -------------------------- | --------------------------------------------------------- |
| `npm run dev`               | Start the Vite dev server                                  |
| `npm run build`              | Production build                                           |
| `npm run preview`            | Preview the production build locally                       |
| `npm run typecheck`          | TypeScript, no emit                                         |
| `npm run lint`                | ESLint                                                      |
| `npm test`                    | Unit tests (fast, no network) — pure logic in `src/lib/`     |
| `npm run test:watch`          | Unit tests in watch mode                                    |
| `npm run test:integration`    | Integration tests against your live Supabase project (RLS, RPC atomicity — see below) |

## Testing

Unit tests (`src/lib/*.test.ts`) cover the pure logic — form validation
boundaries, currency/date formatting, error-message mapping, WhatsApp phone
normalization. No network required.

Integration tests (`tests/integration/*.test.ts`) run against your real
Supabase project — Row Level Security can only be proven against real
Postgres, not a mock. They cover:

- Cross-tenant isolation (one artisan cannot read, update, or delete another
  artisan's data)
- Ownership checks on the `log_payment` and `void_installment` RPCs
- Overpayment and invalid-amount rejection
- The total-cost reduction guard
- Soft-delete behavior (a removed payment is voided, not erased)
- **Concurrency**: two simultaneous payments that would jointly overpay are
  fired at once, to prove the atomic check is real under an actual race, not
  just in theory

They create their own test accounts (tagged with an
`@integration-test.ledgerpay.invalid` email domain for easy identification)
and use only the anon key — the same credential the shipped app uses — so
they exercise the real security boundary rather than a privileged bypass.
They do **not** delete the accounts they create afterward, since the anon key
alone can't remove `auth.users` rows; run these against a development
project, not production, or clean up test accounts periodically via the
Supabase SQL editor.

## Security

The browser is never trusted. Route guards in the React app are UX, not
security — the actual boundary is Postgres Row Level Security, keyed off
`auth.uid()` on every request.

- Every table has RLS enabled; an artisan can only see their own clients,
  installments, and profile.
- Payments cannot be inserted directly — `installments` has no client-facing
  `INSERT` policy at all. The only way in is the `log_payment` RPC, which
  atomically re-checks ownership, rejects invalid or overpaying amounts, and
  generates the receipt number server-side.
- Removing a payment doesn't delete it. `void_installment` marks it voided
  (with a timestamp and optional reason) instead of erasing the row, so the
  record a receipt refers to can't be unilaterally made to disappear.
- Editing a client's total cost can't be dropped below what's already been
  paid — enforced by a database trigger, not just the UI.

See `supabase/migrations/` for the full schema and policies, in order.

## Project structure

```
src/
  components/   Reusable UI (forms, modals, layout, auth guards)
  pages/        Route-level screens
  hooks/        Data-fetching hooks (Supabase queries)
  lib/          Pure logic: validation schemas, formatting, error mapping
  context/      Auth state
  types/        Shared TypeScript types
supabase/
  migrations/   Full schema history, applied in filename order
tests/
  integration/  Tests that run against a real Supabase project
```
