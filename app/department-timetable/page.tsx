/**
 * Module: Department Timetable page
 * Layer:  web-page (client)
 * Context: See COPILOT_CONTEXT.md; three-tier timetable refactor Phase 3
 *
 * Purpose: A department coordinator's (or ADMIN's) view of their department's
 *          Master Timetable slots -- decompose an undecomposed slot into a
 *          named Course + lecturer, reassign the lecturer on one already
 *          decomposed, or remove an offering. Backend enforces the actual
 *          scope (canManageDepartment); this page just doesn't show a
 *          department the user has no reason to see.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { AppHeader } from '@/components/layout/AppHeader';
import { DecomposeMasterSlotModal } from '@/components/department-timetable/DecomposeMasterSlotModal';
import { Select } from '@/components/ui/Select';
import type { DepartmentTimetableSlot, HostSummary } from '@/types/scheduling';

const UNASSIGNED = '';

export default function DepartmentTimetablePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { organizationId, termId } = useScheduleSelectionStore();
  const queryClient = useQueryClient();

  const [orgUnitId, setOrgUnitId] = useState('');
  const [decomposeSlot, setDecomposeSlot] = useState<DepartmentTimetableSlot | null>(null);
  const [decomposeError, setDecomposeError] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
  }, [authLoading, isAuthenticated, router]);

  const isAdmin = user?.role === 'ADMIN';

  const allUnitsQuery = useQuery({
    queryKey: ['org-units', organizationId],
    queryFn: () => schedulingApi.listOrgUnits(organizationId),
    enabled: !!organizationId && isAdmin,
  });
  const myAssignmentsQuery = useQuery({
    queryKey: ['my-coordinator-assignments'],
    queryFn: () => schedulingApi.listMyCoordinatorAssignments(),
    enabled: !!isAuthenticated && !isAdmin,
  });

  // ADMIN can manage any department; a coordinator only sees the ones they're
  // actually assigned to -- backend enforces this regardless, this just keeps
  // the picker from offering departments the request would 403 on anyway.
  const availableDepartments = useMemo(() => {
    if (isAdmin) return (allUnitsQuery.data ?? []).map((u) => ({ id: u.id, name: u.name }));
    return (myAssignmentsQuery.data ?? []).map((a) => a.orgUnit);
  }, [isAdmin, allUnitsQuery.data, myAssignmentsQuery.data]);

  useEffect(() => {
    if (!orgUnitId && availableDepartments.length > 0) setOrgUnitId(availableDepartments[0].id);
  }, [orgUnitId, availableDepartments]);

  const hostsQuery = useQuery({
    queryKey: ['hosts', orgUnitId],
    queryFn: () => schedulingApi.listHosts(orgUnitId),
    enabled: !!orgUnitId,
  });

  const timetableQuery = useQuery({
    queryKey: ['department-timetable', termId, orgUnitId],
    queryFn: () => schedulingApi.getDepartmentTimetable(termId, orgUnitId),
    enabled: !!termId && !!orgUnitId,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['department-timetable', termId, orgUnitId] });
  }

  const decomposeMutation = useMutation({
    mutationFn: (input: { courseId: string; hostId?: string }) => {
      if (!decomposeSlot) throw new Error('No slot selected');
      return schedulingApi.createBooking({
        termId,
        courseId: input.courseId,
        hostId: input.hostId,
        venueId: decomposeSlot.venueId ?? undefined,
        timeSlotId: decomposeSlot.timeSlotId,
        level: decomposeSlot.level ?? undefined,
        masterSlotId: decomposeSlot.id,
      });
    },
    onSuccess: () => {
      setDecomposeSlot(null);
      setDecomposeError(null);
      invalidate();
    },
    onError: (err) => setDecomposeError(err instanceof Error ? err.message : 'Failed to assign'),
  });

  const reassignMutation = useMutation({
    mutationFn: ({ bookingId, hostId }: { bookingId: string; hostId: string | null }) => schedulingApi.updateBooking(bookingId, { hostId }),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (bookingId: string) => schedulingApi.deleteBooking(bookingId),
    onSuccess: invalidate,
  });

  if (authLoading || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
      </main>
    );
  }

  const hostOptions = (hostsQuery.data ?? []).map((h: HostSummary) => ({ value: h.id, label: h.displayName }));

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] p-6">
      <AppHeader title="Department Timetable" />

      <section className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        <Select
          label="Department"
          value={orgUnitId}
          onChange={setOrgUnitId}
          options={availableDepartments.map((d) => ({ value: d.id, label: d.name }))}
        />
      </section>

      {!isAdmin && availableDepartments.length === 0 && (
        <p className="text-sm text-[var(--fg-muted)]">
          You aren&apos;t a department timetable coordinator for any department yet. Ask an admin to assign you one.
        </p>
      )}

      {orgUnitId && (
        <>
          {timetableQuery.isLoading ? (
            <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
          ) : (timetableQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-[var(--fg-muted)]">
              No master timetable subjects are mapped to this department yet -- an admin needs to map a subject code first.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-[var(--accent-secondary)]">
                  <tr>
                    {['Subject', 'Level', 'Day', 'Time', 'Venue', 'Offerings', 'Actions'].map((h) => (
                      <th key={h} className="border-b border-[var(--border-default)] px-3 py-2 text-left text-xs font-semibold text-[var(--fg-on-accent-primary)]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(timetableQuery.data ?? []).map((slot) => (
                    <tr key={slot.id} className="even:bg-[var(--bg-alternate)]/60 hover:bg-[var(--bg-alternate)]">
                      <td className="border-b border-[var(--border-default)] px-3 py-2 align-top text-[var(--fg-primary)]">{slot.subjectCode}</td>
                      <td className="border-b border-[var(--border-default)] px-3 py-2 align-top text-[var(--fg-muted)]">{slot.level ?? '—'}</td>
                      <td className="border-b border-[var(--border-default)] px-3 py-2 align-top text-[var(--fg-muted)]">{slot.dayOfWeek}</td>
                      <td className="border-b border-[var(--border-default)] px-3 py-2 align-top text-[var(--fg-muted)]">
                        {slot.timeSlot.label ?? `${slot.timeSlot.startTime}–${slot.timeSlot.endTime}`}
                      </td>
                      <td className="border-b border-[var(--border-default)] px-3 py-2 align-top text-[var(--fg-muted)]">{slot.venue?.name ?? '—'}</td>
                      <td className="border-b border-[var(--border-default)] px-3 py-2 align-top">
                        {slot.bookings.length === 0 ? (
                          <span className="text-[var(--fg-muted)]">Not decomposed</span>
                        ) : (
                          <ul className="space-y-2">
                            {slot.bookings.map((b) => (
                              <li key={b.id} className="flex items-center gap-2">
                                <span className="text-[var(--fg-primary)]">{b.course.code}</span>
                                <select
                                  value={b.host?.id ?? UNASSIGNED}
                                  onChange={(e) => reassignMutation.mutate({ bookingId: b.id, hostId: e.target.value || null })}
                                  className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-xs text-[var(--fg-primary)]"
                                >
                                  <option value={UNASSIGNED}>Unassigned</option>
                                  {hostOptions.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => removeMutation.mutate(b.id)}
                                  className="text-xs text-[var(--fg-clash)] hover:underline"
                                >
                                  Remove
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="border-b border-[var(--border-default)] px-3 py-2 align-top">
                        <button
                          type="button"
                          onClick={() => setDecomposeSlot(slot)}
                          className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
                        >
                          {slot.bookings.length === 0 ? '+ Add offering' : '+ Add another'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {decomposeSlot && (
        <DecomposeMasterSlotModal
          orgUnitId={orgUnitId}
          slot={decomposeSlot}
          onClose={() => {
            setDecomposeSlot(null);
            setDecomposeError(null);
          }}
          onSubmit={(input) => decomposeMutation.mutate(input)}
          isSubmitting={decomposeMutation.isPending}
          error={decomposeError}
        />
      )}
    </main>
  );
}
