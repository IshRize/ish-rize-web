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
  GroupSummary,
  HostSummary,
  OrgConfig,
  OrgUnit,
  Organization,
  ScheduleResponse,
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
  listOrgUnits(organizationId: string): Promise<OrgUnit[]> {
    return request<OrgUnit[]>(`/org-units?organizationId=${organizationId}`);
  },
  listTerms(organizationId: string): Promise<Term[]> {
    return request<Term[]>(`/terms?organizationId=${organizationId}`);
  },
  listHosts(orgUnitId: string): Promise<HostSummary[]> {
    return request<HostSummary[]>(`/hosts?orgUnitId=${orgUnitId}`);
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
  }): Promise<Booking> {
    return request<Booking>('/bookings', { method: 'POST', body: JSON.stringify(input) });
  },
  deleteBooking(bookingId: string): Promise<void> {
    return request<void>(`/bookings/${bookingId}`, { method: 'DELETE' });
  },
};

export type { TimeSlot };
