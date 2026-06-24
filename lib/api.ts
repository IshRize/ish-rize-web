/**
 * Module: api client
 * Layer:  lib (client-side)
 * Contract: See API_CONTRACT.md
 * Context: See COPILOT_CONTEXT.md
 *
 * Purpose: Same-origin fetch wrapper. All requests go to this app's own
 *          /api/proxy/* routes, which attach the JWT from the httpOnly cookie
 *          server-side — this module never touches the token.
 *
 * Notes:
 * - Unwraps the backend's { success, data } envelope; throws on failure so
 *   TanStack Query's error state picks it up.
 */
import type {
  ActivitySummary,
  Booking,
  Clash,
  CoordinatorAssignment,
  DepartmentTimetableSlot,
  DraftMasterSlot,
  GroupSummary,
  HostSummary,
  MasterSlotCommitResult,
  MasterSlotIngestionResult,
  MasterSlotRow,
  MyHost,
  MyTeachingLoad,
  OrgConfig,
  OrgUnit,
  Organization,
  ScheduleResponse,
  SubjectDepartmentMapping,
  TeachingLoadEntry,
  Term,
  TimeSlot,
  User,
  VenueSummary,
} from '@/types/scheduling';

const PROXY_BASE = '/api/proxy';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${PROXY_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(json?.message ?? `Request failed (${res.status})`);
  }
  return json.data as T;
}

export const authApi = {
  async login(email: string, password: string): Promise<{ user: User }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.message ?? 'Login failed');
    }
    return json.data;
  },
  async logout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST' });
  },
  me(): Promise<User> {
    return request<User>('/auth/me');
  },
};

export const schedulingApi = {
  listOrganizations(): Promise<Organization[]> {
    return request<Organization[]>('/organizations');
  },
  getOrgConfig(organizationId: string): Promise<OrgConfig> {
    return request<OrgConfig>(`/organizations/${organizationId}/config`);
  },
  listOrgUnits(organizationId: string, includeArchived = false): Promise<OrgUnit[]> {
    const q = includeArchived ? '&includeArchived=true' : '';
    return request<OrgUnit[]>(`/org-units?organizationId=${organizationId}${q}`);
  },
  createOrgUnit(input: { organizationId: string; parentId: string | null; name: string; unitType: string }): Promise<OrgUnit> {
    return request<OrgUnit>('/org-units', { method: 'POST', body: JSON.stringify(input) });
  },
  updateOrgUnit(id: string, patch: { name?: string; unitType?: string; archived?: boolean }): Promise<OrgUnit> {
    return request<OrgUnit>(`/org-units/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  },
  listCoordinatorAssignments(organizationId: string): Promise<CoordinatorAssignment[]> {
    return request<CoordinatorAssignment[]>(`/coordinator-assignments?organizationId=${organizationId}`);
  },
  // Self-scoped: which departments does the CURRENT user coordinate.
  listMyCoordinatorAssignments(): Promise<CoordinatorAssignment[]> {
    return request<CoordinatorAssignment[]>('/coordinator-assignments/me');
  },
  assignCoordinator(input: { userId: string; orgUnitId: string }): Promise<CoordinatorAssignment> {
    return request<CoordinatorAssignment>('/coordinator-assignments', { method: 'POST', body: JSON.stringify(input) });
  },
  revokeCoordinator(assignmentId: string): Promise<CoordinatorAssignment> {
    return request<CoordinatorAssignment>(`/coordinator-assignments/${assignmentId}/revoke`, { method: 'PATCH' });
  },
  listSubjectDepartmentMappings(organizationId: string): Promise<SubjectDepartmentMapping[]> {
    return request<SubjectDepartmentMapping[]>(`/subject-department-mappings?organizationId=${organizationId}`);
  },
  upsertSubjectDepartmentMapping(input: { organizationId: string; subjectCode: string; orgUnitId: string }): Promise<SubjectDepartmentMapping> {
    return request<SubjectDepartmentMapping>('/subject-department-mappings', { method: 'POST', body: JSON.stringify(input) });
  },
  deleteSubjectDepartmentMapping(id: string): Promise<void> {
    return request<void>(`/subject-department-mappings/${id}`, { method: 'DELETE' });
  },
  getDepartmentTimetable(termId: string, orgUnitId: string): Promise<DepartmentTimetableSlot[]> {
    return request<DepartmentTimetableSlot[]>(`/department-timetable?termId=${termId}&orgUnitId=${orgUnitId}`);
  },
  listMasterSlots(termId: string): Promise<MasterSlotRow[]> {
    return request<MasterSlotRow[]>(`/master-slots?termId=${termId}`);
  },
  getMyTeachingLoad(termId: string): Promise<MyTeachingLoad> {
    return request<MyTeachingLoad>(`/teaching-load/me?termId=${termId}`);
  },
  getTeachingLoad(termId: string, orgUnitId: string): Promise<TeachingLoadEntry[]> {
    return request<TeachingLoadEntry[]>(`/teaching-load?termId=${termId}&orgUnitId=${orgUnitId}`);
  },
  listTerms(organizationId: string): Promise<Term[]> {
    return request<Term[]>(`/terms?organizationId=${organizationId}`);
  },
  listHosts(orgUnitId: string): Promise<HostSummary[]> {
    return request<HostSummary[]>(`/hosts?orgUnitId=${orgUnitId}`);
  },
  // null when the current user has no Host record (e.g. a non-teaching ADMIN).
  getMyHost(): Promise<MyHost | null> {
    return request<MyHost | null>('/hosts/me');
  },
  listVenues(organizationId: string, orgUnitId?: string): Promise<VenueSummary[]> {
    const q = orgUnitId ? `&orgUnitId=${orgUnitId}` : '';
    return request<VenueSummary[]>(`/venues?organizationId=${organizationId}${q}`);
  },
  listActivities(orgUnitId: string): Promise<ActivitySummary[]> {
    return request<ActivitySummary[]>(`/activities?orgUnitId=${orgUnitId}`);
  },
  getSchedule(termId: string, orgUnitId?: string): Promise<ScheduleResponse> {
    const q = orgUnitId ? `&orgUnitId=${orgUnitId}` : '';
    return request<ScheduleResponse>(`/schedule?termId=${termId}${q}`);
  },
  listGroups(termId: string): Promise<GroupSummary[]> {
    return request<GroupSummary[]>(`/groups?termId=${termId}`);
  },
  getClashes(termId: string): Promise<Clash[]> {
    return request<Clash[]>(`/clashes?termId=${termId}`);
  },
  getFreeVenues(params: { slotId: string; minCapacity?: number; orgUnitId?: string }): Promise<VenueSummary[]> {
    const q = new URLSearchParams({ slotId: params.slotId });
    if (params.minCapacity != null) q.set('minCapacity', String(params.minCapacity));
    if (params.orgUnitId) q.set('orgUnitId', params.orgUnitId);
    return request<VenueSummary[]>(`/availability/venues?${q.toString()}`);
  },
  getFreeSlotsForGroup(groupId: string): Promise<TimeSlot[]> {
    return request<TimeSlot[]>(`/availability/group/${groupId}`);
  },
  getFreeSlotsForVenue(venueId: string): Promise<TimeSlot[]> {
    return request<TimeSlot[]>(`/availability/venue/${venueId}`);
  },
  createBooking(input: {
    termId: string;
    courseId: string;
    timeSlotId: string;
    hostId?: string;
    venueId?: string;
    level?: number;
    masterSlotId?: string;
  }): Promise<Booking> {
    return request<Booking>('/bookings', { method: 'POST', body: JSON.stringify(input) });
  },
  updateBooking(
    bookingId: string,
    patch: { hostId?: string | null; venueId?: string | null; timeSlotId?: string; level?: number | null; groupTag?: string | null; note?: string | null },
  ): Promise<Booking> {
    return request<Booking>(`/bookings/${bookingId}`, { method: 'PATCH', body: JSON.stringify(patch) });
  },
  deleteBooking(bookingId: string): Promise<void> {
    return request<void>(`/bookings/${bookingId}`, { method: 'DELETE' });
  },
};

export const adminApi = {
  listUsers(): Promise<User[]> {
    return request<User[]>('/admin/users');
  },
};

export const ingestionApi = {
  // Bypasses the JSON request() helper deliberately: the browser must compute
  // the multipart boundary itself when the body is a FormData instance, so no
  // Content-Type header is set here — the proxy forwards whatever it receives.
  // Master timetable upload -- resolves only venue/timeSlot, no Activity/Host.
  async parseMaster(file: File, organizationId: string): Promise<MasterSlotIngestionResult> {
    const form = new FormData();
    form.append('organizationId', organizationId);
    form.append('file', file);
    const res = await fetch(`${PROXY_BASE}/ingestion/master/parse`, { method: 'POST', body: form });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.message ?? `Parse failed (${res.status})`);
    }
    return json.data as MasterSlotIngestionResult;
  },
  commitMaster(organizationId: string, termId: string, draftSlots: DraftMasterSlot[]): Promise<MasterSlotCommitResult> {
    return request<MasterSlotCommitResult>('/ingestion/master/commit', {
      method: 'POST',
      body: JSON.stringify({ organizationId, termId, draftSlots }),
    });
  },
};

export type { TimeSlot };
