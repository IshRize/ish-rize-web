# IshRize Timetable — API Contract

REST + WebSocket contract for the **timetable intelligence layer**. These endpoints are
**added to** the existing IshRize backend (`ish-rize-backend`), which already exposes the
57 attendance/auth/analytics endpoints documented in that repo's `API_CONTRACT.md`. This
document covers only the new surface the web app consumes.

## Conventions (unchanged from the existing API)

- **Base URL:** `/api`
- **Auth:** JWT via `Authorization: Bearer <token>` (web stores it in an httpOnly cookie
  and attaches it per request). All routes protected unless marked **(public)**.
- **Response envelope:** `{ "success": true, "data": ... }` or
  `{ "success": false, "message": "..." }`. The web client unwraps `data`.
- **Roles:** `STUDENT` / `LECTURER` / `ADMIN`. Timetable write access is for
  coordinators (`ADMIN`, and `LECTURER` acting as coordinator per existing role checks).
- **Scoping:** every timetable resource is scoped to a `University`; queries pass the
  relevant id (`universityId`, `academicYearId`, `termId`, `departmentId`).
- **Audit:** every mutation writes an `AuditLog` row (existing utility).

---

## Configuration & structure

```
GET    /universities/:id/config        # resolved UniversityConfig (Configuration Engine)
POST   /universities                   (ADMIN)
GET    /universities/:id/colleges
POST   /colleges                       (ADMIN)
POST   /departments                    (ADMIN)
GET    /titles?universityId=
POST   /titles                         (ADMIN)
```

## Calendar

```
GET    /academic-years?universityId=
POST   /academic-years                 (ADMIN / COORDINATOR)
GET    /terms?academicYearId=
POST   /terms                          (ADMIN / COORDINATOR)
```

## Resources

```
GET    /venues?universityId=&departmentId=
POST   /venues                         (ADMIN / COORDINATOR)
GET    /lecturers?departmentId=
POST   /lecturers                      (ADMIN / COORDINATOR)
GET    /groups?termId=
POST   /groups                         (COORDINATOR)
POST   /groups/:id/courses             (COORDINATOR)   # link GroupCourse
POST   /groups/:id/lecturers           (COORDINATOR)   # link GroupLecturer
```

## Timetable (the core)

```
GET    /timetable?termId=&departmentId=   # grid-shaped, read-optimized
POST   /bookings                          (COORDINATOR)
PATCH  /bookings/:id                       (COORDINATOR)
DELETE /bookings/:id                       (COORDINATOR)
```

**`GET /timetable`** returns data already shaped for the grid: ordered `timeSlots` (rows),
the chosen `columns` (departments or venues), and `bookings` with the relations the cell
needs (course code, lecturer initials + display name + title, venue name). Clash flags are
fetched separately via `/clashes` so the grid and the report share one source of truth.

**`POST /bookings`** body:

```json
{
  "termId": "uuid",
  "courseId": "uuid",
  "lecturerId": "uuid | null",
  "venueId": "uuid | null",
  "timeSlotId": "uuid",
  "level": 300,
  "groupTag": "CS+Math 300",
  "note": "optional"
}
```

The backend validates the booking against the university config
(`validateBookingAgainstConfig`) before persisting, and rejects with
`{ success: false, message }` on a config violation.

## Intelligence

```
GET    /clashes?termId=                              # full clash report (Clash[])
GET    /availability/venues?slotId=&minCapacity=&departmentId=
GET    /availability/group/:groupId                  # free slots for a cohort
GET    /availability/venue/:venueId                  # free slots for a room
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
      "detail": { "groupName": "CS+Math 300", "courseCodes": ["MATH355", "CSC301"] }
    }
  ]
}
```

`type` is `VENUE` | `LECTURER` | `GROUP`. Two `ONLINE` bookings in the same slot do **not**
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
       rooms:   term:<termId>
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
- All inputs are validated server-side; assume malicious clients.
- Prisma parameterized queries only.
- New fields on existing models are nullable; existing endpoints are unchanged.
