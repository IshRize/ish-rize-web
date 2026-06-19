# IshRize Web — Architecture

System design for the IshRize Timetable Intelligence web client and the backend
timetable layer it depends on. Read alongside [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)
(what/when) and [COPILOT_CONTEXT.md](COPILOT_CONTEXT.md) (how to write the code).

---

## 1. Big picture

```
┌───────────────────────────────────────────────────────────────────┐
│                            CLIENTS                                  │
│                                                                     │
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
│      existing routes  +  /universities /terms /venues /lecturers    │
│                          /groups /bookings /timetable               │
│                          /availability /clashes /ingestion          │
│                                                                     │
│   ── Engines (new, pure, tested) ───────────────────────────────    │
│      Configuration · Clash Detection · Availability · Ingestion     │
│      Real-time Sync · [DORMANT] Scheduling · [DORMANT] Analytics    │
│                                                                     │
│   ── Data access: Prisma 7 ─────────────────────────────────────    │
│      existing 14 models  +  timetable models                        │
└───────────────────────────────────┬─────────────────────────────────┘
                                     ▼
                          ┌────────────────────┐
                          │     PostgreSQL      │
                          │  (single source)    │
                          └────────────────────┘
```

The backend has three strictly separated layers:

- **Edge** — routes, controllers, socket handlers. Translate HTTP/WS to domain calls.
  Thin; no business logic.
- **Engine** — domain services. All the intelligence. Pure where possible; fully tested.
- **Data** — Prisma. Persistence only. Engines receive data; they never fetch it from
  inside their core algorithms.

---

## 2. The Configuration Engine (the dynamic core)

This is what makes the product work for *any* university instead of just UG. Build it
first; everything else reads from it.

Universities differ along axes a naive system would hardcode: calendar shape
(semesters / trimesters / quarters / named terms), time blocks, week shape
(Mon–Fri / Mon–Sat / Sun–Thu), org depth (College→Department vs Faculty→School→Department),
title vocabulary, code/venue/group naming.

Each `University` row carries a structured `configProfile` (JSON, validated by Zod). The
engine exposes pure resolvers — every other engine takes a `UniversityConfig` as input:

```typescript
// src/engines/config/configEngine.ts — pure, no DB inside the core
interface UniversityConfig {
  termTypes: TermType[];              // ["SEMESTER"] | ["TRIMESTER"] | ["QUARTER"] | …
  weekDays: DayOfWeek[];              // ["MON","TUE","WED","THU","FRI"]
  timeSlots: TimeSlotDef[];           // ordered period definitions
  orgLevels: OrgLevelDef[];           // hierarchy labels & depth
  titleRanks: TitleDef[];             // ordered titles
  courseCodeFormat?: string;          // optional validation regex
  clashRules: ClashRuleConfig;        // e.g. ONLINE venues skip room-conflict
  features: Record<string, boolean>;  // feature flags (mirrors FeatureFlag table)
}

function resolveConfig(university: University): UniversityConfig;
function isFeatureEnabled(config: UniversityConfig, key: string): boolean;
function validateBookingAgainstConfig(booking, config): ValidationResult;
```

> **The rule that keeps the system universal:** when you find yourself about to hardcode
> a university-specific assumption, stop and put it in the config instead.

A **test-only** fixture university with a *different* shape (trimesters, Sun–Thu week,
different titles) is the proof that the system is genuinely dynamic and not UG-shaped.

---

## 3. Data model (extends the existing Prisma schema)

Everything is scoped to a `University` so two institutions never share rows. The full
Prisma definitions land in Phase 1; this is the shape and the reasoning.

### Configuration root
- **`University`** — `configProfile` Json (Zod-validated), relations to everything below.
- **`AcademicYear`** → **`Term`** (`TermType`: SEMESTER/TRIMESTER/QUARTER/TERM,
  `teachingWeeks`, dates).

### Org structure
- **`College`** → **`Department`** (`code`, owns courses/lecturers/groups/venues).

### People & titles
- **`Title`** (`abbreviation`, `fullForm`, `rank` — `rank` feeds `[DORMANT]` seniority analytics).
- **`Lecturer`** (optional `userId` link to existing `User`; `initials` for dense cells,
  `displayName`).

### Venues
- **`Venue`** (`capacity`; `VenueType`: LECTURE_HALL / LAB / SEMINAR_ROOM / DEPT_ROOM /
  `ONLINE`; nullable `departmentId` = department-owned vs central). `ONLINE` skips
  room-conflict in the clash engine.

### Time grid
- **`TimeSlot`** (`dayOfWeek`, `startTime`/`endTime` as `HH:mm`, `orderIndex` for stable
  grid ordering). These are the rows of the master timetable.

### The atom
- **`Booking`** — `term`, `course`, optional `lecturer`, optional `venue`, `timeSlot`,
  `level`, `groupTag`, `note`, and `importKey` (stable hash of term+course+slot+venue for
  **idempotent** ingestion). Indexed `[venueId, timeSlotId]` and `[lecturerId, timeSlotId]`
  for fast clash/availability queries; `@@unique([importKey])`.

### Cohorts (group clash detection)
- **`Group`** → **`GroupCourse`** (which courses a cohort takes) + **`GroupLecturer`**
  (which lecturer teaches each course for that group).

### Feature flags
- **`FeatureFlag`** — `(universityId, featureKey)` unique; gates dormant power.

### The bridge to the existing system
One optional field on the existing `Session`:

```prisma
model Session {
  // ... all existing fields unchanged ...
  bookingId String?
  booking   Booking? @relation(fields: [bookingId], references: [id])
}
```

A `Session` (an attendance event the mobile app already handles) can now point at the
`Booking` it instantiates. The attendance engine does not change — it gains the ability
to be *fed by the timetable*. **Build the field now; auto-session-generation is `[DORMANT]`.**

**Migration discipline:** every new field on an existing model (`Course`, `Session`) is
**nullable** so existing rows and code keep working. One clean migration; never edit a
committed migration — add a new one.

---

## 4. The engines (contracts)

Each engine lives in `src/engines/<name>/`, exports pure functions, and ships with
`<name>.test.ts`. Data is fetched at the edge and passed in.

### Clash Detection
`detectClashes(bookings, groups, config): Clash[]` — three types:
1. **Venue** — same `venueId` + `timeSlotId` (skip when venue type is `ONLINE`).
2. **Lecturer** — same `lecturerId` + `timeSlotId`.
3. **Group** — expand each `Group`'s courses to bookings; any two sharing a `timeSlotId`
   is a cohort clash, reported with *which group* and *which two courses*.

Group-level clashes are why a student in "CS+Math 300" can be shown exactly which of
*their* courses collide.

### Availability
- `freeVenues(slot, bookings, venues, config, { minCapacity?, departmentId? })`
- `freeSlotsForGroup(group, bookings, timeSlots)` — intersect busy slots of every course
  the group takes; return the complement (the extra-class finder).
- `freeSlotsForVenue(venueId, bookings, timeSlots)`.

### Ingestion (three-layer, idempotent)
`Upload → detect format → cheapest reliable layer → parsed rows → review draft → approve → upsert`.
Layer 1 structured (`xlsx`/`csv`), Layer 2 clean PDF (text layer), Layer 3 OCR
(stub seam now; PaddleOCR then paid vision later, billed to the client). **Never
auto-commit** — always a draft a coordinator approves. `commitDraft` upserts on `importKey`.

### Real-time Sync
Socket.io on the existing Express app; rooms `term:<termId>`; JWT-authed; emit
`booking:changed` on every mutation; clients invalidate the affected query key.

### `[DORMANT]` Scheduling & Analytics
Seam + data only. See [IMPLEMENTATION_PLAN.md §7](IMPLEMENTATION_PLAN.md).

---

## 5. Web app structure

```
ish-rize-web/
├── app/                                  # Next.js 15 App Router
│   ├── (auth)/login/
│   ├── (coordinator)/
│   │   ├── timetable/                     # the master grid
│   │   ├── clashes/                       # clash report
│   │   ├── free-finder/                   # free slot / free room
│   │   └── ingestion/                     # upload + review
│   ├── (academic-affairs)/               # [DORMANT surface] reports
│   ├── (lecturer)/                       # [product Phase 3] load + extra class
│   ├── (student)/                        # [product Phase 4] personal timetable
│   └── layout.tsx
├── components/
│   ├── timetable/
│   │   ├── TimetableGrid.tsx              # TanStack Table, the centerpiece
│   │   ├── BookingCell.tsx               # dense: initials + code + room
│   │   ├── FilterBar.tsx                 # dept / level / venue / type
│   │   └── ClashBadge.tsx
│   ├── ingestion/ReviewTable.tsx
│   └── ui/                               # Tailwind primitives
├── lib/
│   ├── api.ts                            # typed fetch client → backend
│   ├── socket.ts                         # Socket.io client
│   └── queryKeys.ts                      # TanStack Query keys
├── stores/                               # Zustand (mirror mobile patterns)
└── types/                                # shared domain types
```

### The master grid (the centerpiece)
- **Rows** = `TimeSlot`s (by `orderIndex`), grouped by day.
- **Columns** = departments (or venues, toggleable).
- **Cells** = `Booking`s rendered dense (initials + code + room); hover/click reveals
  full lecturer name, title, teaching load.
- **Filters** = client-side over already-fetched data via TanStack Table — instant.
- **Clash overlay** = `ClashBadge` on involved cells; the Clashes view lists them with
  the engine's `detail`.
- **Live edits** = coordinator edits a cell → optimistic update → backend persists →
  Socket.io broadcasts → every viewer's cell updates. Lower roles get a read-only grid.
- **Permissions** = reuse existing roles. Coordinators/admins write; lecturers/students read.

---

## 6. Design system

Match the existing brand exactly so web and mobile feel like one product:

- **Foundation** (default, dark): bg `#0F172A`, surface `#1E293B`, text `#F8FAFC`,
  accent gold `#C9A24D`.
- **Ascent** (light): bg `#F9FAFB`, surface `#F1F5F9`, text `#0F172A`, accent `#B8932E`.
- 8px spacing grid; Inter / SF Pro; semantic success/warning/error tuned per theme.

The Tailwind config mirrors the mobile theme tokens (see `ish-rize-mobile/src/theme/`).
The grid must stay **legible at density** and **responsive on every screen size** — this
is a professional daily-use tool, not a demo. Clarity, fast filtering, and obvious clash
signaling over decoration.

---

## 7. Auth & real-time at the edge

- **Auth** — reuse the backend JWT + RBAC middleware unchanged. The web client stores the
  token in an **httpOnly cookie** (not SecureStore as on mobile). Socket connections
  authenticate with the same JWT.
- **Real-time** — one Socket.io server on the existing Express app; term-scoped rooms;
  minimal `booking:changed` payloads that drive per-cell cache invalidation.
- **Audit** — every booking mutation writes an `AuditLog` row via the existing utility,
  answering "who changed this slot, and when?"
