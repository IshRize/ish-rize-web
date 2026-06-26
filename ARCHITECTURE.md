# IshRize Web — Architecture

System design for the IshRize Scheduling Intelligence web client and the backend
scheduling layer it depends on. The product is **org-neutral at the core** — a university
first, churches and events later, on the same engines. Read alongside
[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) (what/when) and
[COPILOT_CONTEXT.md](COPILOT_CONTEXT.md) (how to write the code).

---

## 1. Big picture

```
┌───────────────────────────────────────────────────────────────────┐
│                            CLIENTS                                  │
│   Web App (this repo)                 Mobile App (existing)         │
│   Next.js 15 · TS · Tailwind 4        React Native · Expo           │
│   Zustand · TanStack Query/Table      Zustand                       │
│   Socket.io client                                                  │
│        │                                   │                        │
└────────┼───────────────────────────────────┼───────────────────────┘
         │            REST + WebSocket        │
         ▼                                    ▼
┌───────────────────────────────────────────────────────────────────┐
│                   BACKEND (existing, extended)                      │
│                  Node · Express 5 · TypeScript                      │
│                                                                     │
│   ── Edge: HTTP / Socket layer ─────────────────────────────────    │
│      existing routes  +  /organizations /org-units /calendars       │
│                          /terms /venues /hosts /activities          │
│                          /groups /bookings /schedule                │
│                          /availability /clashes /ingestion          │
│                                                                     │
│   ── Engines (new, pure, tested) ───────────────────────────────    │
│      Configuration · Clash Detection · Availability · Ingestion     │
│      Real-time Sync · [DORMANT] Scheduling · [DORMANT] Analytics     │
│                                                                     │
│   ── Data access: Prisma 7 ─────────────────────────────────────    │
│      existing 14 models  +  org-neutral scheduling models           │
└───────────────────────────────────┬─────────────────────────────────┘
                                     ▼
                          ┌────────────────────┐
                          │     PostgreSQL      │
                          │  (single source)    │
                          └────────────────────┘
```

Three strictly separated backend layers: **Edge** (routes/controllers/sockets — thin, no
business logic), **Engine** (all intelligence — pure, fully tested), **Data** (Prisma —
persistence only; engines receive data, they never fetch it inside their algorithms).

---

## 2. Three layers of generality

Know which layer you are touching. This is the mental model the whole design rests on.

- **Kernel — truly universal, never varies per org.** `Booking`, `Venue`, `TimeSlot`,
  `Term`, and the Clash + Availability engines. A booking is *a host does an activity in a
  venue at a time slot, for a cohort* — true for a lecture, a service, and a talk. These
  engines do not know what kind of organization they serve.
- **Org structure — the shape varies, the pattern is invariant.** Every org is a tree of
  units containing activities, hosts, and audiences. University: College → Department →
  Course taught by a Lecturer for a Group. Church: Region → Branch → Ministry led by a
  Pastor for a Group. Modeled as a configurable self-referential `OrgUnit` tree — built
  **now**, because it rests on a real invariant.
- **Vertical vocabulary & rules — genuinely different per org.** Titles, activity kinds,
  calendar shapes. Expressed through `configProfile` and `kind` discriminators. Vertical
  *structure* is `[VERTICAL-LATER]`.

---

## 3. The Configuration Engine (the dynamic, org-neutral core)

What makes the product work for *any* organization. Build it first; everything reads from it.

Organizations differ along axes a naive system would hardcode: org shape & vocabulary
(Faculty→Department→Course vs Region→Branch→Ministry), calendar shape (semesters /
trimesters / quarters / seasons), time blocks, week shape (Mon–Fri / Sun–Thu), host titles
(Prof/Dr vs Pastor/Bishop), and activity kinds (COURSE / SERVICE / SESSION).

Each `Organization` carries a structured `configProfile` (JSON, validated by Zod). The
engine exposes pure resolvers — every other engine takes an `OrgConfig` as input:

```typescript
// src/engines/config/configEngine.ts — pure, no DB inside the core
interface OrgConfig {
  orgType: string;                    // "UNIVERSITY" | "CHURCH" | "EVENT" | ...
  unitLevels: UnitLevelDef[];         // labels & depth for the OrgUnit tree
  termTypes: TermType[];              // ["SEMESTER"] | ["TRIMESTER"] | ["SEASON"] | ...
  weekDays: DayOfWeek[];              // ["MON","TUE","WED","THU","FRI"]
  timeSlots: TimeSlotDef[];           // ordered period definitions
  titleRanks: TitleDef[];             // ordered host titles
  activityKinds: ActivityKindDef[];   // vocabulary + attributes per kind
  vocabulary: Record<string, string>; // UI labels: {"activity":"Course","host":"Lecturer"}
  clashRules: ClashRuleConfig;        // e.g. ONLINE venues skip room-conflict
  features: Record<string, boolean>;  // mirrors FeatureFlag table
}

function resolveConfig(org: Organization): OrgConfig;
function isFeatureEnabled(config: OrgConfig, key: string): boolean;
function label(config: OrgConfig, term: string): string;   // "activity" → "Course" | "Service"
function validateBookingAgainstConfig(booking, config): ValidationResult;
```

> **The rule that keeps the system universal:** when you catch yourself about to hardcode
> an org-specific assumption, stop and put it in the config instead.

**Two test-only fixtures prove universality:** a fictional *church* (`orgType: CHURCH`,
Region→Branch→Ministry, Sun-based week, pastoral titles) and a *differently-shaped
university* (trimesters). If the same engines pass for UG, the church, and the trimester
uni with zero code changes, the system is genuinely dynamic and not secretly UG-shaped.

---

## 4. Data model (extends the existing Prisma schema)

### 4.0 The one naming exception — read first

Every *new* table gets an org-neutral name. The single exception is the existing `Course`
table: it is heavily wired into the live attendance system (enrollments, sessions,
attendance records, 57 endpoints, the mobile app). Renaming a load-bearing table for
cosmetic neutrality is exactly the speculative churn we avoid — it risks the working system
for no functional gain. Instead `Course` **keeps its name** and gains a **`kind`
discriminator** (`"COURSE"` default; `"SERVICE"`/`"SESSION"` later) plus an `OrgUnit` link.
A church's "Sunday Service" is a `Course` row with `kind="SERVICE"`; the UI shows "Service"
from config and never exposes the table name. The table name is an implementation detail;
the `kind` field carries the polymorphism. Everything *new* (`Host`, `OrgUnit`, …) is named
neutrally.

### 4.1 Shape & reasoning (full Prisma lands in Phase 1)

**Configuration root**
- **`Organization`** — `orgType`, `configProfile` Json (Zod-validated), relations to all below.
- **`OrgUnit`** — self-referential tree (`parentId`/`children`, `unitType` label from config,
  `depth`). Replaces College/Department. University: College(0)→Department(1). Church:
  Region(0)→Branch(1)→Ministry(2). No new model ever needed per vertical.

**Calendar**
- **`Calendar`** (was AcademicYear) → **`Term`** (`TermType`: SEMESTER/TRIMESTER/QUARTER/
  TERM/SEASON; `teachingWeeks` nullable — university-flavored, ignored elsewhere).

**People & titles**
- **`Title`** (`abbreviation`, `fullForm`, `rank` — feeds `[DORMANT]` seniority analytics).
- **`Host`** (was Lecturer) — the person who runs an activity (lecturer, pastor, speaker).
  Optional `userId` link to existing `User`; `initials` for dense cells, `displayName`.

**Venues**
- **`Venue`** (`capacity`; `VenueType`: LECTURE_HALL / LAB / SEMINAR_ROOM / UNIT_ROOM /
  `ONLINE`; nullable `orgUnitId` = unit-owned vs central). `ONLINE` skips room-conflict.

**Time grid**
- **`TimeSlot`** (`dayOfWeek`, `startTime`/`endTime` `HH:mm`, `orderIndex`). The rows of the grid.

**Activities (existing `Course`, generalized via `kind`)**
- `Course` keeps its name + existing relations; gains `kind`, optional `orgUnit`, `level`
  (nullable; university 100–400), `isElective`, `expectedSize`, and `bookings` / `groupLinks`.

**The atom**
- **`Booking`** — `term`, `course` (the activity), optional `host`, optional `venue`,
  `timeSlot`, `level`, `groupTag`, `note`, `importKey` (stable hash for **idempotent**
  ingestion). Indexed `[venueId, timeSlotId]` and `[hostId, timeSlotId]` for fast
  clash/availability; `@@unique([importKey])`.

**Cohorts (group clash detection)**
- **`Group`** → **`GroupActivity`** (was GroupCourse) + **`GroupHost`** (was GroupLecturer,
  carries which activity the host runs for the group).

**Feature flags**
- **`FeatureFlag`** — `(organizationId, featureKey)` unique; gates dormant power.

### 4.2 The bridge to the existing system

One optional field on the existing `Session`:

```prisma
model Session {
  // ... all existing fields unchanged ...
  bookingId String?
  booking   Booking? @relation(fields: [bookingId], references: [id])
}
```

A `Session` (an attendance event the mobile app already handles) can point at the `Booking`
it instantiates. The attendance engine does not change — it gains the ability to be *fed by
the schedule*. **Build the field now; auto-session-generation is `[DORMANT]`.**

### 4.3 Migration discipline

Every new field on an existing model (`Course`, `Session`) is **nullable** so existing rows
and code keep working. One clean migration; never edit a committed migration — add a new one.

---

## 5. The engines (contracts)

Each engine lives in `src/engines/<name>/`, exports pure functions, ships with
`<name>.test.ts`. Data is fetched at the edge and passed in. **The payoff of the
org-neutral design: the Clash and Availability engines need zero changes to serve a church
or an event — they operate on bookings, venues, slots, and hosts.**

### Clash Detection
`detectClashes(bookings, groups, config): Clash[]` — three types:
1. **Venue** — same `venueId` + `timeSlotId` (skip when venue type is `ONLINE`).
2. **Host** — same `hostId` + `timeSlotId`.
3. **Group** — expand each `Group`'s activities to bookings; any two sharing a `timeSlotId`
   is a cohort clash, reported with *which group* and *which two activities*.

Group-level detection is why a student in "CS+Math 300" sees exactly which of *their*
activities collide (and a church sees that youth service and choir practice clash).

### Availability
- `freeVenues(slot, bookings, venues, config, { minCapacity?, orgUnitId? })`
- `freeSlotsForGroup(group, bookings, timeSlots)` — the extra-session finder.
- `freeSlotsForVenue(venueId, bookings, timeSlots)`.

### Ingestion (three-layer, idempotent)
`Upload → detect format → cheapest reliable layer → parsed rows → review draft → approve →
upsert`. Layer 1 structured (`xlsx`/`csv`), Layer 2 clean PDF (text layer), Layer 3 OCR
(stub seam now; PaddleOCR then paid vision later, billed to the client). **Never
auto-commit.** `commitDraft` upserts on `importKey`.

### Real-time Sync
Socket.io on the existing Express app; rooms `term:<termId>`; JWT-authed; emit
`booking:changed` on every mutation; clients invalidate the affected query key.

### `[DORMANT]` Scheduling & Analytics
Seam + data only. See [IMPLEMENTATION_PLAN.md §7](IMPLEMENTATION_PLAN.md).

---

## 6. Web app structure

```
ish-rize-web/
├── app/                                  # Next.js 15 App Router
│   ├── (auth)/login/
│   ├── (coordinator)/
│   │   ├── schedule/                      # the master grid
│   │   ├── clashes/                       # clash report
│   │   ├── free-finder/                   # free slot / free room
│   │   └── ingestion/                     # upload + review
│   ├── (oversight)/                      # [DORMANT surface] reports
│   ├── (host)/                           # [later phase] load + extra session
│   ├── (member)/                         # [later phase] personal schedule
│   └── layout.tsx
├── components/
│   ├── schedule/
│   │   ├── ScheduleGrid.tsx               # TanStack Table, the centerpiece
│   │   ├── BookingCell.tsx               # dense: host initials + activity code + room
│   │   ├── FilterBar.tsx                 # unit / level / venue / kind
│   │   └── ClashBadge.tsx
│   ├── ingestion/ReviewTable.tsx
│   └── ui/                               # Tailwind primitives
├── lib/
│   ├── api.ts                            # typed fetch client → backend
│   ├── socket.ts                         # Socket.io client
│   ├── queryKeys.ts                      # TanStack Query keys
│   └── vocab.ts                          # config → UI labels ("Course"/"Service")
├── stores/                               # Zustand (mirror mobile patterns)
└── types/                                # shared domain types
```

### The master grid (the centerpiece)
- **Rows** = `TimeSlot`s (by `orderIndex`), grouped by day.
- **Columns** = org units (or venues, toggleable).
- **Cells** = `Booking`s rendered dense (host initials + activity code + room); hover/click
  reveals full host name, title, and load.
- **Vocabulary** = every visible label ("Course"/"Service", "Lecturer"/"Pastor",
  "Department"/"Ministry") comes from `OrgConfig.vocabulary` via `lib/vocab.ts`. The same UI
  serves a university or a church by swapping config.
- **Filters** = client-side over already-fetched data via TanStack Table — instant.
- **Clash overlay** = `ClashBadge` on involved cells; the Clashes view lists them.
- **Live edits** = coordinator edits → optimistic update → backend persists → Socket.io
  broadcasts → every viewer's cell updates. Lower roles get a read-only grid.
- **Permissions** = reuse existing roles. Coordinators/admins write; others read.

---

## 7. Design system

Match the existing brand exactly so web and mobile feel like one product:

- **Foundation** (default, dark): bg `#0F172A`, surface `#1E293B`, text `#F8FAFC`, accent
  gold `#C9A24D`.
- **Ascent** (light): bg `#F9FAFB`, surface `#F1F5F9`, text `#0F172A`, accent `#B8932E`.
- 8px spacing grid; Inter / SF Pro; semantic success/warning/error tuned per theme.

The Tailwind config mirrors the mobile theme tokens (`ish-rize-mobile/src/theme/`). The grid
must stay **legible at density** and **responsive on every screen size** — a professional
daily-use tool, not a demo. Clarity, fast filtering, and obvious clash signaling over decoration.

---

## 8. Auth & real-time at the edge

- **Auth** — reuse the backend JWT + RBAC middleware unchanged. The web client stores the
  token in an **httpOnly cookie**. Socket connections authenticate with the same JWT.
- **Real-time** — one Socket.io server on the existing Express app; term-scoped rooms;
  minimal `booking:changed` payloads that drive per-cell cache invalidation.
- **Audit** — every booking mutation writes an `AuditLog` row via the existing utility.
