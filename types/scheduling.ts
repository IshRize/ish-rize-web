/**
 * Module: scheduling domain types
 * Layer:  types (shared client types)
 * Contract: See ish-rize-backend src/engines/config/configSchema.ts and
 *           ish-rize-web/API_CONTRACT.md
 *
 * Purpose: Client-side mirror of the org-neutral scheduling shapes returned by
 *          the backend. Intentionally minimal — only what Phase 2's read-only
 *          grid needs.
 */

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'STUDENT' | 'LECTURER' | 'ADMIN';
}

export interface Organization {
  id: string;
  name: string;
  shortName: string;
  orgType: string;
}

export interface OrgConfig {
  orgType: string;
  vocabulary: Record<string, string>;
  activityKinds: { key: string; label: string }[];
  weekDays: string[];
  clashRules: { onlineVenueSkipsRoomClash: boolean };
  features: Record<string, boolean>;
  // Optional, not yet sent by any org's configProfile — only the accent is
  // ever org-themeable (see lib/orgTheme.ts). Never extend this to the
  // clash/free/pending tokens; those are fixed system-wide by design.
  branding?: {
    accentPrimary?: string;
    accentPrimaryHover?: string;
    accentSecondary?: string;
  };
}

export interface OrgUnit {
  id: string;
  organizationId: string;
  parentId: string | null;
  name: string;
  unitType: string;
  depth: number;
  orderIndex: number;
}

export interface Term {
  id: string;
  calendarId: string;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
}

export interface TimeSlot {
  id: string;
  organizationId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  label: string | null;
  orderIndex: number;
}

export interface HostSummary {
  id: string;
  initials: string;
  displayName: string;
  title: { abbreviation: string; fullForm: string; rank: number } | null;
}

export interface VenueSummary {
  id: string;
  name: string;
  type: string;
  capacity: number;
}

export interface ActivitySummary {
  id: string;
  code: string;
  name: string;
  kind: string;
  level: number | null;
  orgUnitId: string | null;
}

export interface Booking {
  id: string;
  termId: string;
  timeSlotId: string;
  level: number | null;
  groupTag: string | null;
  note: string | null;
  course: ActivitySummary;
  host: HostSummary | null;
  venue: VenueSummary | null;
}

export interface ScheduleResponse {
  term: { id: string; name: string; type: string; calendarLabel: string };
  organizationId: string;
  timeSlots: TimeSlot[];
  columns: OrgUnit[];
  bookings: Booking[];
}

export interface Clash {
  type: 'VENUE' | 'HOST' | 'GROUP';
  timeSlotId: string;
  bookingIds: string[];
  detail: {
    venueName?: string;
    hostName?: string;
    groupName?: string;
    activityCodes: string[];
  };
}

export interface GroupSummary {
  id: string;
  termId: string;
  orgUnitId: string;
  name: string;
  courseLinks: { courseId: string }[];
}

export interface DraftBooking {
  rowIndex: number;
  raw: { code: string; day: string; slot: string; venue?: string; host?: string; level?: string };
  courseId?: string;
  timeSlotId?: string;
  venueId?: string;
  hostId?: string;
  level?: number;
  warnings: string[];
}

export interface IngestionResult {
  layerUsed: 'STRUCTURED' | 'PDF_TABLE' | 'OCR' | 'AI_VISION';
  draftBookings: DraftBooking[];
  warnings: string[];
}

export interface IngestionCommitResult {
  committed: { rowIndex: number; bookingId: string; action: 'created' | 'updated' }[];
  skipped: { rowIndex: number; reason: string }[];
}
