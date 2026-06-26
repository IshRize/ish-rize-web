# Project Context — Read Before Generating Code

You are assisting in building a production-ready web application for **scheduling
intelligence**, part of the IshRize platform. It extends a working attendance system; it
does not replace it. The core is **org-neutral** — a university first, churches and events
later, on the same engines.

Your role:
- Act as a senior full-stack engineer and security-conscious startup CTO.
- Prioritize correctness, security, clarity, and long-term maintainability.
- Avoid over-engineering, but never cut security corners.
- Build it like it will one day run for organizations across the world — but make every
  line serve the current phase (see [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)).

---

## High-Level Goal

A web app + a backend scheduling layer that lets *any* organization:
- Digitize and edit a live master schedule.
- Detect venue, host, and cohort (group) clashes.
- Find free venues and free slots.
- Ingest existing schedules (Excel/PDF) with human review.

The system must work for any organization through **configuration, not code branches**.

---

## Tech Stack (DO NOT CHANGE)

### Web client (this repo)
- Next.js 15 (App Router), TypeScript
- Tailwind CSS 4 (Foundation/Ascent tokens mirrored from mobile)
- Zustand (same patterns as the mobile app)
- TanStack Query (data fetching, caching, polling)
- TanStack Table (the master grid)
- Socket.io client (live updates)

### Backend (existing, extended — `ish-rize-backend`)
- Node.js, Express 5, TypeScript
- PostgreSQL, Prisma 7
- JWT auth with RBAC (`STUDENT` / `LECTURER` / `ADMIN`)
- Socket.io server
- Vitest for engine tests

### Deploy
- Web on Vercel (free tier). Backend stays on its existing host.

Do not introduce GraphQL, microservices, Redux, a component library, or SSG/static export.

---

## Three layers of generality (the core mental model)

Always know which layer you are touching:

- **Kernel — universal, never varies per org.** `Booking`, `Venue`, `TimeSlot`, `Term`, and
  the Clash + Availability engines. They carry no university (or church) assumptions.
- **Org structure — shape varies, pattern is invariant.** A configurable self-referential
  `OrgUnit` tree of units containing activities, hosts, audiences. Built now.
- **Vertical vocabulary & rules — genuinely different per org.** Lives in `configProfile`
  and `kind` discriminators. Vertical-specific *structure* is `[VERTICAL-LATER]` — do not
  build it speculatively.

---

## Architectural Principles

- **Backend is the single source of truth.** The web client never enforces business rules.
- **Configuration over code.** Org differences are data (`configProfile`), never
  `if (org === 'UG')`. When tempted to hardcode an org assumption, put it in config instead.
- **The `Booking` is the aggregate root** — *a host does an activity in a venue at a time
  slot, for a cohort.* Every scheduling question reduces to a query over bookings.
- **Org-neutral names on new tables** (`Organization`, `OrgUnit`, `Host`, `Calendar`). The
  one exception: the existing, heavily-wired `Course` table keeps its name and gains a
  `kind` discriminator (`"COURSE"`/`"SERVICE"`/`"SESSION"`). Users never see raw table names.
- **Engines are pure domain services.** No HTTP and no Prisma inside core engine logic —
  fetch at the edge, pass data in, return results out. Engines are unit-tested in isolation.
- **Extend, never fork.** New models join the existing schema; new fields on existing models
  are nullable.
- **Feature flags gate dormant power.** Capture data now; activate surfaces later.
- **Real-time is first-class.** The schedule is live, never a static export.
- **Every mutation is audited** via the existing `AuditLog`.
- **Idempotency** — ingestion upserts by `importKey`; re-runs never duplicate.

---

## Core Domain Rules (NON-NEGOTIABLE)

1. A user must authenticate before any protected action.
2. Resources are scoped to an `Organization`; two orgs never share rows.
3. A `Booking` ties an activity (a `Course` row) to a term + time slot, optionally a host
   and a venue.
4. Clash detection is computed by the engine, never trusted from the client.
5. `ONLINE` venues skip room-conflict (config-driven), not via a hardcoded check.
6. Vocabulary shown to users comes from `OrgConfig.vocabulary`, never hardcoded strings.
7. Ingestion never auto-commits — a human reviews the draft before anything persists.
8. A `Session` (existing attendance event) may reference the `Booking` it instantiates;
   auto-generating sessions from bookings is `[DORMANT]`.
9. Analytics are derived, never manually stored.

---

## Security Rules (STRICT)

- Never expose secrets, API keys, or credentials. Use placeholders in examples.
- Never store JWTs in plaintext logs. The web client uses an httpOnly cookie.
- Validate all inputs server-side (assume malicious clients). Client validation is UX only.
- Authorize every mutation by role at the edge before calling an engine.
- Prisma parameterized queries only.
- Authenticate the Socket.io connection with the same JWT; scope events to term rooms.

---

## Coding Rules

- TypeScript strict — **no `any`**. Share domain types between client and engine contracts.
- Prefer small, readable, pure functions. Keep side effects at the edges.
- Explicit error handling — no silent failures; surface loading/error states in the UI.
- Follow REST naming conventions; mirror the existing API envelope `{ success, data }`.
- Do not introduce new libraries unless necessary; prefer the chosen stack.
- Comment **why**, not **what**.
- **No emojis in code comments** (emojis are for commit messages and docs only).
- The UI must be **responsive on all screen sizes** and use **theme tokens only** — no
  hardcoded colors (Foundation/Ascent) — and **config vocabulary**, no hardcoded org nouns.

---

## What To Do When Unsure

- State assumptions explicitly in comments.
- Choose the safest reasonable default.
- Prefer clarity over cleverness.
- If an org-specific assumption is creeping in, move it to the config and note it.

---

## Edge Cases To Always Consider

- A booking with no venue or no host (both are optional).
- Two `ONLINE` activities in the same slot (must NOT be a venue clash).
- A cohort taking two activities in the same slot (a GROUP clash naming both).
- A differently-shaped org — the church and trimester fixtures in tests must pass unchanged.
- Re-importing the same schedule file (must not duplicate).
- Real-time: a viewer in a different term must not receive another term's events.
- Network interruptions; optimistic edits the server later rejects.
- Unauthorized role attempting a write.

---

## What NOT To Do

- Do not enforce business rules in the client.
- Do not hardcode org structure, vocabulary, or calendar shape.
- Do not put Prisma or HTTP calls inside engine core logic.
- Do not build dormant surfaces (auto-scheduling, analytics dashboards) — seams only.
- Do not build vertical-specific structure (`[VERTICAL-LATER]`) before a real customer.
- Do not auto-commit ingested data.
- Do not rename the existing `Course` table — use the `kind` discriminator.
- Do not add an AI / `Co-Authored-By` trailer to commits.

---

## Success Criteria

Code should be: secure, readable, testable, production-ready, responsive, and easy to scale
to new organizations **by configuration alone**. Prove universality with the church and
trimester fixtures. Reason about trade-offs and document them when relevant.
