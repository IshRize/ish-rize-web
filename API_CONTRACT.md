# IshRize Scheduling — API Contract

REST + WebSocket contract for the **scheduling intelligence layer**. These endpoints are
**added to** the existing IshRize backend (`ish-rize-backend`), which already exposes the
57 attendance/auth/analytics endpoints documented in that repo's `API_CONTRACT.md`. This
document covers only the new, **org-neutral** surface the web app consumes.

## Conventions (unchanged from the existing API)

- **Base URL:** `/api`
- **Auth:** JWT via `Authorization: Bearer <token>` (web stores it in an httpOnly cookie).
  All routes protected unless marked **(public)**.
- **Response envelope:** `{ "success": true, "data": ... }` or
  `{ "success": false, "message": "..." }`. The web client unwraps `data`.
- **Roles:** `STUDENT` / `LECTURER` / `ADMIN`. Schedule write access is for coordinators
  (`ADMIN`, and `LECTURER` acting as coordinator per existing role checks).
- **Scoping:** every resource is scoped to an `Organization`; queries pass the relevant id
  (`organizationId`, `calendarId`, `termId`, `orgUnitId`).
- **Vocabulary:** the API speaks neutral nouns (`organizations`, `org-units`, `hosts`,
  `activities`). The UI renders org-specific labels ("Course"/"Service", "Lecturer"/"Pastor")
  from the config `vocabulary` map.
- **Audit:** every mutation writes an `AuditLog` row.

---

## Organization & structure

```
GET    /organizations/:id/config       # resolved OrgConfig (Configuration Engine)
POST   /organizations                  (ADMIN)
GET    /organizations/:id/org-units
POST   /org-units                      (ADMIN)          # parentId builds the tree
```

## Calendar

```
GET    /calendars?organizationId=
POST   /calendars                      (ADMIN / COORDINATOR)
GET    /terms?calendarId=
POST   /terms                          (ADMIN / COORDINATOR)
```

## People & titles

```
GET    /titles?organizationId=
POST   /titles                         (ADMIN)
GET    /hosts?orgUnitId=
POST   /hosts                          (ADMIN / COORDINATOR)
```

## Resources & activities

```
GET    /venues?organizationId=&orgUnitId=
POST   /venues                         (ADMIN / COORDINATOR)
GET    /activities?orgUnitId=          # Course rows, filterable by kind
POST   /activities                     (COORDINATOR)
GET    /groups?termId=
POST   /groups                         (COORDINATOR)
POST   /groups/:id/activities          (COORDINATOR)   # link GroupActivity
POST   /groups/:id/hosts               (COORDINATOR)   # link GroupHost
```

## Schedule (the core)

```
GET    /schedule?termId=&orgUnitId=    # grid-shaped, read-optimized
POST   /bookings                       (COORDINATOR)
PATCH  /bookings/:id                    (COORDINATOR)
DELETE /bookings/:id                    (COORDINATOR)
```

**`GET /schedule`** returns data already shaped for the grid: ordered `timeSlots` (rows),
the chosen `columns` (org units or venues), and `bookings` with the relations the cell needs
(activity code, host initials + display name + title, venue name). Clash flags are fetched
separately via `/clashes` so the grid and the report share one source of truth.

**`POST /bookings`** body:

```json
{
  "termId": "uuid",
  "courseId": "uuid",
  "hostId": "uuid | null",
  "venueId": "uuid | null",
  "timeSlotId": "uuid",
  "level": 300,
  "groupTag": "CS+Math 300",
  "note": "optional"
}
```

The backend validates the booking against the org config
(`validateBookingAgainstConfig`) before persisting, and rejects with
`{ success: false, message }` on a config violation.

## Intelligence

```
GET    /clashes?termId=                              # full clash report (Clash[])
GET    /availability/venues?slotId=&minCapacity=&orgUnitId=
GET    /availability/group/:groupId                  # free slots for a cohort
GET    /availability/venue/:venueId                  # free slots for a venue
```

**`GET /clashes`** returns the Clash Detection Engine output:

```json
{
  "success": true,
  "data": [
    {
      "type": "GROUP",
      "timeSlotId": "uuid",
      "bookingIds": ["uuid", "uuid"],
      "detail": { "groupName": "CS+Math 300", "activityCodes": ["MATH355", "CSC301"] }
    }
  ]
}
```

`type` is `VENUE` | `HOST` | `GROUP`. Two `ONLINE` bookings in the same slot do **not**
produce a `VENUE` clash (config-driven).

## Ingestion

```
POST   /ingestion/parse                  (COORDINATOR)   # multipart upload → IngestionResult draft
POST   /ingestion/commit                 (COORDINATOR)   # idempotent upsert of approved draft
```

**`POST /ingestion/parse`** returns a draft for human review — **nothing is persisted**:

```json
{
  "success": true,
  "data": {
    "layerUsed": "STRUCTURED | PDF_TABLE | OCR | AI_VISION",
    "draftBookings": [ /* DraftBooking[] — not yet saved */ ],
    "warnings": ["Unmatched venue: 'Math Rm 2'", "Ambiguous code: 'MA 355'"]
  }
}
```

**`POST /ingestion/commit`** upserts the approved draft on `importKey`
(hash of term+course+slot+venue) — re-importing the same file updates in place and never
creates duplicates.

## Real-time

```
WS     /socket
       rooms:   term:<termId>   (optionally unit:<orgUnitId>)
       events:  booking:changed   { bookingId, action: "created"|"updated"|"deleted", … }
```

The socket connection authenticates with the same JWT. A client viewing a term joins
`term:<termId>`; on any booking mutation in that term it receives `booking:changed` with a
minimal payload and invalidates the affected TanStack Query cache key. Clients in other
terms receive nothing.

---

## Global rules (inherited from the existing API)

- The frontend never decides roles or enforces business rules — the backend is the source
  of truth.
- All inputs validated server-side; assume malicious clients.
- Prisma parameterized queries only.
- New fields on existing models are nullable; existing endpoints are unchanged.
- No org-specific assumption in code — org differences live in `configProfile`.
