# IshRize Web — Implementation Plan

**Product:** IshRize Scheduling Intelligence (web client + backend scheduling layer)
**Status:** Phase 0 complete (this repo's foundation). Phases 1–5 are **gated** — each
starts only when the maintainer says so.
**Last updated:** 2026-06-19

---

## 0. How to use this document

This is the master plan. It is the single place that answers "what are we building, in
what order, and how do we know a phase is done."

- Work the phases **in order**. Do not scaffold everything at once.
- **Each phase ends in something runnable and verifiable.** A phase is not "done"
  because files exist — it is done when its verification checklist passes.
- **Phases are gated.** When a phase is finished, stop and report. The maintainer
  decides when the next phase begins.
- **`[DORMANT]`** — build the data model and the seam, but not the feature surface. Gated
  behind a feature flag and activated later.
- **`[VERTICAL-LATER]`** — a vertical-specific concern (church/event) we deliberately do
  **not** model now. The core is built so it slots in via configuration later, once a real
  customer in that vertical exists. Do not build it speculatively.
- Every line of code written now must serve the current phase, even though the
  architecture is designed for the long-term vision in §1.3.

---

## 1. Scope

### 1.1 What already exists (do not rebuild)

IshRize is a working QR-based attendance system:

- **`ish-rize-backend`** — Node.js + Express 5 + TypeScript + Prisma 7 + PostgreSQL.
  14 models, 57 REST endpoints, JWT + RBAC (`STUDENT`/`LECTURER`/`ADMIN`), rate limiting,
  audit logging, GDPR compliance. **The backend is the single source of truth.**
- **`ish-rize-mobile`** — React Native + Expo + Zustand. Attendance marking, the 4-layer
  anti-fraud proximity engine, and the private self-growth module.

The existing core loop is `User → Course → Enrollment → Session → AttendanceRecord → ProximityRecord`.

### 1.2 What we are building now

A **web application** (`ish-rize-web`, this repo) plus a **scheduling intelligence layer**
inside the existing backend. They share the existing database and auth. The mobile app
stays the *attendance + growth* tool; the web app becomes the *scheduling* tool.

| Web app (new) | Mobile app (existing) |
|---|---|
| Digitize & edit the master schedule | Start sessions, scan QR |
| Clash detection across units & cohorts | 4-layer proximity verification |
| Free-slot & free-room finder | Attendance + proximity scoring |
| Host load & extra-session booking | Private self-growth insights |
| Oversight utilization reports | Offline sync, anomaly detection |
| Schedule ingestion (PDF/Excel → structured data) | QR display & rotation |

### 1.3 The long-term vision (build with this in mind; do not build it yet)

This becomes a configurable platform **any scheduling organization** can adopt — a
university first, but churches, conferences, and event organizers next, on the *same
core*. Scheduling is the wedge. What makes the product special is the integrated
combination **schedule + verify presence + grow**, org-agnostic at the core, aimed at an
underserved market. Every decision now keeps that door open; every line written now serves
Phase 1 (UG's Mathematics Department).

---

## 2. The two-repo split

This product spans two repositories. **Extend, never fork.**

| Repo | Role in this product | What lands here |
|---|---|---|
| `ish-rize-backend` (existing) | Scheduling engines + schema + routes + sockets | Prisma models, pure engines (`src/engines/`), new routes, Socket.io, seeds, Vitest |
| `ish-rize-web` (this repo) | The Next.js client | App Router pages, TanStack grid, Zustand stores, typed API client, Socket.io client |

The web app talks to the backend over **REST + WebSocket** using the existing JWT auth.
There is no second database and no second source of truth.

---

## 3. Architectural principles (non-negotiable)

1. **The `Booking` is the aggregate root.** Every scheduling question reduces to a query
   over `Booking` rows. A booking is: *a host does an activity in a venue at a time slot,
   for a cohort.* That sentence is true for a lecture, a church service, and a conference
   talk alike. The atom is already org-neutral.

2. **Three layers of generality — know which one you are touching.** This is the core
   mental model:
   - **Kernel (truly universal, never varies per org):** `Booking`, `Venue`, `TimeSlot`,
     `Term`, and the Clash + Availability engines. They do not know what kind of org they
     serve.
   - **Org structure (the *shape* varies; the *pattern* is invariant):** every org is a
     tree of units containing activities, hosts, and audiences. University:
     College → Department → Course taught by a Lecturer for a student Group. Church:
     Region → Branch → Ministry led by a Pastor for a congregation Group. Generalized
     **now** as a configurable `OrgUnit` tree — it rests on a real invariant, not a guess.
   - **Vertical vocabulary & rules (genuinely different per org):** titles, activity kinds,
     calendar shapes. Expressed through `configProfile` and `kind` discriminators. Vertical
     *structure* is `[VERTICAL-LATER]` — added when a real church/event customer exists.

3. **Configuration over code.** Org differences are **data**, never `if (org === 'UG')`.
   A new org is onboarded by inserting configuration, not editing source. **The single
   most important principle.**

4. **Org-neutral names on new tables.** Every *new* table gets a vocabulary-neutral name
   (`Organization`, `OrgUnit`, `Host`, `Calendar`). The one exception is the existing,
   heavily-wired `Course` table (see Phase 1) — it keeps its name and gains a `kind`
   discriminator. Users never see raw table names; the UI renders vocabulary from config.

5. **Engines are pure domain services.** Domain objects in, results out — no HTTP, no
   Prisma inside core logic. Unit-testable in isolation.

6. **Extend, never fork.** Scheduling models join the *existing* schema; `Booking`
   connects to the existing `Session`. New fields on existing models are nullable.

7. **Feature flags gate dormant power.** Capture data now; activate surfaces later.

8. **Real-time is first-class.** The schedule is live, never a static export.

9. **Every mutation is audited** via the existing `AuditLog`.

10. **Idempotency where it matters** — ingestion upserts by `importKey`; re-runs never duplicate.

Backend layering, strictly separated: **Edge** (thin routes/controllers/sockets) →
**Engine** (pure, tested intelligence) → **Data** (Prisma; engines receive data, never
fetch it inside their algorithms).

---

## 4. Tech stack & rationale

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 15** (App Router, TS) | SSR for fast first load on slow networks; file routing; deploys free on Vercel |
| Styling | **Tailwind CSS 4** | Same mental model as mobile's NativeWind; mirror Foundation/Ascent tokens |
| State | **Zustand** | Same library and patterns as the mobile stores |
| Data fetching | **TanStack Query** | Caching, refetch, loading/error states, polling for the live feel |
| Grid | **TanStack Table** | The master schedule is a grid with filter/sort/group/inline-edit; headless |
| Real-time | **Socket.io** | "Everything updates live"; plugs into the existing Express server |
| Auth | **Existing JWT flow** | Reuse backend middleware; web stores the token in an httpOnly cookie |
| Deploy | **Vercel free tier** | $0, auto-deploy from GitHub, preview URL per PR |
| Tests (backend engines) | **Vitest** | Closes the "no tests" gap exactly where it matters |

**Deliberately excluded:** component libraries, GraphQL, SSG/static export, microservices, Redux.

---

## 5. Phases at a glance

| Phase | Title | Repo(s) | Gate |
|---|---|---|---|
| **0** | Repo foundation + docs | web | ✅ done |
| **1** | Configuration Engine + org-neutral schema | backend | ⏸ awaiting go |
| **2** | Booking core + Next.js grid read | backend + web | ⏸ |
| **3** | Clash + Availability engines + UI | backend + web | ⏸ |
| **4** | Real-time sync + audit | backend + web | ⏸ |
| **5** | Ingestion (Layers 1 & 2 + review) | backend + web | ⏸ |
| — | `[DORMANT]` Scheduling Engine (OR-Tools ILP) | backend | seam only |
| — | `[DORMANT]` Analytics Engine (utilization/seniority) | backend | data only |

**Phase 1's north star:** get **Dr. KD's Mathematics Department schedule live and used
weekly.** If a feature is not needed for that, it is not Phase 1.

---

## 6. Phase detail

Each phase = its own GitHub issue(s), branch, and PR per `VERSION_CONTROL_GUIDE.md`.
Multi-repo phases get one issue/branch/PR **per repo**.

### Phase 0 — Repo foundation + docs ✅

**Goal:** a governed, documented, CI-ready empty repo.

**Delivered:** git repo (`main`/`dev`), `.gitignore`, `.gitattributes`, `.github/`
(CI, PR template, Dependabot), `.githooks/pre-commit`, and the doc set. No application code.

---

### Phase 1 — Configuration Engine + org-neutral schema `[backend]`

**Goal:** make the system work for *any* organization via data, not code — and land the
org-neutral data model everything else reads from.

**Scope — schema (extend the existing `schema.prisma`):**
- New org-neutral models: `Organization` (with `orgType` + Zod-validated `configProfile`),
  self-referential `OrgUnit` tree (replaces College/Department), `Calendar` (was
  AcademicYear), `Term` (+`TermType` incl. `SEASON`), `Title`, `Host` (was Lecturer),
  `Venue` (+`VenueType` incl. `ONLINE`/`UNIT_ROOM`), `TimeSlot` (+`DayOfWeek`), `Booking`,
  `Group`, `GroupActivity` (was GroupCourse), `GroupHost` (was GroupLecturer),
  `FeatureFlag`.
- **The one naming exception:** the existing `Course` table **keeps its name** (it is wired
  into enrollments, sessions, attendance, 57 endpoints, the mobile app) but gains a `kind`
  discriminator (`"COURSE"` default; `"SERVICE"`/`"SESSION"` later), an optional `orgUnit`
  link, and `level`/`isElective`/`expectedSize`. A church's "Sunday Service" is a `Course`
  row with `kind="SERVICE"`; the UI shows "Service" from config and never exposes the table
  name.
- Add nullable `Session.bookingId` — the bridge seam to the attendance system.
- **All new fields on existing models are nullable.** One clean migration.

**Scope — Configuration Engine** (`src/engines/config/`):
- `configSchema.ts` (Zod for `configProfile`), `configEngine.ts` with pure resolvers:
  `resolveConfig`, `isFeatureEnabled`, `label(config, term)` (vocabulary lookup, e.g.
  `"activity" → "Course"|"Service"`), `validateBookingAgainstConfig`.
- `OrgConfig` carries: `orgType`, `unitLevels`, `termTypes`, `weekDays`, `timeSlots`,
  `titleRanks`, `activityKinds`, `vocabulary` map, `clashRules`, `features`.

**Scope — seeds + universality proof:**
- `prisma/seed/ug.seed.ts` — UG (`orgType: UNIVERSITY`): OrgUnit tree (College of Basic &
  Applied Sciences → Math Sciences / Physical Sciences / BA), two-semester calendar, UG
  periods, UG titles, Math Room 02/03/19 as unit-owned + an `Online` venue, vocabulary
  `{activity:"Course", host:"Lecturer", unit:"Department"}`.
- **Two test-only fixtures** that prove universality through the *same* engines:
  `fixtureChurch.ts` (`orgType: CHURCH`, Region→Branch→Ministry, Sun-based week, pastoral
  titles, vocabulary `{activity:"Service", host:"Pastor"}`) and `fixtureTrimesterUni.ts`
  (a differently-shaped university). If all three pass with **zero code changes**, the
  system is genuinely dynamic.

**Scope — tests:** introduce Vitest; full Configuration Engine coverage across all three configs.

**Verify:** `npx prisma migrate dev` runs clean; existing code/rows unaffected; config
tests green for UG, the church fixture, **and** the trimester fixture — all through one
code path.

---

### Phase 2 — Booking core + Next.js grid read `[backend + web]`

**Goal:** the seeded UG schedule renders live in the browser, with labels driven by config.

**Scope (backend):** `Booking` CRUD; read-optimized `GET /schedule?termId=&orgUnitId=`
returning grid-shaped data; supporting list endpoints (`/venues`, `/hosts`, `/activities`,
`/groups`, `/terms`, `/organizations/:id/config`).

**Scope (web):** scaffold Next.js 15 + Tailwind 4 (Foundation/Ascent tokens) + Zustand +
TanStack Query/Table; typed API client (`lib/api.ts`); `lib/vocab.ts` (config → UI labels);
read-only `ScheduleGrid` (rows = `TimeSlot`s by day, columns = org units/venues, dense
`BookingCell` = host initials + activity code + room) with **client-side** `FilterBar`
(unit / level / venue / kind). Visible labels ("Course"/"Service", "Lecturer"/"Pastor")
come from config vocabulary.

**Verify:** seeded schedule renders; filtering is instant (no round-trip); swapping the
seeded config's vocabulary changes the labels without code changes.

---

### Phase 3 — Clash + Availability engines + UI `[backend + web]`

**Goal:** clashes are visible on the grid; free rooms/slots are findable.

**Scope (backend):**
- **Clash Detection Engine** — `detectClashes(bookings, groups, config)` returning
  `VENUE` / `HOST` / `GROUP` clashes with human-readable `detail`. `ONLINE` venues skip
  room-conflict (config-driven). Group clash names *which two activities* collide.
- **Availability Engine** — `freeVenues(slot, …, { minCapacity, orgUnitId })`,
  `freeSlotsForGroup(group, …)`, `freeSlotsForVenue(venueId, …)`.
- Both pure, both fully Vitest-tested. Endpoints: `GET /clashes`, `GET /availability/*`.
- **Payoff of the neutral design:** these engines need zero changes to serve a church or
  event — they operate on bookings, venues, slots, and hosts, none of which carry
  university assumptions.

**Scope (web):** `ClashBadge` overlay; a Clashes report view; a Free-finder screen.

**Verify:** a deliberately-clashing seed lights up the grid and names both activities; the
free-finder returns correct rooms/slots; two `ONLINE` activities in one slot yield **zero**
venue clashes.

---

### Phase 4 — Real-time sync + audit `[backend + web]`

**Goal:** a change by one coordinator appears instantly for every viewer, and every change
is attributable.

**Scope (backend):** Socket.io on the existing Express app; rooms `term:<termId>` (optionally
`unit:<orgUnitId>`); JWT-authed; emit `booking:changed` on every mutation; wrap every
booking mutation in an `AuditLog` write.

**Scope (web):** `lib/socket.ts` client; optimistic edits; on `booking:changed`, invalidate
the affected TanStack Query key and re-render just that cell. Coordinators/admins write;
lower roles get a read-only grid.

**Verify:** two windows in the same term stay in sync; a client in a different term receives
nothing; mutations appear in `AuditLog`.

---

### Phase 5 — Ingestion (Layers 1 & 2 + review) `[backend + web]`

**Goal:** import an existing schedule safely, with a human approving before anything persists.

**Scope (backend):** Ingestion Engine — `detectFormat`, `ingest`, `commitDraft`.
- **Layer 1 (Structured)** `.xlsx`/`.csv` — direct parse. Build fully.
- **Layer 2 (Clean PDF)** text-layer table extraction — build fully.
- **Layer 3 (OCR/scanned)** — **stub seam only**: return "manual entry required"; wire the
  routing so PaddleOCR (then paid vision AI, billed to the client) slots in cleanly.
- **Idempotent `commitDraft`** — upsert on `importKey` (hash of term+course+slot+venue);
  re-import updates in place, never duplicates.

**Scope (web):** upload → `ReviewTable` showing parsed rows + warnings, inline fixes, then
commit. **The assistant proposes; the human disposes** — never auto-commit.

**Verify:** re-importing the same file produces **no** duplicates; the review screen flags a
deliberately-malformed row before commit.

**After Phase 5:** put it in front of Dr. KD; get the Mathematics Department using it weekly.
*Only after real weekly use* do we consider the next product phase.

---

## 7. Dormant seams (build the seam + data, not the surface)

- **`[DORMANT]` Scheduling Engine** — auto-generate clash-free schedules via graph coloring
  / ILP (Google OR-Tools): activities = nodes, shared resources = conflict edges, slots =
  colors. Ship only `src/engines/scheduling/README.md`. Gated behind `feature: auto_scheduling`.
- **`[DORMANT]` Analytics Engine** — utilization & seniority analytics. `Title.rank` and
  `Term` boundaries already capture the data. Gated behind `feature: analytics_dashboard`.

---

## 8. What NOT to build yet (the discipline section)

Build seams, gate surfaces, and resist vertical structure until a real customer needs it:

- ❌ Auto-scheduling solver — seam only.
- ❌ Analytics dashboards — data captured only.
- ❌ Host self-service surfaces — later product phase.
- ❌ Member-facing surfaces — later product phase.
- ❌ **Church / event vertical structure — `[VERTICAL-LATER]`.** The core is already
  org-neutral via `OrgUnit` + `kind` + config; add a vertical's *specific* fields
  (liturgical seasons, ticketing, …) only when that customer is real. Do not model them now.
- ❌ Multi-organization onboarding UI — the *engine* is universal via config; the *surface* waits.
- ❌ Payments, hardware, the broader vision.

The architecture makes all of these cheap to add later **because** it is built
configuration-first, engine-first, and org-neutral. Ship the wedge; earn the next phase.

---

## 9. Definition of done

**Per phase:** verification checklist passes; engines (where present) have green Vitest
tests; CI green; changes landed via issue → branch → PR → squash-merge per
`VERSION_CONTROL_GUIDE.md`; no AI co-author trailer; no secrets committed.

**Global quality bar (every phase):** secure by default, all inputs validated, explicit
error handling, backend is the source of truth, TypeScript strict (no `any`), responsive on
all screen sizes, Foundation/Ascent theming with no hardcoded colors, and **no hardcoded
org assumptions** — when tempted, move it to config.
