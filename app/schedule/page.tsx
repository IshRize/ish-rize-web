/**
 * Module: Schedule page
 * Layer:  web-page (client)
 * Context: See COPILOT_CONTEXT.md, IMPLEMENTATION_PLAN.md (Phase 2/3/4)
 *
 * Purpose: Render the master schedule grid for the selected organization and
 *          term, with client-side filtering, clash badges, and (for
 *          coordinators) live create/delete editing. Joins the term's
 *          real-time room so every connected viewer's grid updates when anyone
 *          changes a booking.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { vocab } from '@/lib/vocab';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { useScheduleSocket } from '@/hooks/useScheduleSocket';
import { AppHeader } from '@/components/layout/AppHeader';
import { LiveSyncIndicator } from '@/components/ui/LiveSyncIndicator';
import { FilterBar, ALL, type ScheduleFilters } from '@/components/schedule/FilterBar';
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid';
import { AddBookingModal } from '@/components/schedule/AddBookingModal';

export default function SchedulePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { organizationId, termId } = useScheduleSelectionStore();
  const [filters, setFilters] = useState<ScheduleFilters>({ unitId: ALL, level: ALL, kind: ALL, venueId: ALL });
  const [addTimeSlotId, setAddTimeSlotId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
  }, [authLoading, isAuthenticated, router]);

  // Joins this term's real-time room; invalidates schedule/clash caches when
  // ANY connected client (including this one) changes a booking, so every
  // viewer's grid stays in sync without a manual refresh.
  const { connected } = useScheduleSocket(termId);

  const canEdit = user?.role === 'LECTURER' || user?.role === 'ADMIN';

  const configQuery = useQuery({
    queryKey: ['org-config', organizationId],
    queryFn: () => schedulingApi.getOrgConfig(organizationId),
    enabled: !!organizationId,
  });

  const unitsQuery = useQuery({
    queryKey: ['org-units', organizationId],
    queryFn: () => schedulingApi.listOrgUnits(organizationId),
    enabled: !!organizationId,
  });

  const scheduleQuery = useQuery({
    queryKey: ['schedule', termId],
    queryFn: () => schedulingApi.getSchedule(termId),
    enabled: !!termId,
  });

  const clashesQuery = useQuery({
    queryKey: ['clashes', termId],
    queryFn: () => schedulingApi.getClashes(termId),
    enabled: !!termId,
  });

  function invalidateScheduleAndClashes() {
    queryClient.invalidateQueries({ queryKey: ['schedule', termId] });
    queryClient.invalidateQueries({ queryKey: ['clashes', termId] });
  }

  const createMutation = useMutation({
    mutationFn: (input: { courseId: string; hostId?: string; venueId?: string }) =>
      schedulingApi.createBooking({ ...input, termId, timeSlotId: addTimeSlotId! }),
    onSuccess: () => {
      invalidateScheduleAndClashes();
      setAddTimeSlotId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (bookingId: string) => schedulingApi.deleteBooking(bookingId),
    onSuccess: invalidateScheduleAndClashes,
  });

  const config = configQuery.data;
  const allUnits = useMemo(() => unitsQuery.data ?? [], [unitsQuery.data]);
  const allBookings = useMemo(() => scheduleQuery.data?.bookings ?? [], [scheduleQuery.data]);
  const timeSlots = scheduleQuery.data?.timeSlots ?? [];

  // Leaf units only (the deepest level present) — the bookable tier as columns;
  // full tree navigation is a later refinement.
  const leafUnits = useMemo(() => {
    if (allUnits.length === 0) return [];
    const maxDepth = Math.max(...allUnits.map((u) => u.depth));
    return allUnits.filter((u) => u.depth === maxDepth);
  }, [allUnits]);

  const filteredBookings = useMemo(() => {
    return allBookings.filter((b) => {
      if (filters.unitId !== ALL && b.course.orgUnitId !== filters.unitId) return false;
      if (filters.level !== ALL && String(b.level ?? '') !== filters.level) return false;
      if (filters.kind !== ALL && b.course.kind !== filters.kind) return false;
      if (filters.venueId !== ALL && b.venue?.id !== filters.venueId) return false;
      return true;
    });
  }, [allBookings, filters]);

  if (authLoading || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] p-6">
      <AppHeader
        title={vocab(config, 'unit') === 'Ministry' ? 'Service Schedule' : 'Master Schedule'}
        endSlot={<LiveSyncIndicator connected={connected} />}
      />

      <section className="mb-4">
        <FilterBar config={config} units={leafUnits} bookings={allBookings} filters={filters} onChange={setFilters} />
      </section>

      {canEdit && filters.unitId === ALL && (
        <p className="mb-4 text-xs text-[var(--fg-muted)]">
          Select a specific {vocab(config, 'unit').toLowerCase()} above to add bookings — picking one tells the
          editor which activities and hosts to offer.
        </p>
      )}

      {scheduleQuery.isLoading ? (
        <p className="text-sm text-[var(--fg-muted)]">Loading schedule…</p>
      ) : scheduleQuery.isError ? (
        <p className="text-sm text-[var(--fg-clash)]">Failed to load schedule.</p>
      ) : (
        <ScheduleGrid
          timeSlots={timeSlots}
          weekDays={config?.weekDays ?? []}
          bookings={filteredBookings}
          clashes={clashesQuery.data}
          canEdit={canEdit}
          targetOrgUnitId={filters.unitId !== ALL ? filters.unitId : undefined}
          onAddBooking={(timeSlotId) => setAddTimeSlotId(timeSlotId)}
          onDeleteBooking={(bookingId) => deleteMutation.mutate(bookingId)}
        />
      )}

      {addTimeSlotId && filters.unitId !== ALL && (
        <AddBookingModal
          organizationId={organizationId}
          orgUnitId={filters.unitId}
          config={config}
          onClose={() => setAddTimeSlotId(null)}
          onSubmit={(input) => createMutation.mutate(input)}
          isSubmitting={createMutation.isPending}
          error={createMutation.error?.message}
        />
      )}
    </main>
  );
}
