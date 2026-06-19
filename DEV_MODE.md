# Development Mode Guidelines

You are coding incrementally.

Rules:
- Build one feature at a time, within the current phase only (see [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)).
- Never skip validation or auth for speed.
- Write minimal but correct implementations.
- Avoid premature optimization.
- If a decision has trade-offs, briefly note them in comments.
- Finish each weekly increment before starting the next. Resist scaffolding everything at once.

Always assume this code may go to production.

---

## The Development Loop

1. **Open an issue** (per `VERSION_CONTROL_GUIDE.md`) and branch from `dev`.
2. **Create the file** and write a comment header (template below).
3. **State the contract** for the unit you are about to write — restate it before coding.
4. **Implement** the smallest correct version.
5. **Test** — engines get Vitest; UI gets a manual check on multiple screen sizes.
6. **Commit** with a conventional message ending `Closes #N`.

---

## Engine-first discipline (the part that makes this trustworthy)

The intelligence (clash detection, availability, ingestion, configuration) lives in
**pure engines** under `src/engines/<name>/` in the backend. Before writing an engine:

- Restate its contract (inputs → outputs) in the test file first.
- Keep it pure: no HTTP, no Prisma, no `Date.now()` baked into the core — pass those in.
- Cover the cases that matter: the clean case, the deliberate-conflict case, and the
  config-driven exception (e.g. two `ONLINE` courses produce **zero** venue clashes).

This finally closes the existing "no tests" gap — start the test culture with the engines,
where it matters most.

---

## Security Leak Prevention (CRITICAL)

### Never do this
- Paste `.env` files, secrets, JWT signing keys, or database URLs.
- Commit credentials or tokens.

### Do this instead
Use placeholders:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api
JWT_SECRET=CHANGE_ME
DATABASE_URL=REPLACE_IN_PROD
```

Anything exposed to the browser must be deliberately prefixed `NEXT_PUBLIC_`. The JWT is
stored in an httpOnly cookie, never in `localStorage` and never logged.

---

## Directory Structure (keep it stable)

```
ish-rize-web/
  app/            # Next.js App Router (route groups by role)
  components/     # timetable/, ingestion/, ui/ — presentational + container split
  lib/            # api.ts (typed client), socket.ts, queryKeys.ts
  stores/         # Zustand stores (mirror mobile patterns)
  types/          # shared domain types (match backend engine contracts)
```

Backend engine work lands in `ish-rize-backend/src/engines/<name>/` with a sibling
`<name>.test.ts`. Routes/controllers stay thin and call engines.

---

## When the generated code goes wrong (it will)

If code:
- enforces a business rule in the client,
- hardcodes a university assumption,
- puts Prisma/HTTP inside an engine core,
- trusts client data, or skips auth/validation —

**delete it immediately** and re-anchor:

```typescript
// Reminder: backend is source of truth; config over code; engines stay pure.
// Re-implement per COPILOT_CONTEXT.md.
```

Then re-prompt with explicit constraints.

---

## File Header Template

Use at the top of every new non-trivial file:

```typescript
/**
 * Module: [name]
 * Layer:  [edge | engine | data | web-page | web-component | store | lib]
 * Contract: See API_CONTRACT.md (if an endpoint) / engine contract (if an engine)
 * Context:  See COPILOT_CONTEXT.md
 *
 * Purpose: [one line]
 *
 * Notes:
 * - [auth/role requirements, validation, or "pure — no side effects"]
 */
```

---

## Testing Mindset

- Write engine tests as you go, not after.
- Test the config-driven exceptions first (they are where universality lives).
- Test role violations on write endpoints.
- Test idempotency for ingestion (re-run = no duplicates).
- Test that real-time events stay scoped to their term room.

---

## Deployment Readiness

Every feature you build should be:
- Secure by default
- Validated on all inputs (server-side)
- Error-handled explicitly (loading/error states in the UI)
- Responsive on all screen sizes
- Testable (engines tested)
- Production-ready

No shortcuts. No "we'll fix it later."
