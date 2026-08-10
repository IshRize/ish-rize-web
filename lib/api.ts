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
  AuditLogEntry,
  Booking,
  BookingRequest,
  BookingIngestionCommitResult,
  BookingIngestionResult,
  Calendar,
  Clash,
  CoordinatorAssignment,
  Course,
  DepartmentTimetableSlot,
  DraftBooking,
  DraftMasterSlot,
  FeatureFlag,
  FreeNowResponse,
  Group,
  GroupSummary,
  Host,
  HostSummary,
  InviteLink,
  MasterSlotCommitResult,
  MasterSlotIngestionResult,
  MasterSlotRow,
  MemberProfile,
  MemberScheduleResponse,
  MyHost,
  MyTeachingLoad,
  OrgConfig,
  OrgInvitation,
  OrgMember,
  OrgRole,
  OrgUnit,
  Organization,
  PaginatedResponse,
  ScheduleResponse,
  Session,
  SubjectDepartmentMapping,
  TeachingLoadEntry,
  Term,
  TimeSlot,
  Title,
  User,
  Venue,
  VenueSummary,
  VenueType,
  NotificationsResponse,
  NotificationPreferences,
} from '@/types/scheduling';

const PROXY_BASE = '/api/proxy';

export let lastResponseTimeMs: string | null = null;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${PROXY_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  lastResponseTimeMs = res.headers.get('X-Response-Time');
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(json?.message ?? `Request failed (${res.status})`);
  }
  return json.data as T;
}

async function requestUnauthenticated<T>(path: string, init?: RequestInit): Promise<T> {
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
  changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return request<void>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
  async register(data: { name: string; email: string; password: string }): Promise<{ user: User }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.message ?? 'Registration failed');
    }
    return json.data;
  },
  verifyEmail(otp: string): Promise<void> {
    return request<void>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ otp }),
    });
  },
  resendVerification(): Promise<void> {
    return request<void>('/auth/resend-verification', { method: 'POST' });
  },
  forgotPassword(email: string): Promise<void> {
    return requestUnauthenticated<void>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  resetPassword(data: { token: string; newPassword: string }): Promise<void> {
    return requestUnauthenticated<void>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  listSessions(): Promise<{ sessions: Session[] }> {
    return request<{ sessions: Session[] }>('/auth/sessions');
  },
  revokeSession(sessionId: string): Promise<void> {
    return request<void>(`/auth/sessions/${sessionId}`, { method: 'DELETE' });
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
  getMyMemberSchedule(termId: string): Promise<MemberScheduleResponse> {
    return request<MemberScheduleResponse>(`/my-schedule?termId=${termId}`);
  },
  getMyMemberClashes(termId: string): Promise<Clash[]> {
    return request<Clash[]>(`/my-schedule/clashes?termId=${termId}`);
  },
  addMemberToGroup(groupId: string, userId: string): Promise<void> {
    return request<void>(`/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify({ userId }) });
  },
  removeMemberFromGroup(groupId: string, userId: string): Promise<void> {
    return request<void>(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' });
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
  createVenue(input: { organizationId: string; name: string; type: VenueType; capacity?: number; orgUnitId?: string }): Promise<Venue> {
    return request<Venue>('/venues', { method: 'POST', body: JSON.stringify(input) });
  },
  updateVenue(id: string, patch: { name?: string; type?: VenueType; capacity?: number; archived?: boolean }): Promise<Venue> {
    return request<Venue>(`/venues/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  },
  listActivities(orgUnitId: string): Promise<ActivitySummary[]> {
    return request<ActivitySummary[]>(`/activities?orgUnitId=${orgUnitId}`);
  },
  listCourses(organizationId: string): Promise<Course[]> {
    return request<Course[]>(`/courses?organizationId=${organizationId}`);
  },
  createCourse(input: { code: string; name: string; orgUnitId: string; level?: number; kind?: string; courseType?: string; expectedSize?: number }): Promise<Course> {
    return request<Course>('/courses', { method: 'POST', body: JSON.stringify(input) });
  },
  updateCourse(courseId: string, patch: { name?: string; code?: string; level?: number; kind?: string; courseType?: string; expectedSize?: number }): Promise<Course> {
    return request<Course>(`/courses/${courseId}`, { method: 'PATCH', body: JSON.stringify(patch) });
  },
  deleteCourse(courseId: string): Promise<void> {
    return request<void>(`/courses/${courseId}`, { method: 'DELETE' });
  },
  listAllHosts(organizationId: string): Promise<Host[]> {
    return request<Host[]>(`/hosts?organizationId=${organizationId}`);
  },
  createHost(input: { organizationId: string; orgUnitId: string; name: string; initials: string; titleId?: string }): Promise<Host> {
    return request<Host>('/hosts', { method: 'POST', body: JSON.stringify(input) });
  },
  updateHost(id: string, patch: { name?: string; initials?: string; titleId?: string; archived?: boolean }): Promise<Host> {
    return request<Host>(`/hosts/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  },
  getSchedule(termId: string, orgUnitId?: string): Promise<ScheduleResponse> {
    const q = orgUnitId ? `&orgUnitId=${orgUnitId}` : '';
    return request<ScheduleResponse>(`/schedule?termId=${termId}${q}`);
  },
  listGroups(termId: string): Promise<GroupSummary[]> {
    return request<GroupSummary[]>(`/groups?termId=${termId}`);
  },
  createGroup(input: { termId: string; orgUnitId: string; name: string }): Promise<Group> {
    return request<Group>('/groups', { method: 'POST', body: JSON.stringify(input) });
  },
  updateGroup(groupId: string, patch: { name?: string }): Promise<Group> {
    return request<Group>(`/groups/${groupId}`, { method: 'PATCH', body: JSON.stringify(patch) });
  },
  deleteGroup(groupId: string): Promise<void> {
    return request<void>(`/groups/${groupId}`, { method: 'DELETE' });
  },
  addCourseToGroup(groupId: string, courseId: string): Promise<void> {
    return request<void>(`/groups/${groupId}/courses`, { method: 'POST', body: JSON.stringify({ courseId }) });
  },
  removeCourseFromGroup(groupId: string, courseId: string): Promise<void> {
    return request<void>(`/groups/${groupId}/courses/${courseId}`, { method: 'DELETE' });
  },
  listTitles(organizationId: string): Promise<Title[]> {
    return request<Title[]>(`/organizations/${organizationId}/titles`);
  },
  getClashes(termId: string, orgUnitId?: string): Promise<Clash[]> {
    const qs = orgUnitId ? `&orgUnitId=${orgUnitId}` : '';
    return request<Clash[]>(`/clashes?termId=${termId}${qs}`);
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
  getFreeVenuesNow(organizationId: string, termId: string): Promise<FreeNowResponse> {
    return request<FreeNowResponse>(`/availability/venues-now?organizationId=${organizationId}&termId=${termId}`);
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
  autoRescheduleBooking(bookingId: string): Promise<Booking> {
    return request<Booking>(`/bookings/${bookingId}/auto-reschedule`, { method: 'POST' });
  },
  createBookingRequest(input: {
    organizationId: string;
    termId: string;
    groupId: string;
    courseId: string;
    timeSlotId: string;
    venueId?: string;
    reason?: string;
  }): Promise<BookingRequest> {
    return request<BookingRequest>('/booking-requests', { method: 'POST', body: JSON.stringify(input) });
  },
  listBookingRequests(termId: string): Promise<BookingRequest[]> {
    return request<BookingRequest[]>(`/booking-requests?termId=${termId}`);
  },
  reviewBookingRequest(id: string, decision: { status: 'APPROVED' | 'REJECTED'; reviewNote?: string }): Promise<BookingRequest> {
    return request<BookingRequest>(`/booking-requests/${id}/review`, { method: 'PATCH', body: JSON.stringify(decision) });
  },
};

export const orgApi = {
  createOrganization(data: { name: string; orgType: string; description?: string }): Promise<Organization> {
    return request<Organization>('/organizations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getOrganization(orgId: string): Promise<Organization> {
    return request<Organization>(`/organizations/${orgId}`);
  },
  updateOrganization(orgId: string, data: { name?: string; contactEmail?: string; configProfile?: Record<string, unknown> }): Promise<Organization> {
    return request<Organization>(`/organizations/${orgId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  listMembers(orgId: string, params?: { page?: number; limit?: number; search?: string; role?: OrgRole; status?: string }): Promise<PaginatedResponse<OrgMember>> {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.search) q.set('search', params.search);
    if (params?.role) q.set('role', params.role);
    if (params?.status) q.set('status', params.status);
    const qs = q.toString();
    return request<PaginatedResponse<OrgMember>>(`/organizations/${orgId}/members${qs ? `?${qs}` : ''}`);
  },
  getMemberProfile(orgId: string, memberId: string): Promise<MemberProfile> {
    return request<MemberProfile>(`/organizations/${orgId}/members/${memberId}/profile`);
  },
  updateMemberRole(orgId: string, memberId: string, role: OrgRole): Promise<OrgMember> {
    return request<OrgMember>(`/organizations/${orgId}/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },
  removeMember(orgId: string, memberId: string): Promise<void> {
    return request<void>(`/organizations/${orgId}/members/${memberId}`, { method: 'DELETE' });
  },
  suspendMember(orgId: string, memberId: string): Promise<void> {
    return request<void>(`/organizations/${orgId}/members/${memberId}/suspend`, { method: 'POST' });
  },
  unsuspendMember(orgId: string, memberId: string): Promise<void> {
    return request<void>(`/organizations/${orgId}/members/${memberId}/unsuspend`, { method: 'POST' });
  },
  sendInvitations(orgId: string, data: { emails: string[]; role: OrgRole }): Promise<OrgInvitation[]> {
    return request<OrgInvitation[]>(`/organizations/${orgId}/invitations`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  listInvitations(orgId: string): Promise<OrgInvitation[]> {
    return request<OrgInvitation[]>(`/organizations/${orgId}/invitations`);
  },
  revokeInvitation(orgId: string, inviteId: string): Promise<void> {
    return request<void>(`/organizations/${orgId}/invitations/${inviteId}`, { method: 'DELETE' });
  },
  createInviteLink(orgId: string, defaultRole: OrgRole): Promise<InviteLink> {
    return request<InviteLink>(`/organizations/${orgId}/invite-link`, {
      method: 'POST',
      body: JSON.stringify({ defaultRole }),
    });
  },
  disableInviteLink(orgId: string): Promise<void> {
    return request<void>(`/organizations/${orgId}/invite-link`, { method: 'DELETE' });
  },
  getAuditLog(orgId: string, params?: { page?: number; limit?: number; action?: string; userId?: string }): Promise<PaginatedResponse<AuditLogEntry>> {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.action) q.set('action', params.action);
    if (params?.userId) q.set('userId', params.userId);
    const qs = q.toString();
    return request<PaginatedResponse<AuditLogEntry>>(`/organizations/${orgId}/audit-log${qs ? `?${qs}` : ''}`);
  },
  deactivateOrganization(orgId: string): Promise<void> {
    return request<void>(`/organizations/${orgId}/deactivate`, { method: 'POST' });
  },
  reactivateOrganization(orgId: string): Promise<void> {
    return request<void>(`/organizations/${orgId}/reactivate`, { method: 'POST' });
  },
  requestDeletion(orgId: string, password: string): Promise<void> {
    return request<void>(`/organizations/${orgId}/request-deletion`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },
  cancelDeletion(orgId: string): Promise<void> {
    return request<void>(`/organizations/${orgId}/cancel-deletion`, { method: 'POST' });
  },
  async exportOrgData(orgId: string): Promise<void> {
    const data = await request<Record<string, unknown>>(`/organizations/${orgId}/export`);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ishrize-org-export-${orgId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  transferOwnership(orgId: string, data: { targetUserId: string; password: string }): Promise<void> {
    return request<void>(`/organizations/${orgId}/transfer-ownership`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  listCalendars(orgId: string): Promise<Calendar[]> {
    return request<Calendar[]>(`/organizations/${orgId}/calendars`);
  },
  createCalendar(orgId: string, data: { label: string; startDate: string; endDate: string }): Promise<Calendar> {
    return request<Calendar>(`/organizations/${orgId}/calendars`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateCalendar(orgId: string, calendarId: string, data: { label?: string; startDate?: string; endDate?: string }): Promise<Calendar> {
    return request<Calendar>(`/organizations/${orgId}/calendars/${calendarId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  createTerm(orgId: string, calendarId: string, data: { name: string; type: string; startDate: string; endDate: string; teachingWeeks?: number }): Promise<Term> {
    return request<Term>(`/organizations/${orgId}/calendars/${calendarId}/terms`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateTerm(orgId: string, termId: string, data: { name?: string; type?: string; startDate?: string; endDate?: string; teachingWeeks?: number }): Promise<Term> {
    return request<Term>(`/organizations/${orgId}/terms/${termId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  listTimeSlots(orgId: string): Promise<TimeSlot[]> {
    return request<TimeSlot[]>(`/organizations/${orgId}/time-slots`);
  },
  createTimeSlot(orgId: string, data: { dayOfWeek: string; startTime: string; endTime: string; label?: string; orderIndex?: number }): Promise<TimeSlot> {
    return request<TimeSlot>(`/organizations/${orgId}/time-slots`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateTimeSlot(orgId: string, slotId: string, data: { startTime?: string; endTime?: string; label?: string; orderIndex?: number }): Promise<TimeSlot> {
    return request<TimeSlot>(`/organizations/${orgId}/time-slots/${slotId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  deleteTimeSlot(orgId: string, slotId: string): Promise<void> {
    return request<void>(`/organizations/${orgId}/time-slots/${slotId}`, { method: 'DELETE' });
  },
  listFeatureFlags(orgId: string): Promise<FeatureFlag[]> {
    return request<FeatureFlag[]>(`/organizations/${orgId}/feature-flags`);
  },
  toggleFeatureFlag(orgId: string, key: string, enabled: boolean): Promise<FeatureFlag> {
    return request<FeatureFlag>(`/organizations/${orgId}/feature-flags/${key}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    });
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
  // Department-level ingestion: a decomposed file (Course + Host already
  // resolved per row) -- orgUnitId is required for a LECTURER coordinator,
  // optional (org-wide) for ADMIN.
  async parseBookings(file: File, organizationId: string, orgUnitId?: string): Promise<BookingIngestionResult> {
    const form = new FormData();
    form.append('organizationId', organizationId);
    if (orgUnitId) form.append('orgUnitId', orgUnitId);
    form.append('file', file);
    const res = await fetch(`${PROXY_BASE}/ingestion/parse`, { method: 'POST', body: form });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.message ?? `Parse failed (${res.status})`);
    }
    return json.data as BookingIngestionResult;
  },
  commitBookings(termId: string, draftBookings: DraftBooking[], orgUnitId?: string): Promise<BookingIngestionCommitResult> {
    return request<BookingIngestionCommitResult>('/ingestion/commit', {
      method: 'POST',
      body: JSON.stringify({ termId, orgUnitId, draftBookings }),
    });
  },
};

export const notificationApi = {
  list(params?: { organizationId?: string; unreadOnly?: boolean; cursor?: string }): Promise<NotificationsResponse> {
    const qs = new URLSearchParams();
    if (params?.organizationId) qs.set('organizationId', params.organizationId);
    if (params?.unreadOnly) qs.set('unreadOnly', 'true');
    if (params?.cursor) qs.set('cursor', params.cursor);
    const query = qs.toString();
    return request<NotificationsResponse>(`/notifications${query ? `?${query}` : ''}`);
  },
  markRead(id: string): Promise<void> {
    return request<void>(`/notifications/${id}/read`, { method: 'PATCH' });
  },
  markAllRead(organizationId?: string): Promise<{ markedRead: number }> {
    return request<{ markedRead: number }>('/notifications/read-all', {
      method: 'POST',
      body: JSON.stringify(organizationId ? { organizationId } : {}),
    });
  },
  getPreferences(organizationId: string): Promise<NotificationPreferences> {
    return request<NotificationPreferences>(`/notifications/preferences?organizationId=${organizationId}`);
  },
  updatePreferences(organizationId: string, prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    return request<NotificationPreferences>('/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ organizationId, ...prefs }),
    });
  },
};

export type { TimeSlot };
