# IshRize Web — Implementation Plan

**Product:** IshRize Timetable Intelligence (web client + backend timetable layer)
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
- Anything marked **`[DORMANT]`** gets its data model and seam built, but **not** its
  feature surface. It is gated behind a feature flag and activated later.
- Every line of code written now must serve the current phase, even though the
  architecture is designed for the long-term vision in §1.3.

---

## 1. Scope

### 1.1 What already exists (do not rebuild)

IshRize is a working QR-based university attendance system:

- **`ish-rize-backend`** — Node.js + Express 5 + TypeScript + Prisma 7 + PostgreSQL.
  14 models, 57 REST endpoints, JWT + RBAC (`STUDENT`/`LECTURER`/`ADMIN`), rate
  limiting, audit logging, GDPR compliance. **The backend is the single source of truth.**
- **`ish-rize-mobile`** — React Native + Expo + Zustand. Attendance marking, the
  4-layer anti-fraud proximity engine, and the private student self-growth module.

The existing core loop is `User → Course → Enrollment → Session → AttendanceRecord → ProximityRecord`.

### 1.2 What we are building now

A **web application** (`ish-rize-web`, this repo) plus a **timetable intelligence layer**
inside the existing backend. They share the existing database and auth. The mobile app
stays the *attendance + growth* tool; the web app becomes the *timetable* tool.

| Web app (new) | Mobile app (existing) |
|---|---|
| Digitize & edit the master timetable | Start sessions, scan QR |
| Clash detection across departments & cohorts | 4-layer proximity verification |
| Free-slot & free-room finder | Attendance + proximity scoring |
| Lecturer teaching load & extra-class booking | Student self-growth insights |
| Academic-affairs utilization reports | Offline sync, anomaly detection |
| Timetable ingestion (PDF/Excel → structured data) | QR display & rotation |

### 1.3 The long-term vision (build with this in mind; do not build it yet)

This becomes a configurable platform any university can adopt. The timetable is the
**wedge**. Every decision now keeps that door open; every line written now serves Phase 1.

---

## 2. The two-repo split

This product spans two repositories. **Extend, never fork.**

| Repo | Role in this product | What lands here |
|---|---|---|
| `ish-rize-backend` (existing) | Timetable engines + schema + routes + sockets | Prisma models, pure engines (`src/engines/`), new routes, Socket.io, seeds, Vitest |
| `ish-rize-web` (this repo) | The Next.js client | App Router pages, TanStack grid, Zustand stores, typed API client, Socket.io client |

The web app talks to the backend over **REST + WebSocket** using the existing JWT auth.
There is no second database and no second source of truth.

---

## 3. Architectural principles (non-negotiable)

1. **The `Booking` is the aggregate root of timetabling.** Every timetable question
   reduces to a query over `Booking` rows. Design around this atom.
2. **Configuration over code.** Universities differ in structure, vocabulary, time
   blocks, and calendar shape. These differences are **data** (a validated
   `configProfile`), never `if (university === 'UG')` branches. A new university is
   onboarded by inserting configuration, not editing source. **This is the most
   important principle in the system.**
3. **Engines are pure domain services.** Each engine takes domain objects in and
   returns results out — no HTTP, no Prisma inside the core logic. Fetch at the edge,
   pass data in. This makes every engine unit-testable in isolation.
4. **Extend, never fork.** Timetable models join the *existing* Prisma schema;
   `Booking` connects to the existing `Session`.
5. **Feature flags gate dormant power.** Capture the data from day one; activate the
   surface when the institution is ready.
6. **Real-time is first-class.** The timetable is live, never a static export.
7. **Every mutation is audited.** Reuse the existing `AuditLog`.
8. **Idempotency where it matters.** Ingestion must be safely re-runnable (upsert by
   `importKey`); re-importing the same timetable never duplicates bookings.

Backend layering, strictly separated:

- **Edge** (routes, controllers, socket handlers) — translate HTTP/WS ↔ domain calls. Thin.
- **Engine** (domain services) — all intelligence. Pure where possible. Fully tested.
- **Data** (Prisma) — persistence only. Engines receive data; they do not fetch it.

---

## 4. Tech stack & rationale

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 15** (App Router, TS) | SSR for fast first load on slow networks; file routing; API routes if needed; deploys free on Vercel |
| Styling | **Tailwind CSS 4** | Same mental model as mobile's NativeWind; mirror the Foundation/Ascent tokens |
| State | **Zustand** | Same library and patterns as the 12 mobile stores |
| Data fetching | **TanStack Query** | Caching, refetch, loading/error states, polling for the live feel |
| Grid | **TanStack Table** | The master timetable is a grid with filter/sort/group/inline-edit; headless, Tailwind-styled |
| Real-time | **Socket.io** | "Everything updates live"; plugs into the existing Express server |
| Auth | **Existing JWT flow** | Reuse backend middleware; web stores the token in an httpOnly cookie |
| Deploy | **Vercel free tier** | $0, auto-deploy from GitHub, preview URL per PR; backend stays where it is |
| Tests (backend engines) | **Vitest** | Closes the "no tests" gap exactly where it matters — the engines |

**Deliberately excluded:** component libraries (full control of grid UX), GraphQL (REST
works), SSG/static export (timetable is live data), microservices, Redux.

---

## 5. Phases at a glance

| Phase | Title | Repo(s) | Gate |
|---|---|---|---|
| **0** | Repo foundation + docs | web | ✅ done |
| **1** | Configuration Engine + schema extension | backend | ⏸ awaiting go |
| **2** | Booking core + Next.js grid read | backend + web | ⏸ |
| **3** | Clash + Availability engines + UI | backend + web | ⏸ |
| **4** | Real-time sync + audit | backend + web | ⏸ |
| **5** | Ingestion (Layers 1 & 2 + review) | backend + web | ⏸ |
| — | `[DORMANT]` Scheduling Engine (OR-Tools ILP) | backend | seam only |
| — | `[DORMANT]` Analytics Engine (utilization/seniority) | backend | data only |

**Phase 1's north star:** get **Dr. KD's Math Department timetable live and used weekly.**
If a feature is not needed for that, it is not Phase 1.

---

## 6. Phase detail

Each phase = its own GitHub issue(s), branch, and PR per `VERSION_CONTROL_GUIDE.md`.
Multi-repo phases get one issue/branch/PR **per repo**.

### Phase 0 — Repo foundation + docs ✅

**Goal:** a governed, documented, CI-ready empty repo.

**Delivered:** git repo (`main`/`dev`), `.gitignore`, `.gitattributes`, `.github/`
(CI, PR template, Dependabot), `.githooks/pre-commit`, and the doc set
(`README`, this plan, `ARCHITECTURE`, `API_CONTRACT`, `COPILOT_CONTEXT`, `DEV_MODE`,
`CONTRIBUTING`, `VERSION_CONTROL_GUIDE`). No application code.

**Verify:** repo is on `main`; docs render; CI workflow is syntactically valid.

---

### Phase 1 — Configuration Engine + schema extension `[backend]`

**Goal:** make the system work for *any* university via data, not code — and land the
data model everything else reads from.

**Scope:**
- Extend `schema.prisma` with: `University`, `AcademicYear`, `Term` (+`TermType`),
  `College`, `Department`, `Title`, `Lecturer`, `Venue` (+`VenueType`), `TimeSlot`
  (+`DayOfWeek`), `Booking`, `Group`, `GroupCourse`, `GroupLecturer`, `FeatureFlag`.
- Extend existing `Course` (nullable `departmentId`, `level`, `isElective`,
  `expectedSize`, relations) and add nullable `Session.bookingId` — the bridge seam.
- **All new fields on existing models are nullable.** One clean migration.
- Configuration Engine: `src/engines/config/configSchema.ts` (Zod for `configProfile`),
  `configEngine.ts` (`resolveConfig`, `isFeatureEnabled`, `validateBookingAgainstConfig`
  — pure, no DB).
- Seeds: `prisma/seed/ug.seed.ts` (UG: College of Basic & Applied Sciences → Math
  Sciences / Physical Sciences / BA; two-semester calendar; UG periods; UG titles;
  Math Room 02/03/19 as dept-owned + an `Online` venue) and a **test-only**
  `fixtureUniversity.ts` with a *different* shape (trimesters, Sun–Thu week, different
  titles) — the proof of universality.
- Introduce **Vitest**; full tests for the Configuration Engine.

**Verify:** `npx prisma migrate dev` runs clean; existing code/rows unaffected; config
tests green for **both** UG and the differently-shaped fixture.

---

### Phase 2 — Booking core + Next.js grid read `[backend + web]`

**Goal:** the seeded UG timetable renders live in the browser.

**Scope (backend):** `Booking` CRUD endpoints; read-optimized
`GET /timetable?termId=&departmentId=` returning grid-shaped data; supporting
list endpoints (`/venues`, `/lecturers`, `/groups`, `/terms`, config).

**Scope (web):** scaffold Next.js 15 + Tailwind 4 (Foundation/Ascent tokens mirrored
from mobile) + Zustand + TanStack Query/Table; typed API client (`lib/api.ts`);
read-only `TimetableGrid` (rows = `TimeSlot`s by day, columns = departments/venues,
dense `BookingCell` = initials + code + room) with **client-side** `FilterBar`
(dept / level / venue / type).

**Verify:** seeded timetable renders in the browser; filtering is instant (no round-trip).

---

### Phase 3 — Clash + Availability engines + UI `[backend + web]`

**Goal:** clashes are visible on the grid; free rooms/slots are findable.

**Scope (backend):**
- **Clash Detection Engine** — `detectClashes(bookings, groups, config)` returning
  `VENUE` / `LECTURER` / `GROUP` clashes with human-readable `detail`. `ONLINE` venues
  skip room-conflict (config-driven). Group clash names *which two courses* collide.
- **Availability Engine** — `freeVenues(slot, …, { minCapacity, departmentId })`,
  `freeSlotsForGroup(group, …)`, `freeSlotsForVenue(venueId, …)`.
- Both pure, both fully Vitest-tested. Endpoints: `GET /clashes`, `GET /availability/*`.

**Scope (web):** `ClashBadge` overlay on involved cells; a Clashes report view; a
Free-finder screen (free rooms at a slot with capacity + dept filters; free slots for a
cohort).

**Verify:** a deliberately-clashing seed lights up the grid and lists both courses; the
free-finder returns correct rooms/slots; the two-online-courses case yields **zero**
venue clashes.

---

### Phase 4 — Real-time sync + audit `[backend + web]`

**Goal:** a change by one coordinator appears instantly for every viewer, and every
change is attributable.

**Scope (backend):** Socket.io on the existing Express app; rooms namespaced
`term:<termId>`; socket auth via the same JWT; emit `booking:changed` (minimal payload)
on every create/update/delete; wrap every booking mutation in an existing-`AuditLog` write.

**Scope (web):** `lib/socket.ts` client; optimistic edits; on `booking:changed`,
invalidate the affected TanStack Query key and re-render just that cell. Write access for
coordinators/admins; read-only grid for lower roles.

**Verify:** two browser windows in the same term stay in sync; a client in a different
term does **not** receive the event; mutations appear in `AuditLog` ("who changed this
slot, when").

---

### Phase 5 — Ingestion (Layers 1 & 2 + review) `[backend + web]`

**Goal:** import an existing timetable safely, with a human approving before anything
persists.

**Scope (backend):** Ingestion Engine — `detectFormat`, `ingest`, `commitDraft`.
- **Layer 1 (Structured)** `.xlsx`/`.csv` — direct parse (`xlsx` / `papaparse`). Build fully.
- **Layer 2 (Clean PDF)** text-layer table extraction — build fully (detect by probing
  for a selectable text layer).
- **Layer 3 (OCR/scanned)** — **stub seam only**: return a "manual entry required"
  warning; wire the routing so PaddleOCR (then paid vision AI, billed to the client)
  slots in cleanly later.
- **Idempotent `commitDraft`** — upsert on `importKey` (hash of term+course+slot+venue);
  re-import updates in place, never duplicates.

**Scope (web):** upload → `ReviewTable` showing parsed rows + warnings, inline fixes,
then commit. **The assistant proposes; the human disposes** — never auto-commit.

**Verify:** re-importing the same file produces **no** duplicates; the review screen
flags a deliberately-malformed row before commit.

**After Phase 5:** put it in front of Dr. KD; get the Math Department using it weekly.
*Only after real weekly use* do we consider Phase 2 of the product (lecturer/student
surfaces, multi-university onboarding UI).

---

## 7. Dormant seams (build the seam + data, not the surface)

- **`[DORMANT]` Scheduling Engine** — auto-generate clash-free timetables via graph
  coloring / ILP (Google OR-Tools): courses = nodes, shared resources = conflict edges,
  time slots = colors. Ship only `src/engines/scheduling/README.md` describing the
  intended ILP formulation. Gated behind `feature: auto_scheduling`.
- **`[DORMANT]` Analytics Engine** — utilization & seniority analytics. `Title.rank` and
  `Term` boundaries already capture the data. Gated behind `feature: analytics_dashboard`.

---

## 8. What NOT to build yet (the discipline section)

Real and coming, but building them now is the failure mode. Build seams, gate surfaces:

- ❌ Auto-scheduling solver — seam only.
- ❌ Analytics dashboards — data captured only.
- ❌ Lecturer self-service surfaces — Phase 3 (product).
- ❌ Student-facing surfaces — Phase 4 (product).
- ❌ Multi-university onboarding UI — Phase 5 (product); the *engine* is already
  universal via config, the *surface* waits.
- ❌ Payments, hardware, the broader vision.

The architecture makes all of these cheap to add later **because** it is built
configuration-first and engine-first. Ship the wedge; earn the next phase.

---

## 9. Definition of done

**Per phase:** verification checklist passes; engines (where present) have green Vitest
tests; CI green; changes landed via issue → branch → PR → squash-merge per
`VERSION_CONTROL_GUIDE.md`; no AI co-author trailer; no secrets committed.

**Global quality bar (every phase):** secure by default, all inputs validated, explicit
error handling, backend is the source of truth, TypeScript strict (no `any`),
responsive on all screen sizes, Foundation/Ascent theming with no hardcoded colors.
