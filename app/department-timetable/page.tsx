/**
 * Module: Department Timetable page
 * Layer:  web-page (client)
 * Context: See COPILOT_CONTEXT.md; three-tier timetable refactor Phase 3/4
 *
 * Purpose: Any authenticated user can VIEW any department's timetable
 *          read-only -- a lecturer in a department needs to see what their
 *          colleagues are teaching even if they don't coordinate it. Only
 *          that department's coordinator (or ADMIN) gets the edit affordances
 *          (decompose/reassign/remove). The backend is the real boundary
 *          (canManageDepartment, already enforced on every mutation); this is
 *          just the UI reflecting it so a non-coordinator isn't shown buttons
 *          that would 403.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppShell } from '@/components/layout/AppShell';
import { DecomposeMasterSlotModal } from '@/components/department-timetable/DecomposeMasterSlotModal';
import { DepartmentScheduleGrid } from '@/components/department-timetable/DepartmentScheduleGrid';
import { ImportDepartmentTimetableModal } from '@/components/department-timetable/ImportDepartmentTimetableModal';
import { ClashBadge } from '@/components/schedule/ClashBadge';
import { Select } from '@/components/ui/Select';
import { dayLabel } from '@/lib/dayNames';
import type { Clash, DepartmentTimetableSlot, HostSummary } from '@/types/scheduling';

const UNASSIGNED = '';
const ALL_LEVELS = '';

interface UndoEntry {
  bookingId: string;
  previousTimeSlotId: string;
}

export default function DepartmentTimetablePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { organizationId, termId } = useScheduleSelectionStore();
  const queryClient = useQueryClient();

  const [orgUnitId, setOrgUnitId] = useState('');
  const [levelFilter, setLevelFilter] = useState(ALL_LEVELS);
  const [decomposeSlot, setDecomposeSlot] = useState<DepartmentTimetableSlot | null>(null);
  const [decomposeError, setDecomposeError] = useState<string | null>(null);
  const [view, setView] = useState<'manage' | 'grid'>('manage');
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [autoRescheduleError, setAutoRescheduleError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
  }, [authLoading, isAuthenticated, router]);

  const isAdmin = user?.role === 'ADMIN';

  // Anyone can VIEW any department; the picker offers all of them. Editing is
  // gated separately below, by canEditThisDept.
  const allUnitsQuery = useQuery({
    queryKey: ['org-units', organizationId],
    queryFn: () => schedulingApi.listOrgUnits(organizationId),
    enabled: !!organizationId,
  });
  const myAssignmentsQuery = useQuery({
    queryKey: ['my-coordinator-assignments'],
    queryFn: () => schedulingApi.listMyCoordinatorAssignments(),
    enabled: !!isAuthenticated && !isAdmin,
  });

  const availableDepartments = useMemo(() => (allUnitsQuery.data ?? []).map((u) => ({ id: u.id, name: u.name })), [allUnitsQuery.data]);

  const canEditThisDept = isAdmin || (myAssignmentsQuery.data ?? []).some((a) => a.orgUnit.id === orgUnitId);

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

  // Scoped to this department's bookings on the OUTPUT side only -- the
  // backend still runs clash detection over the whole term so a GROUP clash
  // against another department's booking (a cohort split across two
  // departments) is still caught, just filtered down to clashes that touch
  // something this department owns.
  const clashesQuery = useQuery({
    queryKey: ['clashes', termId, orgUnitId],
    queryFn: () => schedulingApi.getClashes(termId, orgUnitId),
    enabled: !!termId && !!orgUnitId,
  });

  const clashesByBookingId = useMemo(() => {
    const map = new Map<string, Clash[]>();
    for (const clash of clashesQuery.data ?? []) {
      for (const bookingId of clash.bookingIds) {
        const bucket = map.get(bookingId) ?? [];
        bucket.push(clash);
        map.set(bookingId, bucket);
      }
    }
    return map;
  }, [clashesQuery.data]);

  // Grid view's data: each booking placed by its OWN current day/time, not
  // grouped by origin MasterSlot like the "Manage offerings" table above --
  // this is what drag-and-drop needs to move a booking off its original slot.
  const configQuery = useQuery({
    queryKey: ['org-config', organizationId],
    queryFn: () => schedulingApi.getOrgConfig(organizationId),
    enabled: !!organizationId && view === 'grid',
  });
  const scheduleQuery = useQuery({
    queryKey: ['schedule', termId, orgUnitId],
    queryFn: () => schedulingApi.getSchedule(termId, orgUnitId),
    enabled: !!termId && !!orgUnitId && view === 'grid',
  });

  // Applies to both views: once filtered to one level, repeating it on every
  // row/card is just noise -- so the Level column/field is hidden too,
  // mirroring the Master Timetable page's exact pattern.
  const levels = Array.from(
    new Set((timetableQuery.data ?? []).map((s) => s.level).filter((l): l is number => l != null)),
  ).sort((a, b) => a - b);
  const filteredSlots =
    levelFilter === ALL_LEVELS ? timetableQuery.data ?? [] : (timetableQuery.data ?? []).filter((s) => String(s.level ?? '') === levelFilter);
  const filteredBookings =
    levelFilter === ALL_LEVELS
      ? scheduleQuery.data?.bookings ?? []
      : (scheduleQuery.data?.bookings ?? []).filter((b) => String(b.level ?? '') === levelFilter);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['department-timetable', termId, orgUnitId] });
    queryClient.invalidateQueries({ queryKey: ['clashes', termId, orgUnitId] });
    queryClient.invalidateQueries({ queryKey: ['schedule', termId, orgUnitId] });
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

  const moveMutation = useMutation({
    mutationFn: ({ bookingId, timeSlotId }: { bookingId: string; timeSlotId: string }) =>
      schedulingApi.updateBooking(bookingId, { timeSlotId }),
    onSuccess: invalidate,
  });

  function handleMoveBooking(bookingId: string, fromTimeSlotId: string, toTimeSlotId: string) {
    setUndoStack((stack) => [...stack, { bookingId, previousTimeSlotId: fromTimeSlotId }]);
    moveMutation.mutate({ bookingId, timeSlotId: toTimeSlotId });
  }

  function handleUndo() {
    const last = undoStack[undoStack.length - 1];
    if (!last) return;
    setUndoStack((stack) => stack.slice(0, -1));
    moveMutation.mutate({ bookingId: last.bookingId, timeSlotId: last.previousTimeSlotId });
  }

  const autoRescheduleMutation = useMutation({
    mutationFn: (bookingId: string) => schedulingApi.autoRescheduleBooking(bookingId),
    onSuccess: () => {
      setAutoRescheduleError(null);
      invalidate();
    },
    onError: (err) => setAutoRescheduleError(err instanceof Error ? err.message : 'Could not auto-resolve this clash'),
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
    <AppShell>
      <AppHeader
        title="Department Timetable"
        filtersSlot={
          <Select
            label="Level"
            value={levelFilter}
            onChange={setLevelFilter}
            options={[{ value: ALL_LEVELS, label: 'All levels' }, ...levels.map((l) => ({ value: String(l), label: String(l) }))]}
          />
        }
      />

      <section className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        <Select
          label="Department"
          value={orgUnitId}
          onChange={setOrgUnitId}
          options={availableDepartments.map((d) => ({ value: d.id, label: d.name }))}
        />
        <div className="flex items-center gap-2">
          {canEditThisDept && orgUnitId && (
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="rounded-md border border-[var(--border-default)] px-3 py-1.5 text-xs text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
            >
              Import timetable
            </button>
          )}
          {view === 'grid' && canEditThisDept && undoStack.length > 0 && (
            <button
              type="button"
              onClick={handleUndo}
              className="rounded-md border border-[var(--border-default)] px-3 py-1.5 text-xs text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
            >
              Undo last move
            </button>
          )}
          <div className="flex rounded-md border border-[var(--border-default)] text-xs">
            <button
              type="button"
              onClick={() => setView('manage')}
              className={`px-3 py-1.5 ${view === 'manage' ? 'bg-[var(--accent-primary)] text-[var(--fg-on-accent-primary)]' : 'text-[var(--fg-muted)]'}`}
            >
              Manage offerings
            </button>
            <button
              type="button"
              onClick={() => setView('grid')}
              className={`px-3 py-1.5 ${view === 'grid' ? 'bg-[var(--accent-primary)] text-[var(--fg-on-accent-primary)]' : 'text-[var(--fg-muted)]'}`}
            >
              Grid view
            </button>
          </div>
        </div>
      </section>

      {!isAdmin && orgUnitId && !canEditThisDept && (
        <p className="mb-3 text-xs text-[var(--fg-muted)]">
          You&apos;re viewing this department read-only. Ask an admin to make you its coordinator to decompose or reassign offerings.
        </p>
      )}

      {orgUnitId && (clashesQuery.data ?? []).length > 0 && (
        <div className="mb-3 rounded-lg border border-[var(--fg-clash)]/30 bg-[var(--bg-clash)] px-4 py-2 text-sm text-[var(--fg-clash)]">
          {clashesQuery.data!.length} clash{clashesQuery.data!.length === 1 ? '' : 'es'} affecting this department&apos;s offerings --
          flagged inline below.
        </div>
      )}

      {autoRescheduleError && (
        <div className="mb-3 rounded-lg border border-[var(--fg-clash)]/30 bg-[var(--bg-clash)] px-4 py-2 text-sm text-[var(--fg-clash)]">
          {autoRescheduleError}
        </div>
      )}

      {orgUnitId && view === 'grid' && (
        <>
          {scheduleQuery.isLoading ? (
            <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
          ) : (
            <DepartmentScheduleGrid
              timeSlots={scheduleQuery.data?.timeSlots ?? []}
              weekDays={configQuery.data?.weekDays ?? []}
              bookings={filteredBookings}
              clashes={clashesQuery.data ?? []}
              canEdit={canEditThisDept}
              onMoveBooking={handleMoveBooking}
              onDeleteBooking={(bookingId) => removeMutation.mutate(bookingId)}
              onAutoReschedule={(bookingId) => autoRescheduleMutation.mutate(bookingId)}
            />
          )}
        </>
      )}

      {orgUnitId && view === 'manage' && (
        <>
          {timetableQuery.isLoading ? (
            <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
          ) : (timetableQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-[var(--fg-muted)]">
              No master timetable subjects are mapped to this department yet -- an admin needs to map a subject code first.
            </p>
          ) : filteredSlots.length === 0 ? (
            <p className="text-sm text-[var(--fg-muted)]">No subjects at level {levelFilter} for this department.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-[var(--accent-secondary)]">
                  <tr>
                    {[
                      'Subject',
                      ...(levelFilter === ALL_LEVELS ? ['Level'] : []),
                      'Day',
                      'Time',
                      'Venue',
                      'Offerings',
                      'Actions',
                    ].map((h) => (
                      <th key={h} className="border-b border-[var(--border-default)] px-3 py-2 text-left text-xs font-semibold text-[var(--fg-on-accent-primary)]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSlots.map((slot) => (
                    <tr key={slot.id} className="even:bg-[var(--bg-alternate)]/60 hover:bg-[var(--bg-alternate)]">
                      <td className="border-b border-[var(--border-default)] px-3 py-2 align-top text-[var(--fg-primary)]">{slot.subjectCode}</td>
                      {levelFilter === ALL_LEVELS && (
                        <td className="border-b border-[var(--border-default)] px-3 py-2 align-top text-[var(--fg-muted)]">{slot.level ?? '—'}</td>
                      )}
                      <td className="border-b border-[var(--border-default)] px-3 py-2 align-top text-[var(--fg-muted)]">{dayLabel(slot.dayOfWeek)}</td>
                      <td className="border-b border-[var(--border-default)] px-3 py-2 align-top text-[var(--fg-muted)]">
                        {slot.timeSlot.startTime}–{slot.timeSlot.endTime}
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
                                <ClashBadge clashes={clashesByBookingId.get(b.id) ?? []} />
                                {canEditThisDept && (clashesByBookingId.get(b.id) ?? []).length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => autoRescheduleMutation.mutate(b.id)}
                                    disabled={autoRescheduleMutation.isPending}
                                    className="text-xs text-[var(--accent-primary)] hover:underline disabled:opacity-60"
                                  >
                                    Resolve automatically
                                  </button>
                                )}
                                {canEditThisDept ? (
                                  <>
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
                                  </>
                                ) : (
                                  <span className="text-[var(--fg-muted)]">{b.host?.displayName ?? 'Unassigned'}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="border-b border-[var(--border-default)] px-3 py-2 align-top">
                        {canEditThisDept ? (
                          <button
                            type="button"
                            onClick={() => setDecomposeSlot(slot)}
                            className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
                          >
                            {slot.bookings.length === 0 ? '+ Add offering' : '+ Add another'}
                          </button>
                        ) : (
                          <span className="text-[var(--fg-muted)]">—</span>
                        )}
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

      {showImportModal && (
        <ImportDepartmentTimetableModal
          organizationId={organizationId}
          orgUnitId={orgUnitId}
          termId={termId}
          onClose={() => setShowImportModal(false)}
          onCommitted={invalidate}
        />
      )}
    </AppShell>
  );
}
