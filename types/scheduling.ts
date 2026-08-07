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
  createdAt: string;
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
  archived: boolean;
}

export interface CoordinatorAssignment {
  id: string;
  userId: string;
  orgUnitId: string;
  assignedBy: string;
  assignedAt: string;
  revokedAt: string | null;
  user: { id: string; firstName: string; lastName: string; email: string };
  orgUnit: { id: string; name: string };
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

export interface MyHost extends HostSummary {
  orgUnitId: string;
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

// The Master Timetable layer: subject code + level + day + time + venue --
// no Activity/Host, since the real master export never carries that.
export interface DraftMasterSlot {
  rowIndex: number;
  raw: { subjectCode: string; day: string; slot: string; venue?: string; level?: string };
  sheet?: string;
  dayOfWeek?: string;
  timeSlotId?: string;
  venueId?: string;
  level?: number;
  warnings: string[];
}

export interface MasterSlotIngestionResult {
  layerUsed: 'STRUCTURED' | 'PDF_TABLE' | 'OCR' | 'AI_VISION';
  draftSlots: DraftMasterSlot[];
  warnings: string[];
}

export interface MasterSlotCommitResult {
  committed: { rowIndex: number; masterSlotId: string; action: 'created' | 'updated' }[];
  skipped: { rowIndex: number; reason: string }[];
}

// Department-level ingestion (dept-coordinator tooling Phase 5): unlike the
// master file, a department's own export already carries Course + Host per
// row -- these decomposed offerings resolve directly into Booking, never
// MasterSlot.
export interface DraftBooking {
  rowIndex: number;
  raw: { code: string; day: string; slot: string; venue?: string; host?: string; level?: string };
  sheet?: string;
  courseId?: string;
  timeSlotId?: string;
  venueId?: string;
  hostId?: string;
  level?: number;
  warnings: string[];
}

export interface BookingIngestionResult {
  layerUsed: 'STRUCTURED' | 'PDF_TABLE' | 'OCR' | 'AI_VISION';
  draftBookings: DraftBooking[];
  warnings: string[];
}

export interface BookingIngestionCommitResult {
  committed: { rowIndex: number; bookingId: string; action: 'created' | 'updated' }[];
  skipped: { rowIndex: number; reason: string }[];
}

// MasterSlot itself carries no department info -- the file groups by level,
// not department -- so this is the only link between a coarse subject code
// and the department that owns it.
export interface SubjectDepartmentMapping {
  id: string;
  organizationId: string;
  subjectCode: string;
  orgUnitId: string;
  orgUnit: { id: string; name: string };
}

// A decomposed offering: a department coordinator turned a MasterSlot into a
// named Course + lecturer. Lighter than the full Booking type since this is
// nested inside a department-timetable row, not standalone.
export interface DepartmentBooking {
  id: string;
  course: { id: string; code: string; name: string };
  host: { id: string; displayName: string; initials: string } | null;
}

export interface MasterSlotRow {
  id: string;
  organizationId: string;
  termId: string;
  subjectCode: string;
  level: number | null;
  dayOfWeek: string;
  timeSlotId: string;
  venueId: string | null;
  sourceSheet: string | null;
  timeSlot: TimeSlot;
  venue: { id: string; name: string } | null;
}

export interface DepartmentTimetableSlot extends MasterSlotRow {
  bookings: DepartmentBooking[];
}

// "Scheduled hours" -- the sum of Booking durations, used as a proxy for
// time on campus. Not real swipe-based attendance; that system only tracks
// students today.
export interface MyTeachingLoad {
  totalMinutes: number;
  bookingCount: number;
  courses: { courseId: string; code: string; name: string; minutes: number; bookingCount: number }[];
  groups: { groupId: string; name: string; department: string }[];
}

export interface TeachingLoadEntry {
  hostId: string | null;
  displayName: string;
  totalMinutes: number;
  bookingCount: number;
  courseCount: number;
  venueCount: number;
}

export type OrgRole = 'OWNER' | 'ADMIN' | 'COORDINATOR' | 'MEMBER';
export type MemberStatus = 'ACTIVE' | 'SUSPENDED';

export interface OrgMember {
  id: string;
  userId: string;
  organizationId: string;
  role: OrgRole;
  status: MemberStatus;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface MemberProfile extends OrgMember {
  scopedUnitIds: string[];
  lastActiveAt: string | null;
}

export interface OrgInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: OrgRole;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
}

export interface InviteLink {
  id: string;
  organizationId: string;
  token: string;
  defaultRole: OrgRole;
  enabled: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string } | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type VenueType = 'LECTURE_HALL' | 'LAB' | 'SEMINAR_ROOM' | 'UNIT_ROOM' | 'ONLINE';

export interface Venue {
  id: string;
  organizationId: string;
  orgUnitId: string | null;
  name: string;
  capacity: number;
  type: VenueType;
  archived: boolean;
  createdAt: string;
}

export interface Host {
  id: string;
  userId: string | null;
  organizationId: string;
  titleId: string | null;
  orgUnitId: string;
  name: string;
  initials: string;
  displayName: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  description: string | null;
  lecturerId: string;
  kind: string;
  orgUnitId: string | null;
  level: number | null;
  courseType: string;
  expectedSize: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  termId: string;
  orgUnitId: string;
  name: string;
  createdAt: string;
  courseLinks: { courseId: string; course?: { code: string; name: string } }[];
  hostLinks: { hostId: string; courseId: string; host?: { displayName: string } }[];
}

export interface Calendar {
  id: string;
  organizationId: string;
  label: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  terms?: Term[];
}

export type TermType = 'SEMESTER' | 'TRIMESTER' | 'QUARTER' | 'TERM' | 'SEASON';

export interface Title {
  id: string;
  organizationId: string;
  abbreviation: string;
  fullForm: string;
  rank: number;
}

export interface Session {
  id: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  lastUsedAt: string;
  createdAt: string;
  expiresAt: string;
}

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description?: string;
}
